import React, { useState, useEffect } from 'react';
import './ClinicianDashboard.css';

function ClinicianDashboard() {
  const [patients, setPatients] = useState([
    {
      id: 1,
      name: "Kavitha",
      age: 26,
      weeks: 30,
      lastReading: null,
      riskLevel: "Loading...",
      vitals: {
        SystolicBP: 145,
        DiastolicBP: 92,
        BS: 7.0,
        BodyTemp: 98.0,
        HeartRate: 80
      }
    },
    {
      id: 2,
      name: "Priya",
      age: 28,
      weeks: 24,
      lastReading: null,
      riskLevel: "Loading...",
      vitals: {
        SystolicBP: 120,
        DiastolicBP: 80,
        BS: 6.0,
        BodyTemp: 98.6,
        HeartRate: 75
      }
    },
    {
      id: 3,
      name: "Lakshmi",
      age: 35,
      weeks: 28,
      lastReading: null,
      riskLevel: "Loading...",
      vitals: {
        SystolicBP: 135,
        DiastolicBP: 88,
        BS: 8.5,
        BodyTemp: 98.2,
        HeartRate: 88
      }
    }
  ]);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch prediction for a patient
  const fetchPrediction = async (patient) => {
    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Age: patient.age,
          ...patient.vitals
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching prediction:', error);
    }
    return null;
  };

  // Refresh all patient data
  const refreshAllPatients = async () => {
    setLoading(true);
    const updatedPatients = await Promise.all(
      patients.map(async (patient) => {
        const prediction = await fetchPrediction(patient);
        return {
          ...patient,
          lastReading: new Date().toLocaleTimeString(),
          riskLevel: prediction ? prediction.risk_level : 'Unknown',
          prediction: prediction
        };
      })
    );
    setPatients(updatedPatients);
    setLoading(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshAllPatients();
    const interval = setInterval(refreshAllPatients, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (risk) => {
    if (risk === 'high risk') return '#e53e3e';
    if (risk === 'mid risk') return '#dd6b20';
    if (risk === 'low risk') return '#38a169';
    return '#6e7681';
  };

  const getRiskIcon = (risk) => {
    if (risk === 'high risk') return '🔴';
    if (risk === 'mid risk') return '🟡';
    if (risk === 'low risk') return '🟢';
    return '⚪';
  };

  return (
    <div className="clinician-app">
      {/* Header */}
      <header className="clinician-header">
        <div className="header-content">
          <h1 className="logo">
            Nex<span style={{ color: '#e53e3e' }}>AI</span> <span className="subtitle">Clinician Portal</span>
          </h1>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={refreshAllPatients}
              disabled={loading}
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh All'}
            </button>
          </div>
        </div>
      </header>

      <div className="clinician-container">
        {/* Left Panel - Patient List */}
        <div className="patient-list-panel">
          <h2>Active Patients ({patients.length})</h2>
          
          <div className="patient-list">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`patient-card ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                onClick={() => setSelectedPatient(patient)}
                style={{ borderLeftColor: getRiskColor(patient.riskLevel) }}
              >
                <div className="patient-header">
                  <div className="patient-name">
                    {getRiskIcon(patient.riskLevel)} {patient.name}
                  </div>
                  <div 
                    className="risk-badge-small"
                    style={{ backgroundColor: getRiskColor(patient.riskLevel) }}
                  >
                    {patient.riskLevel === 'high risk' ? 'HIGH' : 
                     patient.riskLevel === 'mid risk' ? 'MID' : 
                     patient.riskLevel === 'low risk' ? 'LOW' : '---'}
                  </div>
                </div>
                
                <div className="patient-info">
                  <span>Age: {patient.age} | {patient.weeks} weeks</span>
                </div>
                
                <div className="patient-vitals-quick">
                  <span>BP: {patient.vitals.SystolicBP}/{patient.vitals.DiastolicBP}</span>
                  <span>HR: {patient.vitals.HeartRate}</span>
                  <span>BS: {patient.vitals.BS}</span>
                </div>
                
                {patient.lastReading && (
                  <div className="last-reading">
                    Last: {patient.lastReading}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Patient Details */}
        <div className="patient-detail-panel">
          {!selectedPatient ? (
            <div className="no-selection">
              <div className="empty-icon">👈</div>
              <p>Select a patient from the list to view details</p>
            </div>
          ) : (
            <div className="patient-details">
              {/* Patient Header */}
              <div className="detail-header">
                <div>
                  <h2>{selectedPatient.name}</h2>
                  <p className="patient-meta">
                    {selectedPatient.age} years old • {selectedPatient.weeks} weeks pregnant
                  </p>
                </div>
                <div
                  className="risk-badge-large"
                  style={{ 
                    backgroundColor: getRiskColor(selectedPatient.riskLevel) + '20',
                    borderColor: getRiskColor(selectedPatient.riskLevel),
                    color: getRiskColor(selectedPatient.riskLevel)
                  }}
                >
                  {selectedPatient.riskLevel.toUpperCase()}
                </div>
              </div>

              {/* Current Vitals */}
              <div className="vitals-section">
                <h3>Current Vitals</h3>
                <div className="vitals-grid">
                  <div className="vital-card">
                    <div className="vital-label">Blood Pressure</div>
                    <div className="vital-value">
                      {selectedPatient.vitals.SystolicBP}/{selectedPatient.vitals.DiastolicBP}
                      <span className="vital-unit">mmHg</span>
                    </div>
                  </div>
                  <div className="vital-card">
                    <div className="vital-label">Heart Rate</div>
                    <div className="vital-value">
                      {selectedPatient.vitals.HeartRate}
                      <span className="vital-unit">bpm</span>
                    </div>
                  </div>
                  <div className="vital-card">
                    <div className="vital-label">Blood Sugar</div>
                    <div className="vital-value">
                      {selectedPatient.vitals.BS}
                      <span className="vital-unit">mmol/L</span>
                    </div>
                  </div>
                  <div className="vital-card">
                    <div className="vital-label">Temperature</div>
                    <div className="vital-value">
                      {selectedPatient.vitals.BodyTemp}
                      <span className="vital-unit">°F</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {selectedPatient.prediction && (
                <>
                  {/* Risk Probabilities */}
                  <div className="analysis-section">
                    <h3>Risk Assessment</h3>
                    <div className="prob-bars-clinician">
                      <div className="prob-item">
                        <span className="prob-label">High Risk</span>
                        <div className="prob-track">
                          <div
                            className="prob-fill high"
                            style={{ width: `${selectedPatient.prediction.probabilities.high_risk}%` }}
                          ></div>
                        </div>
                        <span className="prob-value">{selectedPatient.prediction.probabilities.high_risk}%</span>
                      </div>
                      <div className="prob-item">
                        <span className="prob-label">Mid Risk</span>
                        <div className="prob-track">
                          <div
                            className="prob-fill mid"
                            style={{ width: `${selectedPatient.prediction.probabilities.mid_risk}%` }}
                          ></div>
                        </div>
                        <span className="prob-value">{selectedPatient.prediction.probabilities.mid_risk}%</span>
                      </div>
                      <div className="prob-item">
                        <span className="prob-label">Low Risk</span>
                        <div className="prob-track">
                          <div
                            className="prob-fill low"
                            style={{ width: `${selectedPatient.prediction.probabilities.low_risk}%` }}
                          ></div>
                        </div>
                        <span className="prob-value">{selectedPatient.prediction.probabilities.low_risk}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Detected Conditions */}
                  {selectedPatient.prediction.subtags && selectedPatient.prediction.subtags.length > 0 && (
                    <div className="conditions-section">
                      <h3>⚠️ Detected Conditions</h3>
                      <div className="condition-tags">
                        {selectedPatient.prediction.subtags.map((tag, idx) => (
                          <span key={idx} className="condition-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SHAP Explainability */}
                  {selectedPatient.prediction.shap_explanation && selectedPatient.prediction.shap_explanation.length > 0 && (
                    <div className="shap-section">
                      <h3>🧠 AI Explainability (SHAP)</h3>
                      <p className="shap-description">Top contributing factors to this prediction:</p>
                      <div className="shap-bars">
                        {selectedPatient.prediction.shap_explanation.map((item, idx) => (
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

                  {/* Clinical Recommendation */}
                  <div 
                    className="recommendation-box"
                    style={{ 
                      backgroundColor: getRiskColor(selectedPatient.riskLevel) + '15',
                      borderLeftColor: getRiskColor(selectedPatient.riskLevel)
                    }}
                  >
                    <strong>📋 Clinical Recommendation:</strong>
                    <p>{selectedPatient.prediction.recommendation}</p>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                <button className="action-btn primary">
                  📞 Call Patient
                </button>
                <button className="action-btn secondary">
                  📧 Send Alert
                </button>
                <button className="action-btn secondary">
                  📋 View History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClinicianDashboard;
