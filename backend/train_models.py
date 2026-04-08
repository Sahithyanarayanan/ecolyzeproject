import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

# ==============================
# STEP 1: LOAD DATASET
# ==============================
df = pd.read_excel("final_dataset.xlsx")

print("✅ Dataset Loaded Successfully")
print("Shape:", df.shape)

# ==============================
# STEP 2: PREPARE DATA
# ==============================
X = df.drop(columns=["Folder", "Label"])
y = df["Label"]

# ==============================
# STEP 3: NORMALIZATION CHECK
# ==============================
row_sums = X.sum(axis=1)

if not np.allclose(row_sums, 1, atol=1e-3):
    print("⚠️ Data not normalized. Applying normalization...")
    X = X.div(X.sum(axis=1).replace(0, 1), axis=0)
else:
    print("✅ Data already normalized")

# ==============================
# STEP 4: TRAIN-TEST SPLIT
# ==============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("✅ Data Split Done")

# ==============================
# STEP 5: FEATURE SCALING
# ==============================
scaler = StandardScaler()

X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

print("✅ Scaling Applied")

# ==============================
# STEP 6: TRAIN MODEL
# ==============================
model = XGBClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss'
)

model.fit(X_train, y_train)

print("✅ Model Training Completed")

# ==============================
# STEP 7: PREDICTION
# ==============================
y_pred = model.predict(X_test)

# ==============================
# STEP 8: EVALUATION
# ==============================
accuracy = accuracy_score(y_test, y_pred)

print("\n🎯 MODEL PERFORMANCE")
print(f"Accuracy: {accuracy:.4f}")

print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred))

print("\n📉 Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# ==============================
# STEP 9: SAVE MODEL & SCALER
# ==============================
joblib.dump(model, "model.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(X.columns.tolist(), "features.pkl")

print("\n✅ Model saved as model.pkl")
print("✅ Scaler saved as scaler.pkl")
print("✅ Features saved as features.pkl")

# ==============================
# STEP 10: SAMPLE TEST (COMBINED)
# ==============================
sample = pd.DataFrame([X.iloc[0]], columns=X.columns)
sample_scaled = scaler.transform(sample)

pred = model.predict(sample_scaled)
prob = model.predict_proba(sample_scaled)

print("\n🔍 Sample Prediction:", "Disease" if pred[0] == 1 else "Normal")
print("Confidence:", prob)