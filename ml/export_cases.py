"""
Export a compact per-case JSON for the H-zone paradox page.

Emits public/data/cases.json with only the fields that drive the
visualisation: zone, area, sections, stages, tumour type, recurrent,
aggressive, unit. ~35 KB for all 408 cases.

Run after train.py (shares its data loader):
    python ml/export_cases.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train import load_data  # type: ignore[import-not-found]

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "cases.json"


def main() -> None:
    import pandas as pd  # noqa: PLC0415
    import numpy as np  # noqa: PLC0415

    df = load_data()
    # Also grab defect fields from the original xlsx (not in load_data())
    raw = pd.read_excel(
        Path(__file__).resolve().parent.parent.parent / "MOHS_AI_400.xlsx",
        sheet_name="Data",
    )
    df["Defect_Size_X"] = pd.to_numeric(raw["DEFECT SIZE 1 (mm)"], errors="coerce")
    df["Defect_Size_Y"] = pd.to_numeric(raw["DEFECT SIZE 2 (mm)"], errors="coerce")
    df["Defect_Area_cm2"] = (
        np.pi * (df["Defect_Size_X"] / 2) * (df["Defect_Size_Y"] / 2) / 100
    )

    zone_map = {1: "H", 2: "M", 3: "L"}
    type_map = {1: "BCC", 2: "SCC", 3: "Other"}
    cases = []
    for _, r in df.iterrows():
        zone = zone_map.get(int(r["Body_Zone"]), "?")
        ttype = type_map.get(int(r["Tumour_Stats"]), "Other")
        defect_area = (
            None
            if pd.isna(r["Defect_Area_cm2"])
            else round(float(r["Defect_Area_cm2"]), 3)
        )
        cases.append({
            "zone": zone,
            "area": round(float(r["Tumour_Area_cm2"]), 3),
            "sizeX": round(float(r["Tumour_Size_X"]), 2),
            "sizeY": round(float(r["Tumour_Size_Y"]), 2),
            "sections": int(r["Sections"]),
            "stages": int(r["Stages"]),
            "type": ttype,
            "recurrent": bool(int(r["Recurrent"]) == 1),
            "aggressive": bool(int(r["Aggressive_Histopathology"]) == 1),
            "unit": str(r["Unit"]),
            "age": int(r["Age"]),
            "sex": "M" if int(r["Sex"]) == 1 else "F",
            "defectArea": defect_area,
        })
    OUT.write_text(json.dumps(cases))
    kb = OUT.stat().st_size / 1024
    print(f"Wrote {len(cases)} cases → {OUT} ({kb:.1f} KB)")

    # Per-zone rollup for the summary cards
    rollup_path = ROOT / "public" / "data" / "zones.json"
    rollup: dict[str, dict] = {}
    for z in ("H", "M", "L"):
        zc = [c for c in cases if c["zone"] == z]
        if not zc:
            continue
        n = len(zc)
        mean_sections = sum(c["sections"] for c in zc) / n
        mean_area = sum(c["area"] for c in zc) / n
        mean_stages = sum(c["stages"] for c in zc) / n
        pct_ge13 = sum(1 for c in zc if c["sections"] >= 13) / n * 100
        sections_per_stage = (
            sum(c["sections"] / max(c["stages"], 1) for c in zc) / n
        )
        rollup[z] = {
            "n": n,
            "meanSections": round(mean_sections, 2),
            "meanAreaCm2": round(mean_area, 2),
            "meanStages": round(mean_stages, 2),
            "pctGe13": round(pct_ge13, 1),
            "sectionsPerStage": round(sections_per_stage, 2),
        }
    rollup_path.write_text(json.dumps(rollup, indent=2))
    print(f"Wrote zone rollup → {rollup_path}")


if __name__ == "__main__":
    main()
