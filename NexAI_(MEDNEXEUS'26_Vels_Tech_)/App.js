import React, { useState } from 'react';
import './App.css';

function App() {
  // State management
  const [formData, setFormData] = useState({
    Age: '',
    SystolicBP: '',
    DiastolicBP: '',
    BS: '',
    BodyTemp: '',
    HeartRate: ''
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: parseFloat(e.target.value) || ''
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      setError('Failed to get prediction. Make sure Flask API is running on port 5000.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load Kavitha's test scenario
  const loadKavithaScenario = () => {
    setFormData({
      Age: 26,
      SystolicBP: 145,
      DiastolicBP: 92,
      BS: 7.0,
      BodyTemp: 98.0,
      HeartRate: 80
    });
  };

  // Get risk color
  const getRiskColor = (risk) => {
    if (risk === 'high risk') return '#e53e3e';
    if (risk === 'mid risk') return '#dd6b20';
    return '#38a169';
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            Nex<span style={{ color: '#e53e3e' }}>AI</span>
          </h1>
          <p className="tagline">Pregnancy Monitoring & Risk Alert System</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <div className="main-grid">

          {/* Left Side - Input Form */}
          <div className="card form-card">
            <div className="card-header">
              <h2>Patient Vitals Input</h2>
              <button
                className="demo-btn"
                onClick={loadKavithaScenario}
                type="button"
              >
                📋 Load Demo Data
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">

                <div className="form-group">
                  <label>Age (years)</label>
                  <input
                    type="number"
                    name="Age"
                    value={formData.Age}
                    onChange={handleChange}
                    placeholder="e.g., 26"
                    required
                    min="15"
                    max="50"
                  />
                </div>

                <div className="form-group">
                  <label>Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    name="SystolicBP"
                    value={formData.SystolicBP}
                    onChange={handleChange}
                    placeholder="e.g., 120"
                    required
                    min="70"
                    max="200"
                  />
                </div>

                <div className="form-group">
                  <label>Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    name="DiastolicBP"
                    value={formData.DiastolicBP}
                    onChange={handleChange}
                    placeholder="e.g., 80"
                    required
                    min="40"
                    max="130"
                  />
                </div>

                <div className="form-group">
                  <label>Blood Sugar (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="BS"
                    value={formData.BS}
                    onChange={handleChange}
                    placeholder="e.g., 7.0"
                    required
                    min="3"
                    max="20"
                  />
                </div>

                <div className="form-group">
                  <label>Body Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="BodyTemp"
                    value={formData.BodyTemp}
                    onChange={handleChange}
                    placeholder="e.g., 98.6"
                    required
                    min="95"
                    max="105"
                  />
                </div>

                <div className="form-group">
                  <label>Heart Rate (bpm)</label>
                  <input
                    type="number"
                    name="HeartRate"
                    value={formData.HeartRate}
                    onChange={handleChange}
                    placeholder="e.g., 75"
                    required
                    min="50"
                    max="150"
                  />
                </div>

              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? '🔄 Analyzing...' : '🔬 Analyze Risk'}
              </button>
            </form>

            {error && (
              <div className="error-box">
                <strong>❌ Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Right Side - Results */}
          <div className="card results-card">
            <h2>Risk Analysis Results</h2>

            {!prediction && !loading && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p>Enter patient vitals and click "Analyze Risk" to see prediction</p>
              </div>
            )}

            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Analyzing patient data...</p>
              </div>
            )}

            {prediction && (
              <div className="results">

                {/* Risk Level Badge */}
                <div
                  className="risk-badge"
                  style={{
                    backgroundColor: getRiskColor(prediction.risk_level) + '20',
                    borderColor: getRiskColor(prediction.risk_level)
                  }}
                >
                  <div
                    className="risk-level"
                    style={{ color: getRiskColor(prediction.risk_level) }}
                  >
                    {prediction.risk_level.toUpperCase()}
                  </div>
                  <div className="confidence">
                    Confidence: {prediction.confidence}%
                  </div>
                </div>

                {/* Probabilities Chart */}
                <div className="probabilities">
                  <h3>Risk Probabilities</h3>
                  <div className="prob-bar">
                    <div className="prob-label">Low Risk</div>
                    <div className="prob-track">
                      <div
                        className="prob-fill low"
                        style={{ width: `${prediction.probabilities.low_risk}%` }}
                      ></div>
                    </div>
                    <div className="prob-value">{prediction.probabilities.low_risk}%</div>
                  </div>
                  <div className="prob-bar">
                    <div className="prob-label">Mid Risk</div>
                    <div className="prob-track">
                      <div
                        className="prob-fill mid"
                        style={{ width: `${prediction.probabilities.mid_risk}%` }}
                      ></div>
                    </div>
                    <div className="prob-value">{prediction.probabilities.mid_risk}%</div>
                  </div>
                  <div className="prob-bar">
                    <div className="prob-label">High Risk</div>
                    <div className="prob-track">
                      <div
                        className="prob-fill high"
                        style={{ width: `${prediction.probabilities.high_risk}%` }}
                      ></div>
                    </div>
                    <div className="prob-value">{prediction.probabilities.high_risk}%</div>
                  </div>
                </div>

                {/* Subtags */}
                {prediction.subtags && prediction.subtags.length > 0 && (
                  <div className="subtags">
                    <h3>Detected Conditions</h3>
                    <div className="tag-list">
                      {prediction.subtags.map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* SHAP Explanation */}
                {prediction.shap_explanation && prediction.shap_explanation.length > 0 && (
                  <div className="shap-section">
                    <h3>Why This Prediction? (AI Explainability)</h3>
                    <div className="shap-bars">
                      {prediction.shap_explanation.map((item, idx) => (
                        <div key={idx} className="shap-item">
                          <div className="shap-label">{item.feature}</div>
                          <div className="shap-track">
                            <div
                              className="shap-fill"
                              style={{ width: `${item.contribution}%` }}
                            ></div>
                          </div>
                          <div className="shap-value">{item.contribution}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div
                  className="recommendation"
                  style={{
                    backgroundColor: getRiskColor(prediction.risk_level) + '15',
                    borderLeftColor: getRiskColor(prediction.risk_level)
                  }}
                >
                  <strong>Recommendation:</strong>
                  <p>{prediction.recommendation}</p>
                </div>

                {/* SOS Button */}
                {prediction.risk_level === 'high risk' && (
                  <button className="sos-btn">
                    🆘 PRESS SOS - EMERGENCY ALERT
                  </button>
                )}

              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>NexAI 2026 | MedNexus Hackathon | Team: MUKESH K A, NITHISH K, SREYA S, ROKITH K, NAVANEETH VIKAS</p>
      </footer>
    </div>
  );
}

export default App;
