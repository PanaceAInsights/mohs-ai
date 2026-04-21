"""
Fit a simple linear regression predicting defect area (cm²) from tumour
area and stage count. Emits public/data/defect_model.json with the
coefficients + cohort reference stats for the defect estimator tool.

Defect(cm²) ≈ α + β · tumour_area + γ · stages

Run after ml/train.py:
    python ml/export_defect.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train import load_data  # type: ignore[import-not-found]

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "defect_model.json"
RAW_FILE = ROOT.parent / "MOHS_AI_400.xlsx"


def main() -> None:
    df = load_data()
    raw = pd.read_excel(RAW_FILE, sheet_name="Data")
    defect_x = pd.to_numeric(raw["DEFECT SIZE 1 (mm)"], errors="coerce")
    defect_y = pd.to_numeric(raw["DEFECT SIZE 2 (mm)"], errors="coerce")
    df["defect_area"] = (np.pi * (defect_x / 2) * (defect_y / 2)) / 100

    clean = df[["Tumour_Area_cm2", "Stages", "defect_area"]].dropna()
    X = clean[["Tumour_Area_cm2", "Stages"]].to_numpy()
    y = clean["defect_area"].to_numpy()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

    model = LinearRegression().fit(Xtr, ytr)
    pred = model.predict(Xte)
    mae = mean_absolute_error(yte, pred)
    r2 = r2_score(yte, pred)
    print(f"Defect regressor: R² = {r2:.3f}, MAE = {mae:.2f} cm²")

    export = {
        "model": "LinearRegression",
        "intercept": float(model.intercept_),
        "coef_tumour_area": float(model.coef_[0]),
        "coef_stages": float(model.coef_[1]),
        "metrics": {
            "r2": round(float(r2), 3),
            "mae": round(float(mae), 3),
            "n_train": int(len(Xtr)),
            "n_test": int(len(Xte)),
        },
        "notes":
            "defect_area(cm²) ≈ intercept + coef_tumour_area·tumour_area + coef_stages·stages. "
            "Tumour area uses the ellipse formula (π × X/2 × Y/2) and must be in cm². "
            "Serves clinical planning estimates only; actual defect is surgery-dependent.",
    }
    OUT.write_text(json.dumps(export, indent=2))
    print(f"Saved → {OUT}")


if __name__ == "__main__":
    main()
