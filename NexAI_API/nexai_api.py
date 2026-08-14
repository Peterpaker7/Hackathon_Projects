"""
NexAI Flask API
Serves the ML model via REST endpoints
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import shap
import warnings

warnings.filterwarnings('ignore')

# ============================================
# STEP 1: Initialize Flask App
# ============================================
app = Flask(__name__)
CORS(app)

# ============================================
# STEP 2: Load Saved Model Components
# ============================================
print("Loading NexAI model components...")

try:
    model = joblib.load('nexai_model.pkl')
    print("✓ Model loaded")

    scaler = joblib.load('nexai_scaler.pkl')
    print("✓ Scaler loaded")

    label_encoder = joblib.load('nexai_label_encoder.pkl')
    print("✓ Label encoder loaded")
    print("Class order:", label_encoder.classes_)

    feature_names = joblib.load('nexai_features.pkl')
    print("✓ Feature names loaded")

    explainer = shap.TreeExplainer(model)
    print("✓ SHAP explainer initialized")

    print("\n✅ NexAI API ready!")

except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("Run training script first.")

# ============================================
# Helper Functions
# ============================================

def get_risk_subtag(data, risk_level):
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
        print("SHAP error:", e)
        return []


def map_probabilities(prediction_proba):
    """
    Maps model probabilities to correct class labels
    using label encoder class order.
    """
    classes = label_encoder.classes_

    return {
        classes[i].replace(" ", "_"): round(float(prediction_proba[i] * 100), 1)
        for i in range(len(classes))
    }

# ============================================
# Routes
# ============================================

@app.route('/')
def home():
    return jsonify({
        'message': 'NexAI API running',
        'version': '1.0'
    })


@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    })


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()

        required_fields = [
            'Age', 'SystolicBP', 'DiastolicBP',
            'BS', 'BodyTemp', 'HeartRate'
        ]

        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({'error': f'Missing fields: {missing}'}), 400

        input_df = pd.DataFrame([data])
        input_df = input_df[feature_names]

        input_scaled = scaler.transform(input_df)

        prediction = model.predict(input_scaled)[0]
        prediction_proba = model.predict_proba(input_scaled)[0]

        risk_level = label_encoder.inverse_transform([prediction])[0]
        confidence = float(prediction_proba[prediction] * 100)

        subtags = get_risk_subtag(data, risk_level)
        shap_explanation = get_shap_explanation(input_df)

        probabilities = map_probabilities(prediction_proba)

        if risk_level == 'high risk':
            recommendation = "⚠️ HIGH RISK detected. Contact doctor immediately."
        elif risk_level == 'mid risk':
            recommendation = "⚡ MEDIUM RISK. Schedule checkup soon."
        else:
            recommendation = "✅ LOW RISK. Continue monitoring."

        response = {
            'success': True,
            'risk_level': risk_level,
            'confidence': round(confidence, 1),
            'probabilities': probabilities,
            'subtags': subtags,
            'shap_explanation': shap_explanation,
            'recommendation': recommendation,
            'input_data': data
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/test-kavitha')
def test_kavitha():
    kavitha_data = {
        'Age': 26,
        'SystolicBP': 145,
        'DiastolicBP': 92,
        'BS': 7.0,
        'BodyTemp': 98.0,
        'HeartRate': 80
    }

    input_df = pd.DataFrame([kavitha_data])
    input_df = input_df[feature_names]

    input_scaled = scaler.transform(input_df)
    prediction = model.predict(input_scaled)[0]
    prediction_proba = model.predict_proba(input_scaled)[0]

    risk_level = label_encoder.inverse_transform([prediction])[0]
    confidence = float(prediction_proba[prediction] * 100)

    probabilities = map_probabilities(prediction_proba)
    subtags = get_risk_subtag(kavitha_data, risk_level)
    shap_explanation = get_shap_explanation(input_df)

    return jsonify({
        'scenario': 'Jaya Keerthana demo case',
        'input': kavitha_data,
        'prediction': {
            'risk_level': risk_level,
            'confidence': round(confidence, 1),
            'probabilities': probabilities,
            'subtags': subtags,
            'shap_explanation': shap_explanation
        }
    })


# ============================================
# Run Server
# ============================================

if __name__ == '__main__':
    print("\nStarting NexAI Flask API...")
    app.run(debug=True, host='0.0.0.0', port=5000)

