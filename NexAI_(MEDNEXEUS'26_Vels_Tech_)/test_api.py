"""
Test script for NexAI API
Run this AFTER starting the Flask server
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:5000"

print("="*60)
print("NexAI API Test Script")
print("="*60)

# ============================================
# TEST 1: Health Check
# ============================================
print("\n[TEST 1] Health Check")
print("-" * 40)

try:
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"❌ Error: {e}")
    print("Make sure Flask server is running!")
    exit()

# ============================================
# TEST 2: Kavitha's Scenario
# ============================================
print("\n[TEST 2] Jaya Keerthana's Scenario")
print("-" * 40)

try:
    response = requests.get(f"{BASE_URL}/test-kavitha")
    result = response.json()
    print(f"Status Code: {response.status_code}")
    print(f"\nScenario: {result['scenario']}")
    print(f"\nInput Data:")
    print(json.dumps(result['input'], indent=2))
    print(f"\nPrediction:")
    print(f"  Risk Level: {result['prediction']['risk_level'].upper()}")
    print(f"  Confidence: {result['prediction']['confidence']}%")
    print(f"  Subtags: {', '.join(result['prediction']['subtags'])}")
    print(f"\nSHAP Explanation (Top 3 Features):")
    for item in result['prediction']['shap_explanation']:
        print(f"  {item['feature']}: {item['contribution']}% contribution")
except Exception as e:
    print(f"❌ Error: {e}")

# ============================================
# TEST 3: Custom Prediction (Normal Case)
# ============================================
print("\n[TEST 3] Normal Healthy Patient")
print("-" * 40)

normal_patient = {
    "Age": 28,
    "SystolicBP": 120,
    "DiastolicBP": 80,
    "BS": 6.0,
    "BodyTemp": 98.6,
    "HeartRate": 75
}

try:
    response = requests.post(
        f"{BASE_URL}/predict",
        json=normal_patient,
        headers={'Content-Type': 'application/json'}
    )
    result = response.json()
    
    print(f"Status Code: {response.status_code}")
    print(f"\nInput: Normal healthy 28-year-old")
    print(f"\nPrediction:")
    print(f"  Risk Level: {result['risk_level'].upper()}")
    print(f"  Confidence: {result['confidence']}%")
    print(f"  Recommendation: {result['recommendation']}")
    print(f"\nProbabilities:")
    print(f"  Low Risk: {result['probabilities']['low_risk']}%")
    print(f"  Mid Risk: {result['probabilities']['mid_risk']}%")
    print(f"  High Risk: {result['probabilities']['high_risk']}%")
except Exception as e:
    print(f"❌ Error: {e}")

# ============================================
# TEST 4: High Risk Case
# ============================================
print("\n[TEST 4] High Risk Patient")
print("-" * 40)

high_risk_patient = {
    "Age": 40,
    "SystolicBP": 160,
    "DiastolicBP": 100,
    "BS": 9.5,
    "BodyTemp": 99.0,
    "HeartRate": 105
}

try:
    response = requests.post(
        f"{BASE_URL}/predict",
        json=high_risk_patient,
        headers={'Content-Type': 'application/json'}
    )
    result = response.json()
    
    print(f"Status Code: {response.status_code}")
    print(f"\nInput: 40-year-old with high BP and glucose")
    print(f"\nPrediction:")
    print(f"  Risk Level: {result['risk_level'].upper()}")
    print(f"  Confidence: {result['confidence']}%")
    print(f"  Subtags: {', '.join(result['subtags'])}")
    print(f"  Recommendation: {result['recommendation']}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*60)
print("✅ All API tests complete!")
print("="*60)
