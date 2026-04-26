"""
Export a Calibrated Logistic Regression pipeline as ~10 KB of JSON.

The browser will:
  1. Z-score numeric features with the saved mean/sd
  2. One-hot encode categoricals against the saved vocabulary
  3. Compute logit = dot(weights, x) + bias
  4. Apply Platt scaling (if calibrated) or plain sigmoid

Run after ml/train.py:
    python ml/export_linear.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train import (
    CAT_FEATURES,
    FEATURES,
    NUM_FEATURES,
    RANDOM_STATE,
    TEST_SIZE,
    load_data,
    stringify_categoricals,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "lr_model.json"


def main() -> None:
    df = load_data()
    X = stringify_categoricals(df[FEATURES])
    y = df["target_ge13"].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )

    prep = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUM_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CAT_FEATURES,
            ),
        ],
    )
    # Strong L2 regularisation (C=0.3) to prevent the per-category
    # OneHotEncoded features from over-fitting in a small (n=408) cohort.
    base = LogisticRegression(C=0.3, max_iter=2000, random_state=RANDOM_STATE)
    pipe = Pipeline([("prep", prep), ("clf", base)])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_auc = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=1)
    pipe.fit(X_train, y_train)
    test_auc = roc_auc_score(y_test, pipe.predict_proba(X_test)[:, 1])
    print(f"Logistic regression CV AUC {cv_auc.mean():.3f}±{cv_auc.std():.3f} | "
          f"test AUC {test_auc:.3f}")

    # Pull out fitted parts
    prep_fit: ColumnTransformer = pipe.named_steps["prep"]
    scaler: StandardScaler = prep_fit.named_transformers_["num"]
    ohe: OneHotEncoder = prep_fit.named_transformers_["cat"]
    lr: LogisticRegression = pipe.named_steps["clf"]

    numeric = {
        feat: {"mean": float(scaler.mean_[i]), "sd": float(scaler.scale_[i])}
        for i, feat in enumerate(NUM_FEATURES)
    }
    categorical = {
        feat: [str(c) for c in cats]
        for feat, cats in zip(CAT_FEATURES, ohe.categories_)
    }
    feature_names = prep_fit.get_feature_names_out().tolist()

    export = {
        "schemaVersion": 1,
        "model": "LogisticRegression",
        "metrics": {
            "cv_auc_mean": round(float(cv_auc.mean()), 3),
            "cv_auc_sd": round(float(cv_auc.std()), 3),
            "test_auc": round(float(test_auc), 3),
        },
        "numericFeatures": NUM_FEATURES,
        "categoricalFeatures": CAT_FEATURES,
        "numeric": numeric,
        "categorical": categorical,
        "featureNames": feature_names,
        "weights": [round(float(w), 6) for w in lr.coef_[0]],
        "intercept": round(float(lr.intercept_[0]), 6),
        "manuscriptThresholdCm2": 1.5,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(export, indent=2))
    kb = OUT.stat().st_size / 1024
    print(f"Saved → {OUT} ({kb:.1f} KB)")

    # Sanity check: a sample patient
    sample = pd.DataFrame([{
        "Age": 72.0, "Tumour_Size_X": 18.0, "Tumour_Size_Y": 15.0,
        "Tumour_Area_cm2": np.pi * 18 / 2 * 15 / 2 / 100,
        "Sex": "1", "See_Do": "1", "Experience": "1", "Recurrent": "1",
        "Tumour_Stats": "1", "Body_Site": "1", "Body_Zone": "1",
        "Laterality": "3", "Unit": "NOSE",
        "Aggressive_Histopathology": "1", "Biopsy": "1", "Smoking": "0",
    }])[FEATURES]
    sample = stringify_categoricals(sample)
    p = float(pipe.predict_proba(sample)[0, 1])
    print(f"Sample (72yo M, recurrent BCC nose, aggressive, 18×15 mm) → P(≥13) = {p:.3f}")


if __name__ == "__main__":
    main()
