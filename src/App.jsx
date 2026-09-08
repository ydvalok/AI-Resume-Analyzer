import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleResumeChange = (event) => {
    setResume(event.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!resume || !jobDescription) {
      alert("Please upload a resume and enter a job description.");
      return;
    }

    const formData = new FormData();

    formData.append("resume", resume);
    formData.append("jobDescription", jobDescription);

    const token = localStorage.getItem("token");

    setLoading(true);
    setAnalysis(null);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setAnalysis(data.analysis);

      getHistory();
    } catch (error) {
      console.log(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const getHistory = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setHistory(data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/history/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      getHistory();
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    navigate("/signup");
  };

  return (
    <div className="app">

      <header className="top-bar">
        <div>
          <h1>AI Resume Analyzer</h1>
          <p className="welcome">
            Welcome, {user.name} 👋
          </p>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <p className="intro">
        Upload your resume and compare it with a job description to discover
        your match score, skill gaps, strengths, and areas for improvement.
      </p>

      <div className="form-container">

        <div className="upload-section">
          <h2>Analyze Your Resume</h2>

          <p>
            Upload your resume as a PDF and paste the job description below.
          </p>

          <label className="file-label">
            <span>
              {resume ? resume.name : "Choose your resume PDF"}
            </span>

            <input
              type="file"
              accept=".pdf"
              onChange={handleResumeChange}
            />
          </label>
        </div>

        <textarea
          placeholder="Paste the job description here..."
          rows="9"
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
        ></textarea>

        <button
          className="analyze-button"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? "Analyzing Resume..." : "Analyze Resume"}
        </button>

      </div>

      {analysis && (
        <div className="result">

          <h2>Resume Analysis</h2>

          <div className="score-card">

            <div className="score-circle">
              <span>{analysis.score}</span>
              <small>/100</small>
            </div>

            <div>
              <h3>Match Score</h3>
              <p>
                Your resume matches this job description by{" "}
                <strong>{analysis.score}%</strong>.
              </p>
            </div>

          </div>

          <div className="analysis-grid">

            <div className="analysis-section">
              <h3>Matching Skills</h3>

              {analysis.matchingSkills.length > 0 ? (
                <div className="skill-list">
                  {analysis.matchingSkills.map((skill, index) => (
                    <span className="skill-badge" key={index}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p>No matching skills found.</p>
              )}
            </div>

            <div className="analysis-section">
              <h3>Missing Skills</h3>

              {analysis.missingSkills.length > 0 ? (
                <div className="skill-list">
                  {analysis.missingSkills.map((skill, index) => (
                    <span className="missing-badge" key={index}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p>No important missing skills found.</p>
              )}
            </div>

            <div className="analysis-section">
              <h3>Strengths</h3>

              <ul>
                {analysis.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>

            <div className="analysis-section">
              <h3>Suggestions</h3>

              <ul>
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      )}

      <div className="history">

        <div className="history-header">
          <div>
            <h2>Analysis History</h2>
            <p>View your previous resume analyses.</p>
          </div>

          <button
            className="history-button"
            onClick={getHistory}
          >
            Load History
          </button>
        </div>

        {history.length === 0 ? (
          <p className="no-history">
            No previous analyses found.
          </p>
        ) : (
          history.map((item) => (

            <div
              className="history-card"
              key={item._id}
            >

              <div>
                <h3>{item.resumeName}</h3>

                <p>
                  <strong>Match Score:</strong>{" "}
                  {item.score}/100
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>

                <p>
                  <strong>Matching Skills:</strong>{" "}
                  {item.matchingSkills.length > 0
                    ? item.matchingSkills.join(", ")
                    : "None"}
                </p>
              </div>

              <button
                className="delete-button"
                onClick={() => handleDelete(item._id)}
              >
                Delete
              </button>

            </div>

          ))
        )}

      </div>

    </div>
  );
}

export default App;