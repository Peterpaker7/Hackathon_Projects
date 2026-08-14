import joblib

# Load label encoder
label_encoder = joblib.load('nexai_label_encoder.pkl')

print("Label Encoder Classes:")
for i, label in enumerate(label_encoder.classes_):
    print(f"  Index {i}: {label}")

# This will show if:
# 0 = high risk
# 1 = low risk  
# 2 = mid risk
# OR some other order
