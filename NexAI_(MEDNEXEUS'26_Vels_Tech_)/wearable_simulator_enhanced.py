"""
NexAI Wearable Simulator - ENHANCED
Automatically streams vitals to API in real-time
Supports multiple patients simultaneously
"""

import time
import random
import requests
import json
from datetime import datetime
import threading

# API endpoint
API_URL = "http://localhost:5000"

# Patient profiles
PATIENTS = {
    "kavitha": {
        "base_vitals": {
            "Age": 26,
            "SystolicBP": 145,
            "DiastolicBP": 92,
            "BS": 7.0,
            "BodyTemp": 98.0,
            "HeartRate": 80
        },
        "risk_type": "high"
    },
    "priya": {
        "base_vitals": {
            "Age": 28,
            "SystolicBP": 120,
            "DiastolicBP": 80,
            "BS": 6.0,
            "BodyTemp": 98.6,
            "HeartRate": 75
        },
        "risk_type": "low"
    },
    "lakshmi": {
        "base_vitals": {
            "Age": 35,
            "SystolicBP": 135,
            "DiastolicBP": 88,
            "BS": 8.5,
            "BodyTemp": 98.2,
            "HeartRate": 88
        },
        "risk_type": "mid"
    }
}

def add_realistic_variation(value, variation_percent=5):
    """Add small random variation to simulate real sensor readings"""
    variation = value * (variation_percent / 100)
    return value + random.uniform(-variation, variation)

def generate_vitals(patient_name):
    """Generate realistic vitals for a patient with small variations"""
    base = PATIENTS[patient_name]["base_vitals"]
    
    vitals = {
        "Age": base["Age"],
        "SystolicBP": round(add_realistic_variation(base["SystolicBP"], 3)),
        "DiastolicBP": round(add_realistic_variation(base["DiastolicBP"], 3)),
        "BS": round(add_realistic_variation(base["BS"], 5), 1),
        "BodyTemp": round(add_realistic_variation(base["BodyTemp"], 1), 1),
        "HeartRate": round(add_realistic_variation(base["HeartRate"], 5))
    }
    
    return vitals

def send_to_stream_api(patient_id, vitals):
    """Send vitals to the new /stream endpoint"""
    try:
        response = requests.post(
            f"{API_URL}/stream/{patient_id}",
            json=vitals,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            return result
        else:
            print(f"❌ API Error: {response.status_code}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure Flask is running!")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def display_reading(patient_name, vitals, prediction):
    """Display the reading"""
    print("\n" + "="*70)
    print(f"📱 WEARABLE: {patient_name.capitalize()}'s Monitor")
    print(f"🕐 {datetime.now().strftime('%I:%M:%S %p')}")
    print("="*70)
    
    print("\n📊 VITALS CAPTURED:")
    print(f"  BP: {vitals['SystolicBP']}/{vitals['DiastolicBP']} | BS: {vitals['BS']} | HR: {vitals['HeartRate']} | Temp: {vitals['BodyTemp']}°F")
    
    if prediction and prediction.get('success'):
        pred = prediction['prediction']
        risk = pred['risk_level'].upper()
        
        icon = "🔴" if risk == "HIGH RISK" else "🟡" if risk == "MID RISK" else "🟢"
        
        print(f"\n🤖 AI: {icon} {risk} ({pred['confidence']}%)")
        if pred.get('subtags'):
            print(f"⚠️  {', '.join(pred['subtags'])}")
    
    print("="*70)

def stream_patient(patient_id, interval=10, duration=None):
    """
    Stream one patient's vitals continuously
    duration: Total seconds to run (None = infinite)
    """
    print(f"\n🔵 Starting stream for {patient_id.capitalize()}...")
    print(f"📡 Sending vitals every {interval} seconds")
    if duration:
        print(f"⏱️  Will run for {duration} seconds")
    print("Press Ctrl+C to stop\n")
    
    start_time = time.time()
    reading_count = 0
    
    try:
        while True:
            # Check duration limit
            if duration and (time.time() - start_time) >= duration:
                print(f"\n✓ Duration limit reached ({duration}s)")
                break
            
            reading_count += 1
            
            # Generate and send vitals
            vitals = generate_vitals(patient_id)
            prediction = send_to_stream_api(patient_id, vitals)
            
            # Display
            display_reading(patient_id, vitals, prediction)
            
            # Wait
            print(f"⏳ Next reading in {interval}s... (#{reading_count})")
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print(f"\n\n✅ Stopped streaming {patient_id}")
        print(f"Total readings: {reading_count}")

def stream_all_patients_parallel(interval=15, duration=None):
    """
    Stream ALL patients simultaneously using threads
    Each patient sends data independently
    """
    print("\n🔵 Starting MULTI-PATIENT PARALLEL STREAM...")
    print(f"📡 Each patient sends vitals every {interval} seconds")
    if duration:
        print(f"⏱️  Will run for {duration} seconds")
    print("Press Ctrl+C to stop\n")
    
    threads = []
    
    # Start a thread for each patient
    for patient_id in PATIENTS.keys():
        thread = threading.Thread(
            target=stream_patient,
            args=(patient_id, interval, duration),
            daemon=True
        )
        thread.start()
        threads.append(thread)
        time.sleep(1)  # Stagger starts slightly
    
    # Wait for all threads or Ctrl+C
    try:
        for thread in threads:
            thread.join()
    except KeyboardInterrupt:
        print("\n\n✅ Stopped all streams")

def demo_mode():
    """Quick demo - one reading per patient"""
    print("\n🎬 DEMO MODE: Sending one reading per patient...\n")
    
    for patient_id in PATIENTS.keys():
        vitals = generate_vitals(patient_id)
        prediction = send_to_stream_api(patient_id, vitals)
        display_reading(patient_id, vitals, prediction)
        time.sleep(2)
    
    print("\n✅ Demo complete!")

def continuous_demo(interval=10, duration=120):
    """
    Continuous demo mode - all patients streaming
    Perfect for showing judges
    """
    print("\n🎬 CONTINUOUS DEMO MODE")
    print(f"⏱️  Will run for {duration} seconds ({duration//60} minutes)")
    print(f"📡 All 3 patients streaming every {interval} seconds")
    print("\nThis simulates real wearable devices sending data continuously!")
    print("Dashboards will auto-update in real-time.\n")
    
    stream_all_patients_parallel(interval=interval, duration=duration)

# ============================================
# MAIN MENU
# ============================================

def main():
    print("="*70)
    print("         🏥 NexAI WEARABLE SIMULATOR - ENHANCED 🏥")
    print("="*70)
    print("\nChoose mode:")
    print("\n1. 👤 Single Patient Stream (Kavitha)")
    print("2. 👤 Single Patient Stream (Priya)")
    print("3. 👤 Single Patient Stream (Lakshmi)")
    print("4. 👥 ALL Patients Parallel Stream (Best for demo!)")
    print("5. 🎬 Quick Demo (One reading per patient)")
    print("6. 🎥 Continuous Demo (2 minutes, perfect for judges)")
    print("7. ❌ Exit")
    
    choice = input("\nEnter choice (1-7): ").strip()
    
    if choice == "1":
        interval = int(input("Interval in seconds (default 10): ") or "10")
        stream_patient("kavitha", interval)
    elif choice == "2":
        interval = int(input("Interval in seconds (default 10): ") or "10")
        stream_patient("priya", interval)
    elif choice == "3":
        interval = int(input("Interval in seconds (default 10): ") or "10")
        stream_patient("lakshmi", interval)
    elif choice == "4":
        interval = int(input("Interval in seconds (default 15): ") or "15")
        duration = input("Duration in seconds (blank = infinite): ").strip()
        duration = int(duration) if duration else None
        stream_all_patients_parallel(interval, duration)
    elif choice == "5":
        demo_mode()
    elif choice == "6":
        continuous_demo()
    elif choice == "7":
        print("\n👋 Goodbye!")
    else:
        print("\n❌ Invalid choice!")

if __name__ == "__main__":
    main()
