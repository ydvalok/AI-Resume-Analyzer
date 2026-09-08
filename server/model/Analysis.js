const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  resumeName: String,

  jobDescription: String,

  score: Number,

  matchingSkills: [String],

  missingSkills: [String],

  strengths: [String],

  suggestions: [String],

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

const Analysis = mongoose.model("Analysis", analysisSchema);

module.exports = Analysis;