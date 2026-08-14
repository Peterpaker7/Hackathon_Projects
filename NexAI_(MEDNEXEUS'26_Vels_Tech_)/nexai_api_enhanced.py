"""
NexAI Flask API - ENHANCED VERSION
Features:
- WebSocket support for real-time updates
- Twilio SMS integration
- Email notifications
- SOS emergency system
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import joblib
import numpy as np
import pandas as pd
import shap
import warnings
import os
from datetime import datetime
from dotenv import load_dotenv
import os
load_dotenv()
print("DEBUG TWILIO SID:", os.getenv("TWILIO_ACCOUNT_SID"))
print("DEBUG EMAIL:", os.getenv("GMAIL_USER"))
warnings.filterwarnings('ignore')

# ============================================
# STEP 1: Initialize Flask App with SocketIO
# ============================================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'nexai-secret-key-2026'

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO for real-time updates
socketio = SocketIO(app, cors_allowed_origins="*")

# ============================================
# STEP 2: Load Model Components
# ============================================
print("Loading NexAI model components...")

try:
    model = joblib.load('nexai_model.pkl')
    print("✓ Model loaded")
    
    scaler = joblib.load('nexai_scaler.pkl')
    print("✓ Scaler loaded")
    
    label_encoder = joblib.load('nexai_label_encoder.pkl')
    print("✓ Label encoder loaded")
    
    feature_names = joblib.load('nexai_features.pkl')
    print("✓ Feature names loaded")
    
    explainer = shap.TreeExplainer(model)
    print("✓ SHAP explainer initialized")
    
    print("\n✅ NexAI API ready!")
    
except Exception as e:
    print(f"❌ Error loading model: {e}")

# ============================================
# STEP 3: Twilio Configuration
# ============================================
# Install: pip install twilio
try:
    from twilio.rest import Client
    # Get these from https://console.twilio.com
    # FREE trial gives you $15 credit (~500 SMS)
    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID',)
    TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE')  # Your Twilio number
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        TWILIO_ENABLED = True
        print("✓ Twilio SMS enabled")
    else:
        TWILIO_ENABLED = False
        print("⚠ Twilio not configured - SMS disabled")
except ImportError:
    TWILIO_ENABLED = False
    print("⚠ Twilio not installed - SMS disabled")

# ============================================
# STEP 4: Email Configuration
# ============================================
try:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Gmail SMTP settings
    EMAIL_ENABLED = True
    GMAIL_USER = os.getenv('GMAIL_USER', 'your-email@gmail.com')
    GMAIL_APP_PASSWORD = os.getenv('GMAIL_PASSWORD', 'your-app-password')
    
    if GMAIL_USER and GMAIL_APP_PASSWORD:
        EMAIL_ENABLED = True
        print("✓ Email notifications enabled")
    else:
        EMAIL_ENABLED = False
        print("⚠ Email not configured")
        
except ImportError:
    EMAIL_ENABLED = False
    print("⚠ Email disabled")

# ============================================
# STEP 5: Patient Database (In-Memory)
# ============================================
# In production, use PostgreSQL
PATIENTS_DB = {
    "kavitha": {
        "name": "Kavitha",
        "age": 26,
        "phone": "+917904336751",  # Replace with real number for testing
        "doctor_phone": "+919876543211",
        "family_phone": "+919876543212",
        "email": "kavitha@example.com",
        "doctor_email": "doctor@hospital.com",
        "last_vitals": None,
        "last_prediction": None,
        "alert_history": []
    },
    "priya": {
        "name": "Priya",
        "age": 28,
        "phone": "+919876543213",
        "doctor_phone": "+919876543211",
        "family_phone": "+919876543214",
        "email": "priya@example.com",
        "doctor_email": "doctor@hospital.com",
        "last_vitals": None,
        "last_prediction": None,
        "alert_history": []
    },
    "lakshmi": {
        "name": "Lakshmi",
        "age": 35,
        "phone": "+919876543215",
        "doctor_phone": "+919876543211",
        "family_phone": "+919876543216",
        "email": "lakshmi@example.com",
        "doctor_email": "doctor@hospital.com",
        "last_vitals": None,
        "last_prediction": None,
        "alert_history": []
    }
}

# ============================================
# STEP 6: Helper Functions
# ============================================

def get_risk_subtag(data, risk_level):
    """Determines specific risk type"""
    subtags = []
    
    if data['SystolicBP'] >= 140 or data['DiastolicBP'] >= 90:
        subtags.append('Pre-Eclampsia Risk')
    
    if data['BS'] >= 8.0:
        subtags.append('Gestational Diabetes Risk')
    
    if data['HeartRate'] > 100:
        subtags.append('Possible Anaemia')
    
    if not subtags and risk_level == 'high risk':
        subtags.append('General High Risk')
    
    return subtags if subtags else ['Normal Monitoring']

def get_shap_explanation(input_data):
    """Get SHAP feature importance"""
    try:
        input_scaled = scaler.transform(input_data)
        shap_values = explainer.shap_values(input_scaled)
        
        if isinstance(shap_values, list):
            prediction_class = model.predict(input_scaled)[0]
            shap_for_prediction = shap_values[prediction_class][0]
        else:
            shap_for_prediction = shap_values[0]
        
        feature_importance = {}
        for i, feature in enumerate(feature_names):
            feature_importance[feature] = abs(float(shap_for_prediction[i]))
        
        sorted_features = sorted(
            feature_importance.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:3]
        
        total = sum(feature_importance.values())
        top_features = []
        for feature, importance in sorted_features:
            percent = (importance / total) * 100 if total > 0 else 0
            top_features.append({
                'feature': feature,
                'contribution': round(percent, 1)
            })
        
        return top_features
        
    except Exception as e:
        print(f"SHAP error: {e}")
        return []

def send_sms(to_phone, message):
    """Send SMS via Twilio"""
    if not TWILIO_ENABLED:
        print(f"SMS (simulated) to {to_phone}: {message}")
        return False
    
    try:
        message = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        print(f"✓ SMS sent to {to_phone}: {message.sid}")
        return True
    except Exception as e:
        print(f"❌ SMS error: {e}")
        return False

def send_email(to_email, subject, body):
    """Send email via Gmail SMTP"""
    if not EMAIL_ENABLED:
        print(f"Email (simulated) to {to_email}: {subject}")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✓ Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

def send_alerts(patient_data, prediction):
    """Send alerts based on risk level"""
    risk = prediction['risk_level']
    patient_name = patient_data['name']
    
    if risk == 'high risk':
        # SMS to family
        family_msg = f"🚨 URGENT: {patient_name} has been flagged as HIGH RISK for pregnancy complications. Please contact her immediately and schedule a doctor visit. - NexAI"
        send_sms(patient_data['family_phone'], family_msg)
        
        # SMS to doctor
        doctor_msg = f"⚠️ HIGH RISK ALERT: Patient {patient_name} (Age {patient_data['age']}) - BP: {patient_data['last_vitals']['SystolicBP']}/{patient_data['last_vitals']['DiastolicBP']}, Glucose: {patient_data['last_vitals']['BS']}. Conditions: {', '.join(prediction['subtags'])}. Confidence: {prediction['confidence']}%. Please review. - NexAI"
        send_sms(patient_data['doctor_phone'], doctor_msg)
        
        # Email to doctor
        email_subject = f"HIGH RISK ALERT: {patient_name}"
        email_body = f"""
        <html>
        <body>
            <h2 style="color: #e53e3e;">🚨 HIGH RISK ALERT</h2>
            <p><strong>Patient:</strong> {patient_name}, Age {patient_data['age']}</p>
            <p><strong>Risk Level:</strong> HIGH RISK ({prediction['confidence']}% confidence)</p>
            <p><strong>Detected Conditions:</strong> {', '.join(prediction['subtags'])}</p>
            <h3>Current Vitals:</h3>
            <ul>
                <li>Blood Pressure: {patient_data['last_vitals']['SystolicBP']}/{patient_data['last_vitals']['DiastolicBP']} mmHg</li>
                <li>Blood Sugar: {patient_data['last_vitals']['BS']} mmol/L</li>
                <li>Heart Rate: {patient_data['last_vitals']['HeartRate']} bpm</li>
                <li>Temperature: {patient_data['last_vitals']['BodyTemp']}°F</li>
            </ul>
            <p><strong>Recommendation:</strong> {prediction['recommendation']}</p>
            <p>Please contact patient immediately.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">NexAI - Pregnancy Monitoring System</p>
        </body>
        </html>
        """
        send_email(patient_data['doctor_email'], email_subject, email_body)
        
    elif risk == 'mid risk':
        # SMS to patient only
        patient_msg = f"⚡ NexAI Alert: Your vitals show MEDIUM RISK. Please schedule a clinic visit within 24-48 hours. Monitor symptoms closely. - NexAI"
        send_sms(patient_data['phone'], patient_msg)

def send_sos_alert(patient_id):
    """Emergency SOS - Send all alerts immediately"""
    patient = PATIENTS_DB.get(patient_id.lower())
    if not patient:
        return False
    
    # SMS to family
    family_msg = f"🆘 EMERGENCY SOS ACTIVATED by {patient['name']}! Please contact her IMMEDIATELY. Location: [GPS coordinates]. NexAI emergency team has been notified."
    send_sms(patient['family_phone'], family_msg)
    
    # SMS to doctor
    doctor_msg = f"🆘 SOS EMERGENCY: {patient['name']} pressed emergency button. Last known risk: {patient.get('last_prediction', {}).get('risk_level', 'Unknown')}. Contact immediately!"
    send_sms(patient['doctor_phone'], doctor_msg)
    
    # Email to doctor
    send_email(
        patient['doctor_email'],
        f"🆘 SOS EMERGENCY: {patient['name']}",
        f"<h1 style='color: red;'>EMERGENCY SOS ACTIVATED</h1><p>Patient {patient['name']} has pressed the emergency button. Please contact immediately.</p>"
    )
    
    # Log SOS event
    patient['alert_history'].append({
        'type': 'SOS',
        'timestamp': datetime.now().isoformat(),
        'message': 'Emergency button pressed'
    })
    
    return True

# ============================================
# STEP 7: API Endpoints
# ============================================

@app.route('/')
def home():
    return jsonify({
        'message': 'NexAI API is running!',
        'version': '2.0 - Enhanced',
        'features': {
            'websocket': True,
            'sms_alerts': TWILIO_ENABLED,
            'email_alerts': EMAIL_ENABLED,
            'sos_system': True
        },
        'endpoints': {
            'health': '/health',
            'predict': '/predict (POST)',
            'sos': '/sos/<patient_id> (POST)',
            'stream': '/stream/<patient_id> (POST)'
        }
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'twilio_enabled': TWILIO_ENABLED,
        'email_enabled': EMAIL_ENABLED
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint"""
    try:
        data = request.get_json()
        
        required_fields = ['Age', 'SystolicBP', 'DiastolicBP', 'BS', 'BodyTemp', 'HeartRate']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({'error': f'Missing fields: {missing_fields}'}), 400
        
        input_df = pd.DataFrame([data])
        input_df = input_df[feature_names]
        
        input_scaled = scaler.transform(input_df)
        prediction = model.predict(input_scaled)[0]
        prediction_proba = model.predict_proba(input_scaled)[0]
        
        risk_level = label_encoder.inverse_transform([prediction])[0]
        confidence = float(prediction_proba[prediction] * 100)
        
        subtags = get_risk_subtag(data, risk_level)
        shap_explanation = get_shap_explanation(input_df)
        
        if risk_level == 'high risk':
            recommendation = "⚠️ HIGH RISK detected. Contact doctor immediately. Consider pressing SOS if symptoms worsen."
        elif risk_level == 'mid risk':
            recommendation = "⚡ MEDIUM RISK. Schedule clinic visit within 24-48 hours. Monitor symptoms closely."
        else:
            recommendation = "✅ LOW RISK. Continue regular monitoring. Next check-up as scheduled."
        
        response = {
            'success': True,
            'risk_level': risk_level,
            'confidence': round(confidence, 1),
            'probabilities': {
                'low_risk': round(float(prediction_proba[0] * 100), 1),
                'mid_risk': round(float(prediction_proba[1] * 100), 1),
                'high_risk': round(float(prediction_proba[2] * 100), 1)
            },
            'subtags': subtags,
            'shap_explanation': shap_explanation,
            'recommendation': recommendation,
            'input_data': data,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/stream/<patient_id>', methods=['POST'])
def stream_vitals(patient_id):
    """
    Receives vitals from wearable simulator
    Stores in database and broadcasts via WebSocket
    """
    try:
        patient = PATIENTS_DB.get(patient_id.lower())
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        data = request.get_json()
        
        # Store vitals
        patient['last_vitals'] = data
        
        # Make prediction
        input_df = pd.DataFrame([data])
        input_df = input_df[feature_names]
        
        input_scaled = scaler.transform(input_df)
        prediction = model.predict(input_scaled)[0]
        prediction_proba = model.predict_proba(input_scaled)[0]
        
        risk_level = label_encoder.inverse_transform([prediction])[0]
        confidence = float(prediction_proba[prediction] * 100)
        
        subtags = get_risk_subtag(data, risk_level)
        shap_explanation = get_shap_explanation(input_df)
        
        if risk_level == 'high risk':
            recommendation = "⚠️ HIGH RISK detected. Contact doctor immediately."
        elif risk_level == 'mid risk':
            recommendation = "⚡ MEDIUM RISK. Schedule clinic visit within 24-48 hours."
        else:
            recommendation = "✅ LOW RISK. Continue regular monitoring."
        
        prediction_result = {
            'risk_level': risk_level,
            'confidence': round(confidence, 1),
            'probabilities': {
                'low_risk': round(float(prediction_proba[0] * 100), 1),
                'mid_risk': round(float(prediction_proba[1] * 100), 1),
                'high_risk': round(float(prediction_proba[2] * 100), 1)
            },
            'subtags': subtags,
            'shap_explanation': shap_explanation,
            'recommendation': recommendation
        }
        
        patient['last_prediction'] = prediction_result
        
        # Broadcast to all connected dashboards via WebSocket
        socketio.emit('vitals_update', {
            'patient_id': patient_id,
            'patient_name': patient['name'],
            'vitals': data,
            'prediction': prediction_result,
            'timestamp': datetime.now().isoformat()
        })
        
        # Send alerts if high/mid risk
        send_alerts(patient, prediction_result)
        
        return jsonify({
            'success': True,
            'patient': patient['name'],
            'prediction': prediction_result
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/sos/<patient_id>', methods=['POST'])
def emergency_sos(patient_id):
    """
    Emergency SOS button
    Sends immediate alerts to all contacts
    """
    try:
        success = send_sos_alert(patient_id)
        
        if success:
            # Broadcast SOS to all dashboards
            socketio.emit('sos_alert', {
                'patient_id': patient_id,
                'patient_name': PATIENTS_DB[patient_id.lower()]['name'],
                'timestamp': datetime.now().isoformat(),
                'message': '🆘 EMERGENCY SOS ACTIVATED'
            })
            
            return jsonify({
                'success': True,
                'message': 'SOS alerts sent to family, doctor, and emergency team',
                'notifications_sent': {
                    'sms': TWILIO_ENABLED,
                    'email': EMAIL_ENABLED
                }
            })
        else:
            return jsonify({'error': 'Patient not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/patients')
def get_patients():
    """Get all patients with their latest status"""
    patients_list = []
    for patient_id, patient in PATIENTS_DB.items():
        patients_list.append({
            'id': patient_id,
            'name': patient['name'],
            'age': patient['age'],
            'last_vitals': patient['last_vitals'],
            'last_prediction': patient['last_prediction']
        })
    return jsonify({'patients': patients_list})

# ============================================
# STEP 8: WebSocket Events
# ============================================

@socketio.on('connect')
def handle_connect():
    print('✓ Client connected')
    emit('connection_response', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print('✗ Client disconnected')

# ============================================
# STEP 9: Run Server
# ============================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Starting NexAI Enhanced API Server...")
    print("="*60)
    print("\nFeatures enabled:")
    print(f"  ✓ WebSocket real-time updates")
    print(f"  {'✓' if TWILIO_ENABLED else '✗'} SMS alerts (Twilio)")
    print(f"  {'✓' if EMAIL_ENABLED else '✗'} Email notifications")
    print(f"  ✓ SOS emergency system")
    print("\nAPI available at: http://localhost:5000")
    print("WebSocket: ws://localhost:5000")
    print("\nPress CTRL+C to stop")
    print("="*60 + "\n")
    
    # Use socketio.run instead of app.run
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
