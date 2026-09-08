require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./model/User");
const mongoose = require("mongoose");
const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");
const Analysis = require("./model/Analysis")

const app = express();

// mongodb connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error);
  });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(cors());
app.use(express.json());


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
};



const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."));
    }
  },
});

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Resume Analyzer API is running",
  });
});

// Analyze resume

app.post(
  "/analyze",
  authenticateToken,
  upload.single("resume"),
  async (req, res) => {
    let resume;
    let parser;

    try {
      resume = req.file;
      const jobDescription = req.body.jobDescription;

      if (!resume) {
        return res.status(400).json({
          message: "Please upload a PDF resume.",
        });
      }

      if (!jobDescription) {
        return res.status(400).json({
          message: "Please enter a job description.",
        });
      }

      // Read the uploaded PDF
      const pdfBuffer = fs.readFileSync(resume.path);

      // Extract text from the PDF
      parser = new PDFParse({
        data: pdfBuffer,
      });

      const result = await parser.getText();

      console.log("Resume:", resume.originalname);

      // Send resume and job description to Gemini
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `
You are an AI resume analyzer.

Compare the resume with the job description.

Return ONLY valid JSON in this exact format:

{
  "score": 0,
  "matchingSkills": [],
  "missingSkills": [],
  "strengths": [],
  "suggestions": []
}

Rules:
- score must be a number from 0 to 100.
- matchingSkills must contain skills found in both the resume and job description.
- missingSkills must contain important skills required by the job description but not found in the resume.
- strengths must contain useful strengths from the resume.
- suggestions must contain practical improvements for the candidate.
- Do not add Markdown.
- Do not add explanations outside the JSON.

Resume:
${result.text}

Job Description:
${jobDescription}
`,
        config: {
          responseMimeType: "application/json",
        },
      });

      // Convert AI response from JSON text into a JavaScript object
      const analysis = JSON.parse(response.text);

      console.log("AI Analysis:");
      console.log(analysis);

      const savedAnalysis = new Analysis({
        userId: req.userId,
        resumeName: resume.originalname,
        jobDescription: jobDescription,
        score: analysis.score,
        matchingSkills: analysis.matchingSkills,
        missingSkills: analysis.missingSkills,
        strengths: analysis.strengths,
        suggestions: analysis.suggestions,
      });

      await savedAnalysis.save();

      console.log("Analysis saved to MongoDB");

      res.json({
        message: "AI analysis completed successfully!",
        analysis: analysis,
      });

    } catch (error) {
      console.log(error);

      if (error.status === 503) {
        return res.status(503).json({
          message: "AI service is temporarily busy. Please try again.",
        });
      }

      if (error.message === "Only PDF files are allowed.") {
        return res.status(400).json({
          message: error.message,
        });
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Resume file must be smaller than 5 MB.",
        });
      }

      res.status(500).json({
        message: "Something went wrong while analyzing the resume.",
      });

    } finally {

      // Destroy the PDF parser
      if (parser) {
        await parser.destroy();
      }

      // Delete the temporary uploaded file
      if (resume && fs.existsSync(resume.path)) {
        fs.unlinkSync(resume.path);
      }
    }
  }
);


// Get previous analyses
app.get("/history",authenticateToken, async (req, res) => {
  try {
  const userId = req.userId;

    const analyses = await Analysis.find({ userId: userId })
      .sort({ createdAt: -1 });

    res.json(analyses);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to get analysis history.",
    });
  }
});

// Delete an analysis
app.delete("/history/:id", authenticateToken,async (req, res) => {
  try {
   const userId = req.userId;

    await Analysis.findOneAndDelete({
      _id: req.params.id,
      userId: userId,
    });

    res.json({
      message: "Analysis deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to delete analysis.",
    });
  }
});

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name,
      email: email,
      password: hashedPassword,
    });

    await user.save();

    res.json({
      message: "Signup successful",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Signup failed",
    });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});