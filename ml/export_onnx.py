"""
Convert the shipping stacking pipeline → ONNX, so inference runs client-side
with onnxruntime-web. Removes the Python Vercel Function entirely.

Run after `ml/train.py`:
    python ml/export_onnx.py
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType, StringTensorType

ROOT = Path(__file__).resolve().parent.parent
SHIP_MODEL = ROOT / "ml" / "artifacts" / "stacking_ship.joblib"
OUT_ONNX = ROOT / "public" / "data" / "stacking.onnx"
OUT_META = ROOT / "public" / "data" / "model_meta.json"
DATA_FILE = ROOT.parent / "MOHS_AI_400.xlsx"

NUM_FEATURES = ["Age", "Tumour_Size_X", "Tumour_Size_Y", "Tumour_Area_cm2"]
CAT_FEATURES = [
    "Sex", "See_Do", "Experience", "Recurrent",
    "Tumour_Stats", "Body_Site", "Body_Zone", "Laterality", "Unit",
    "Aggressive_Histopathology", "Biopsy", "Smoking",
]


def main() -> None:
    print(f"Loading model: {SHIP_MODEL}")
    model = joblib.load(SHIP_MODEL)

    # Build type signature — one ONNX input per dataframe column.
    # Numeric cols → float32, categoricals → string (ONNX supports this via OHE).
    initial_types: list[tuple[str, object]] = []
    for col in NUM_FEATURES:
        initial_types.append((col, FloatTensorType([None, 1])))
    for col in CAT_FEATURES:
        initial_types.append((col, StringTensorType([None, 1])))

    print("Converting to ONNX…")
    onx = convert_sklearn(
        model,
        initial_types=initial_types,
        target_opset=17,
        options={id(model): {"zipmap": False}},  # plain float output, no zipmap
    )

    OUT_ONNX.parent.mkdir(parents=True, exist_ok=True)
    OUT_ONNX.write_bytes(onx.SerializeToString())
    size_mb = OUT_ONNX.stat().st_size / (1024 * 1024)
    print(f"Saved ONNX → {OUT_ONNX} ({size_mb:.1f} MB)")

    # Meta: the browser needs to know input names, plus the unit/category
    # vocabularies it can show in the form.
    # Read raw data for categorical vocabularies
    df = pd.read_excel(DATA_FILE, sheet_name="Data")
    df_col_map = {
        "SEX": "Sex", "SEE & DO": "See_Do",
        "EXPERIENCE (>5YR OR 1500 CASES)": "Experience",
        "Recurrent": "Recurrent", "TUMOUR STATS": "Tumour_Stats",
        "BODY SITE 1": "Body_Site", "BODY ZONES": "Body_Zone",
        "LATERALITY": "Laterality", "Unit": "Unit",
        "AGGRESSIVE HISTO": "Aggressive_Histopathology",
        "Biopsy": "Biopsy", "Smoking": "Smoking",
    }
    df = df.rename(columns=df_col_map)
    top_units = df["Unit"].value_counts().head(8).index.tolist()
    df["Unit"] = df["Unit"].where(df["Unit"].isin(top_units), other="OTHER")

    vocab: dict[str, list[str]] = {}
    for c in CAT_FEATURES:
        vocab[c] = sorted({str(v) for v in df[c].dropna().unique()})

    meta = {
        "numericFeatures": NUM_FEATURES,
        "categoricalFeatures": CAT_FEATURES,
        "vocabulary": vocab,
        "onnxOpset": 17,
    }
    OUT_META.write_text(json.dumps(meta, indent=2))
    print(f"Saved meta → {OUT_META}")

    # Quick verification — compare an ONNX prediction to the sklearn prediction
    sample = pd.DataFrame([{
        "Age": 72.0, "Tumour_Size_X": 18.0, "Tumour_Size_Y": 15.0,
        "Tumour_Area_cm2": 2.12,
        "Sex": "1", "See_Do": "1", "Experience": "1", "Recurrent": "1",
        "Tumour_Stats": "1", "Body_Site": "1", "Body_Zone": "1",
        "Laterality": "3", "Unit": "NOSE",
        "Aggressive_Histopathology": "1", "Biopsy": "1", "Smoking": "0",
    }])[NUM_FEATURES + CAT_FEATURES]
    sk_prob = float(model.predict_proba(sample)[0, 1])

    import onnxruntime as ort  # noqa: PLC0415
    sess = ort.InferenceSession(str(OUT_ONNX), providers=["CPUExecutionProvider"])
    inputs: dict = {}
    for col in NUM_FEATURES:
        inputs[col] = np.array([[float(sample[col].iloc[0])]], dtype=np.float32)
    for col in CAT_FEATURES:
        inputs[col] = np.array([[str(sample[col].iloc[0])]], dtype=object)
    out = sess.run(None, inputs)
    # Output 0 = labels, Output 1 = probabilities
    onnx_prob = float(np.asarray(out[1]).reshape(-1, 2)[0, 1])
    print(f"sklearn prob = {sk_prob:.4f}")
    print(f"ONNX   prob = {onnx_prob:.4f}")
    assert abs(sk_prob - onnx_prob) < 1e-3, "ONNX prob diverged from sklearn"
    print("✓ ONNX prediction matches sklearn within 1e-3")


if __name__ == "__main__":
    main()
