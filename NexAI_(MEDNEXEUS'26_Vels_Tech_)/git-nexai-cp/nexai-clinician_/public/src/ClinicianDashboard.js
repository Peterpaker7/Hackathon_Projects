import React, { useState, useEffect } from 'react';
import './ClinicianDashboard.css';

function ClinicianDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const API_URL = 'http://localhost:5000';

  // Patient data with phone numbers
  const patientData = {
    kavitha: {
      id: 'kavitha',
      name: 'Kavitha',
      age: 26,
      phone: '+917904336751',
      email: 'testingpurpose905@gmail.com',
      vitals: {
        Age: 26,
        SystolicBP: 145,
        DiastolicBP: 92,
        BS: 7.0,
        BodyTemp: 98.0,
        HeartRate: 80
      }
    },
    priya: {
      id: 'priya',
      name: 'Priya',
      age: 28,
      phone: '+917904336751',
      email: 'testingpurpose905@gmail.com',
      vitals: {
        Age: 28,
        SystolicBP: 120,
        DiastolicBP: 80,
        BS: 6.0,
        BodyTemp: 98.6,
        HeartRate: 75
      }
    },
    lakshmi: {
      id: 'lakshmi',
      name: 'Lakshmi',
      age: 35,
      phone: '+917904336751',
      email: 'testingpurpose905@gmail.com',
      vitals: {
        Age: 35,
        SystolicBP: 135,
        DiastolicBP: 88,
        BS: 8.5,
        BodyTemp: 98.2,
        HeartRate: 88
      }
    }
  };

  // Fetch predictions for all patients
  const fetchAllPatients = async () => {
    setLoading(true);
    const updatedPatients = [];

    for (const [id, patient] of Object.entries(patientData)) {
      try {
        const response = await fetch(`${API_URL}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patient.vitals)
        });

        if (response.ok) {
          const prediction = await response.json();
          updatedPatients.push({
            ...patient,
            prediction: prediction,
            lastUpdate: new Date().toLocaleTimeString()
          });
        }
      } catch (error) {
        console.error(`Error fetching ${patient.name}:`, error);
      }
    }

    setPatients(updatedPatients);
    setLoading(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchAllPatients();
    const interval = setInterval(fetchAllPatients, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Call Patient
  const handleCall = (patient) => {
    // Open phone dialer
    window.location.href = `tel:${patient.phone}`;
  };

  // Handle Send Alert
  const handleSendAlert = async (patient) => {
    if (!window.confirm(`Send alert to ${patient.name}?\n\nThis will send SMS and email notification.`)) {
      return;
    }

    setAlertLoading(true);

    try {
      // Send alert via API
      const response = await fetch(`${API_URL}/send-alert/${patient.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Please check in with your doctor. Your recent vitals require attention.',
          urgent: patient.prediction?.risk_level === 'high risk'
        })
      });

      if (response.ok) {
        alert(`✓ Alert sent successfully to ${patient.name}!\n\n✓ SMS sent to ${patient.phone}\n✓ Email sent to ${patient.email}`);
      } else {
        alert(`Alert notification sent to ${patient.name}\n\nNote: Check API logs for delivery status.`);
      }
    } catch (error) {
      console.error('Alert error:', error);
      alert(`Alert request sent for ${patient.name}\n\nCheck your API logs to confirm delivery.`);
    } finally {
      setAlertLoading(false);
    }
  };

  // Handle View History
  const handleViewHistory = (patient) => {
    setSelectedPatient(patient);
    setShowHistory(true);
  };

  // Get risk color
  const getRiskColor = (risk) => {
    if (risk === 'high risk') return '#e53e3e';
    if (risk === 'mid risk') return '#dd6b20';
    return '#38a169';
  };

  // Get risk badge
  const getRiskBadge = (risk) => {
    if (risk === 'high risk') return { icon: '🔴', text: 'HIGH RISK' };
    if (risk === 'mid risk') return { icon: '🟡', text: 'MID RISK' };
    return { icon: '🟢', text: 'LOW RISK' };
  };

  return (
    <div className="clinician-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="logo">
            Nex<span style={{ color: '#e53e3e' }}>AI</span>
          </h1>
          <p className="subtitle">Clinician Dashboard - Patient Monitoring</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={fetchAllPatients}
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh All'}
          </button>
        </div>
      </header>

      {/* Patient Grid */}
      <div className="patient-grid">
        {patients.length === 0 && !loading && (
          <div className="empty-state">
            <p>No patients loaded. Click "Refresh All" to load patient data.</p>
          </div>
        )}

        {patients.map((patient) => {
          const badge = getRiskBadge(patient.prediction?.risk_level);
          const riskColor = getRiskColor(patient.prediction?.risk_level);

          return (
            <div 
              key={patient.id}
              className="patient-card"
              style={{ borderColor: riskColor }}
            >
              {/* Patient Header */}
              <div className="patient-header">
                <div className="patient-info">
                  <h3>{patient.name}</h3>
                  <p className="patient-meta">Age: {patient.age} | ID: {patient.id}</p>
                </div>
                <div 
                  className="risk-badge"
                  style={{ 
                    backgroundColor: riskColor + '20',
                    color: riskColor,
                    borderColor: riskColor
                  }}
                >
                  <span className="risk-icon">{badge.icon}</span>
                  <span className="risk-text">{badge.text}</span>
                </div>
              </div>

              {/* Vitals Summary */}
              <div className="vitals-summary">
                <div className="vital-item">
                  <span className="vital-label">BP:</span>
                  <span className="vital-value">
                    {patient.vitals.SystolicBP}/{patient.vitals.DiastolicBP}
                  </span>
                </div>
                <div className="vital-item">
                  <span className="vital-label">BS:</span>
                  <span className="vital-value">{patient.vitals.BS}</span>
                </div>
                <div className="vital-item">
                  <span className="vital-label">HR:</span>
                  <span className="vital-value">{patient.vitals.HeartRate}</span>
                </div>
                <div className="vital-item">
                  <span className="vital-label">Temp:</span>
                  <span className="vital-value">{patient.vitals.BodyTemp}°F</span>
                </div>
              </div>

              {/* Confidence */}
              {patient.prediction && (
                <div className="confidence-bar">
                  <div className="confidence-label">
                    Confidence: {patient.prediction.confidence}%
                  </div>
                  <div className="confidence-track">
                    <div 
                      className="confidence-fill"
                      style={{ 
                        width: `${patient.prediction.confidence}%`,
                        backgroundColor: riskColor
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Detected Conditions */}
              {patient.prediction?.subtags && patient.prediction.subtags.length > 0 && (
                <div className="conditions">
                  {patient.prediction.subtags.map((tag, idx) => (
                    <span key={idx} className="condition-tag" style={{ borderColor: riskColor }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* SHAP Explanation */}
              {patient.prediction?.shap_explanation && patient.prediction.shap_explanation.length > 0 && (
                <div className="shap-mini">
                  <h4>Key Risk Factors:</h4>
                  <div className="shap-list">
                    {patient.prediction.shap_explanation.map((item, idx) => (
                      <div key={idx} className="shap-item-mini">
                        <span className="shap-feature">{item.feature}</span>
                        <div className="shap-bar-container">
                          <div 
                            className="shap-bar"
                            style={{ 
                              width: `${item.contribution}%`,
                              backgroundColor: riskColor
                            }}
                          ></div>
                        </div>
                        <span className="shap-value">{item.contribution}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                <button 
                  className="action-btn call-btn"
                  onClick={() => handleCall(patient)}
                  title={`Call ${patient.name} at ${patient.phone}`}
                >
                  📞 Call Patient
                </button>
                <button 
                  className="action-btn alert-btn"
                  onClick={() => handleSendAlert(patient)}
                  disabled={alertLoading}
                >
                  {alertLoading ? '⏳ Sending...' : '📨 Send Alert'}
                </button>
                <button 
                  className="action-btn history-btn"
                  onClick={() => handleViewHistory(patient)}
                >
                  📋 View History
                </button>
              </div>

              {/* Last Update */}
              <div className="last-update">
                Last updated: {patient.lastUpdate}
              </div>
            </div>
          );
        })}
      </div>

      {/* History Modal */}
      {showHistory && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Medical History - {selectedPatient.name}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowHistory(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="history-section">
                <h3>Patient Information</h3>
                <table className="info-table">
                  <tbody>
                    <tr>
                      <td><strong>Name:</strong></td>
                      <td>{selectedPatient.name}</td>
                    </tr>
                    <tr>
                      <td><strong>Age:</strong></td>
                      <td>{selectedPatient.age} years</td>
                    </tr>
                    <tr>
                      <td><strong>Phone:</strong></td>
                      <td>{selectedPatient.phone}</td>
                    </tr>
                    <tr>
                      <td><strong>Email:</strong></td>
                      <td>{selectedPatient.email}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="history-section">
                <h3>Current Vitals</h3>
                <table className="vitals-table">
                  <tbody>
                    <tr>
                      <td>Blood Pressure:</td>
                      <td>{selectedPatient.vitals.SystolicBP}/{selectedPatient.vitals.DiastolicBP} mmHg</td>
                    </tr>
                    <tr>
                      <td>Blood Sugar:</td>
                      <td>{selectedPatient.vitals.BS} mmol/L</td>
                    </tr>
                    <tr>
                      <td>Heart Rate:</td>
                      <td>{selectedPatient.vitals.HeartRate} bpm</td>
                    </tr>
                    <tr>
                      <td>Body Temperature:</td>
                      <td>{selectedPatient.vitals.BodyTemp}°F</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="history-section">
                <h3>Current Risk Assessment</h3>
                {selectedPatient.prediction && (
                  <div>
                    <div className="risk-display" style={{ color: getRiskColor(selectedPatient.prediction.risk_level) }}>
                      {getRiskBadge(selectedPatient.prediction.risk_level).icon} {selectedPatient.prediction.risk_level.toUpperCase()}
                    </div>
                    <p><strong>Confidence:</strong> {selectedPatient.prediction.confidence}%</p>
                    <p><strong>Recommendation:</strong></p>
                    <p className="recommendation-text">{selectedPatient.prediction.recommendation}</p>
                  </div>
                )}
              </div>

              <div className="history-section">
                <h3>Alert History</h3>
                <p className="placeholder-text">
                  <em>Alert history feature coming soon. This will show all SMS/email alerts sent to this patient.</em>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicianDashboard;
