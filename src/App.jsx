
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
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleResumeChange = (event) => {
    setResume(event.target.files[0] || null);
  };

  const handleAnalyze = async () => {
    if (!resume || !jobDescription.trim()) {
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
    <div className="bg-light min-vh-100">
      {/* Header */}
      <header className="bg-dark text-white py-4">
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h1 className="h2 fw-bold mb-1">
              AI Resume Analyzer
            </h1>
            <p className="text-white-50 mb-0">
              Welcome, {user?.name || "User"} 👋
            </p>
          </div>

          <button
            className="btn btn-outline-light"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container py-5">
        {/* Introduction */}
        <p className="text-secondary text-center mx-auto mb-4"
           style={{ maxWidth: "750px" }}>
          Upload your resume and compare it with a job description
          to discover your match score, skill gaps, strengths,
          and areas for improvement.
        </p>

        {/* Upload Form */}
        <div className="card border-0 shadow-sm rounded-4 mb-5">
          <div className="card-body p-4 p-md-5">
            <h2 className="h4 fw-bold mb-2">
              Analyze Your Resume
            </h2>

            <p className="text-secondary mb-4">
              Upload your resume as a PDF and paste the job description below.
            </p>

            <div className="mb-4">
              <label
                htmlFor="resume"
                className="form-label fw-semibold"
              >
                Upload Resume (PDF)
              </label>

              <input
                id="resume"
                type="file"
                accept=".pdf,application/pdf"
                className="form-control"
                onChange={handleResumeChange}
              />

              {resume && (
                <div className="form-text">
                  Selected: {resume.name}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label
                htmlFor="jobDescription"
                className="form-label fw-semibold"
              >
                Job Description
              </label>

              <textarea
                id="jobDescription"
                className="form-control"
                placeholder="Paste the job description here..."
                rows={9}
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(event.target.value)
                }
              />
            </div>

            <button
              className="btn btn-primary btn-lg w-100 fw-semibold"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    aria-hidden="true"
                  />
                  Analyzing Resume...
                </>
              ) : (
                "Analyze Resume"
              )}
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <section className="mb-5">
            <h2 className="h3 fw-bold mb-4">
              Resume Analysis
            </h2>

            {/* Match Score */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex flex-column flex-sm-row align-items-center gap-4 text-center text-sm-start">
                  <div
                    className="rounded-circle border border-primary border-5 bg-primary-subtle text-primary d-flex flex-column justify-content-center align-items-center flex-shrink-0"
                    style={{ width: "115px", height: "115px" }}
                  >
                    <span className="fs-2 fw-bold">
                      {analysis.score}
                    </span>
                    <small>/100</small>
                  </div>

                  <div>
                    <h3 className="h4 fw-bold">
                      Match Score
                    </h3>
                    <p className="text-secondary mb-0">
                      Your resume matches this job description by{" "}
                      <strong>{analysis.score}%</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="row g-4">
              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h3 className="h5 fw-bold mb-3">
                      Matching Skills
                    </h3>

                    {analysis.matchingSkills.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {analysis.matchingSkills.map((skill, index) => (
                          <span
                            className="badge rounded-pill text-bg-success p-2"
                            key={index}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-secondary mb-0">
                        No matching skills found.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h3 className="h5 fw-bold mb-3">
                      Missing Skills
                    </h3>

                    {analysis.missingSkills.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {analysis.missingSkills.map((skill, index) => (
                          <span
                            className="badge rounded-pill text-bg-danger p-2"
                            key={index}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-secondary mb-0">
                        No important missing skills found.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h3 className="h5 fw-bold mb-3">
                      Strengths
                    </h3>

                    <ul className="mb-0 text-secondary">
                      {analysis.strengths.map((strength, index) => (
                        <li className="mb-2" key={index}>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h3 className="h5 fw-bold mb-3">
                      Suggestions
                    </h3>

                    <ul className="mb-0 text-secondary">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li className="mb-2" key={index}>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* History */}
        <section>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
              <h2 className="h3 fw-bold mb-1">
                Analysis History
              </h2>
              <p className="text-secondary mb-0">
                View your previous resume analyses.
              </p>
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={getHistory}
            >
              Load History
            </button>
          </div>

          {history.length === 0 ? (
            <div className="alert alert-secondary">
              No previous analyses loaded.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {history.map((item) => (
                <div
                  className="card border-0 shadow-sm rounded-4"
                  key={item._id}
                >
                  <div className="card-body p-4 d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3">
                    <div>
                      <h3 className="h5 fw-bold mb-3">
                        {item.resumeName}
                      </h3>

                      <p className="mb-2">
                        <strong>Match Score:</strong>{" "}
                        <span className="badge text-bg-primary">
                          {item.score}/100
                        </span>
                      </p>

                      <p className="text-secondary mb-2">
                        <strong>Date:</strong>{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </p>

                      <p className="text-secondary mb-0">
                        <strong>Matching Skills:</strong>{" "}
                        {item.matchingSkills.length > 0
                          ? item.matchingSkills.join(", ")
                          : "None"}
                      </p>
                    </div>

                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(item._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
