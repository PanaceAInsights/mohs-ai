"""
Generate the chart PNGs embedded in the ASD slide deck.
Runs after ml/train.py + ml/export_cases.py have produced the JSON
artefacts under public/data/.

    python slides/make_figures.py
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib as mpl
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
OUT = Path(__file__).resolve().parent / "figures"
OUT.mkdir(parents=True, exist_ok=True)

# Brand palette — matches the app
COL_BG = "#0A1418"
COL_CARD = "#162028"
COL_FG = "#F4F8FA"
COL_MUTED = "#7E8B95"
COL_PRIMARY = "#3FC1CB"   # teal
COL_ACCENT = "#E0A95B"    # amber
COL_DESTRUCTIVE = "#E37962"  # coral

mpl.rcParams.update({
    "axes.facecolor": COL_BG,
    "figure.facecolor": COL_BG,
    "savefig.facecolor": COL_BG,
    "axes.edgecolor": COL_MUTED,
    "axes.labelcolor": COL_FG,
    "xtick.color": COL_MUTED,
    "ytick.color": COL_MUTED,
    "text.color": COL_FG,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "font.size": 11,
    "font.family": "DejaVu Sans",
})


def load(name: str):
    return json.loads((DATA / name).read_text())


# ---------------------------------------------------------------
# Fig 1 — Section count distribution
# ---------------------------------------------------------------
def fig_section_distribution() -> None:
    cases = load("cases.json")
    sections = [c["sections"] for c in cases]
    fig, ax = plt.subplots(figsize=(9, 4.5))
    bins = np.arange(0, max(sections) + 2) - 0.5
    counts, edges = np.histogram(sections, bins=bins)
    centres = (edges[:-1] + edges[1:]) / 2
    colors = [COL_PRIMARY if c < 13 else COL_DESTRUCTIVE for c in centres]
    ax.bar(centres, counts, width=0.9, color=colors, edgecolor="none")
    ax.axvline(12.5, color=COL_ACCENT, ls="--", lw=1.6, alpha=0.85)
    ax.text(13.2, ax.get_ylim()[1] * 0.92, "≥ 13 sections\n(MBS 31002 cut-off)",
            color=COL_ACCENT, fontsize=10, va="top")
    ax.set_xlabel("Sections per case")
    ax.set_ylabel("Number of cases")
    ax.set_title("Section count distribution · n = 408",
                 color=COL_FG, fontsize=14, pad=12, loc="left")
    ax.set_xlim(-0.5, 42)
    fig.tight_layout()
    fig.savefig(OUT / "section_distribution.png", dpi=180)
    plt.close(fig)
    print("✓ section_distribution.png")


# ---------------------------------------------------------------
# Fig 2 — Top SHAP importances
# ---------------------------------------------------------------
def fig_shap_importance() -> None:
    shap = load("shap.json")
    rows = shap["summary"]["importance"][:8]
    labels_map = {
        "Tumour_Area_cm2": "Tumour area (ellipse)",
        "Tumour_Size_X": "Tumour width",
        "Tumour_Size_Y": "Tumour height",
        "Unit": "Anatomical unit",
        "Recurrent": "Recurrence status",
        "Aggressive": "Aggressive histo",
        "Aggressive_Histopathology": "Aggressive histo",
        "Age": "Patient age",
        "Body": "Body zone",
        "Body_Zone": "Body zone",
        "Tumour_Stats": "Tumour type",
    }
    labels = [labels_map.get(r["feature"], r["feature"]) for r in rows]
    values = [r["value"] for r in rows]

    fig, ax = plt.subplots(figsize=(9, 4.6))
    y = np.arange(len(labels))[::-1]
    bars = ax.barh(y, values, color=COL_PRIMARY, edgecolor="none")
    bars[0].set_color(COL_ACCENT)  # highlight tumour area
    ax.set_yticks(y, labels, color=COL_FG)
    ax.set_xlabel("Mean |SHAP|")
    ax.set_title("Tumour area dominates · 0.094 mean |SHAP|",
                 color=COL_FG, fontsize=14, pad=12, loc="left")
    for spine in ("left",):
        ax.spines[spine].set_color(COL_MUTED)
    for i, v in enumerate(values):
        ax.text(v + 0.002, y[i], f"{v:.3f}", color=COL_MUTED,
                fontsize=10, va="center")
    fig.tight_layout()
    fig.savefig(OUT / "shap_importance.png", dpi=180)
    plt.close(fig)
    print("✓ shap_importance.png")


# ---------------------------------------------------------------
# Fig 3 — H-zone paradox scatter
# ---------------------------------------------------------------
def fig_hzone_scatter() -> None:
    cases = load("cases.json")
    fig, ax = plt.subplots(figsize=(9, 5.0))
    color_map = {"H": COL_PRIMARY, "M": COL_ACCENT, "L": COL_DESTRUCTIVE}
    label_map = {"H": "H-zone (high-risk)", "M": "M-zone", "L": "L-zone"}
    for zone in ("H", "M", "L"):
        subset = [c for c in cases if c["zone"] == zone and c["area"] > 0]
        ax.scatter(
            [c["area"] for c in subset],
            [c["sections"] for c in subset],
            c=color_map[zone],
            s=22,
            alpha=0.8,
            edgecolors="none",
            label=f"{label_map[zone]}  (n={len(subset)})",
        )
    ax.axhline(13, color=COL_FG, ls="--", lw=1.4, alpha=0.7)
    ax.text(0.06, 13.3, "≥13 sections", color=COL_FG, fontsize=10)
    ax.set_xscale("log")
    ax.set_xlim(0.05, 60)
    ax.set_ylim(0, 42)
    ax.set_xlabel("Tumour area (cm², log scale)")
    ax.set_ylabel("Sections")
    ax.set_title("L-zone tumours are larger and need more sections",
                 color=COL_FG, fontsize=14, pad=12, loc="left")
    leg = ax.legend(loc="upper left", frameon=False, fontsize=10)
    for txt in leg.get_texts():
        txt.set_color(COL_FG)
    fig.tight_layout()
    fig.savefig(OUT / "hzone_scatter.png", dpi=180)
    plt.close(fig)
    print("✓ hzone_scatter.png")


# ---------------------------------------------------------------
# Fig 4 — Tumour area dependence with 1.5 cm² threshold
# ---------------------------------------------------------------
def fig_dependence_threshold() -> None:
    cases = load("cases.json")
    shap = load("shap.json")["cases"]
    # We have SHAP for tumour area only on the 20 test cases;
    # combine with cohort scatter (sections vs area) for visual context.
    fig, ax = plt.subplots(figsize=(9, 5))
    areas = [c["area"] for c in cases if c["area"] > 0]
    sections = [c["sections"] for c in cases if c["area"] > 0]
    # Density of sections per area bucket — show the relationship
    ax.scatter(areas, sections, s=18, alpha=0.4, color=COL_PRIMARY, edgecolors="none")
    ax.axvline(1.5, color=COL_ACCENT, ls="--", lw=2)
    ax.axhline(13, color=COL_FG, ls=":", lw=1.2, alpha=0.6)
    ax.text(1.65, 36, "1.5 cm² threshold\n(SHAP-derived clinical cut-off)",
            color=COL_ACCENT, fontsize=10, va="top")
    ax.set_xscale("log")
    ax.set_xlim(0.05, 50)
    ax.set_ylim(0, 42)
    ax.set_xlabel("Tumour area (cm², log scale)")
    ax.set_ylabel("Sections")
    ax.set_title("Above 1.5 cm² ellipse area, section count rises steeply",
                 color=COL_FG, fontsize=14, pad=12, loc="left")
    fig.tight_layout()
    fig.savefig(OUT / "dependence_threshold.png", dpi=180)
    plt.close(fig)
    print("✓ dependence_threshold.png")


# ---------------------------------------------------------------
# Fig 5 — Confidence stratification donut
# ---------------------------------------------------------------
def fig_confidence_donut() -> None:
    fig, ax = plt.subplots(figsize=(7, 4.6))
    hc = 0.707
    lc = 1 - hc
    ax.pie(
        [hc, lc],
        colors=[COL_ACCENT, COL_MUTED],
        startangle=90,
        wedgeprops={"width": 0.32, "edgecolor": COL_BG, "linewidth": 2.5},
    )
    ax.text(0, 0.05, "70.7%", ha="center", va="center",
            color=COL_ACCENT, fontsize=44, fontweight="bold")
    ax.text(0, -0.18, "high-confidence cases", ha="center", va="center",
            color=COL_FG, fontsize=11)
    ax.text(0, -0.32, "→ 91.4% accuracy", ha="center", va="center",
            color=COL_MUTED, fontsize=10)
    fig.tight_layout()
    fig.savefig(OUT / "confidence_donut.png", dpi=180)
    plt.close(fig)
    print("✓ confidence_donut.png")


if __name__ == "__main__":
    fig_section_distribution()
    fig_shap_importance()
    fig_hzone_scatter()
    fig_dependence_threshold()
    fig_confidence_donut()
    print(f"\nAll figures → {OUT}")
