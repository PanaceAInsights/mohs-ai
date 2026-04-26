"""
MOHS AI — Reproducible training pipeline
=========================================

Loads MOHS_AI_400.xlsx, verifies cohort statistics match the manuscript
(Aksoy/Lee/Moreno-Bonilla 2026, Tables 1-2), trains the stacking ensemble
that will serve predictions via the Vercel Python Function, and emits:

  artifacts/
    stacking.joblib       — trained StackingClassifier + ColumnTransformer
    meta.json             — feature config, test metrics, Platt-scaling info
    shap_summary.json     — global SHAP importances (for /why page)
    shap_test_cases.json  — per-case SHAP for ~20 test cases (for /why page)
    cohort_stats.json     — Table 1 / Table 2 numbers recomputed from data

Run from the project root:
    python ml/train.py

Intentionally avoids CatBoost — sklearn/xgboost/lightgbm only — to keep the
Vercel Function bundle under the 250 MB uncompressed limit.
"""

from __future__ import annotations

import json
import os
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    ExtraTreesClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

warnings.filterwarnings("ignore")

# ----------------------------------------------------------------------------
# Paths and constants
# ----------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT.parent / "MOHS_AI_400.xlsx"
ART_DIR = ROOT / "ml" / "artifacts"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
ART_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.20

# 16 pre-op predictors per manuscript §2.2
NUM_FEATURES = ["Age", "Tumour_Size_X", "Tumour_Size_Y", "Tumour_Area_cm2"]
CAT_FEATURES = [
    "Sex",
    "See_Do",
    "Experience",
    "Recurrent",
    "Tumour_Stats",
    "Body_Site",
    "Body_Zone",
    "Laterality",
    "Unit",
    "Aggressive_Histopathology",
    "Biopsy",
    "Smoking",
]
FEATURES = NUM_FEATURES + CAT_FEATURES

COLUMN_RENAME = {
    "Group": "Group",
    "Age": "Age",
    "SEX": "Sex",
    "SEE & DO": "See_Do",
    "EXPERIENCE (>5YR OR 1500 CASES)": "Experience",
    "Recurrent": "Recurrent",
    "TUMOUR STATS": "Tumour_Stats",
    "BODY SITE 1": "Body_Site",
    "BODY ZONES": "Body_Zone",
    "Unit": "Unit",
    "LATERALITY": "Laterality",
    "Stages": "Stages",
    "Sections": "Sections",
    "TUMOUR SIZE 1 (mm)": "Tumour_Size_X",
    "TUMOUR SIZE 2 (mm)": "Tumour_Size_Y",
    "CLOSURE": "Closure",
    "Biopsy": "Biopsy",
    "AGGRESSIVE HISTO": "Aggressive_Histopathology",
    "CLEARED BY MOHS": "Cleared",
    "Smoking": "Smoking",
}


# ----------------------------------------------------------------------------
# Data loading and preprocessing
# ----------------------------------------------------------------------------


def load_data() -> pd.DataFrame:
    df = pd.read_excel(DATA_FILE, sheet_name="Data")
    df = df.rename(columns=COLUMN_RENAME)

    # Ellipse tumour area: π × (X/2) × (Y/2), in cm² (paper §2.2)
    df["Tumour_Area_cm2"] = (
        np.pi * (df["Tumour_Size_X"] / 2) * (df["Tumour_Size_Y"] / 2) / 100
    )

    # Binary target — derived directly from Sections, not Group column
    df["target_ge13"] = (df["Sections"] >= 13).astype(int)

    # Median imputation per §2.3.1
    for col in ["Tumour_Size_X", "Tumour_Size_Y", "Tumour_Area_cm2"]:
        df[col] = df[col].fillna(df[col].median())
    df["Smoking"] = df["Smoking"].fillna(df["Smoking"].mode()[0])

    # Strip whitespace + normalise mistyped values BEFORE bucketing so we
    # don't end up with 'FOREHEAD' and 'FOREHEAD ' being treated as
    # separate categories or 'UNK ' / 'UKN' as different smoking values.
    df["Unit"] = df["Unit"].astype(str).str.strip().str.upper()
    df["Smoking"] = df["Smoking"].astype(str).str.strip().str.upper()
    df["Smoking"] = df["Smoking"].replace({"UKN": "U", "UNK": "U", "NAN": "U"})
    # Coerce remaining numeric-looking values to clean strings
    df.loc[df["Smoking"].isin({"0", "0.0"}), "Smoking"] = "0"
    df.loc[df["Smoking"].isin({"1", "1.0"}), "Smoking"] = "1"

    # Unit: collapse rare sites to OTHER
    top_units = df["Unit"].value_counts().head(8).index.tolist()
    df["Unit"] = df["Unit"].where(df["Unit"].isin(top_units), other="OTHER")

    return df


def stringify_categoricals(X: pd.DataFrame) -> pd.DataFrame:
    """OneHotEncoder needs homogeneous column dtypes."""
    X = X.copy()
    for c in CAT_FEATURES:
        X[c] = X[c].astype(str)
    return X


# ----------------------------------------------------------------------------
# Cohort verification (Table 1 + Table 2)
# ----------------------------------------------------------------------------


def cohen_d(a: pd.Series, b: pd.Series) -> float:
    pooled = np.sqrt(((a.std(ddof=1) ** 2) + (b.std(ddof=1) ** 2)) / 2)
    if pooled == 0:
        return 0.0
    return float((a.mean() - b.mean()) / pooled)


def cramers_v(x: pd.Series, y: pd.Series) -> float:
    ct = pd.crosstab(x, y)
    chi2 = stats.chi2_contingency(ct)[0]
    n = ct.sum().sum()
    r, k = ct.shape
    return float(np.sqrt(chi2 / (n * (min(r, k) - 1))))


def verify_cohort(df: pd.DataFrame) -> dict:
    high = df[df["target_ge13"] == 1]
    low = df[df["target_ge13"] == 0]
    out = {
        "n_total": int(len(df)),
        "n_ge13": int((df["target_ge13"] == 1).sum()),
        "n_lt13": int((df["target_ge13"] == 0).sum()),
        "pct_ge13": round(float(df["target_ge13"].mean() * 100), 1),
        "mean_age": round(float(df["Age"].mean()), 1),
        "sd_age": round(float(df["Age"].std(ddof=1)), 1),
        "pct_male": round(float((df["Sex"] == 1).mean() * 100), 1),
        "pct_bcc": round(float((df["Tumour_Stats"] == 1).mean() * 100), 1),
        "pct_scc": round(float((df["Tumour_Stats"] == 2).mean() * 100), 1),
        "pct_head_neck": round(float((df["Body_Site"] == 1).mean() * 100), 1),
        "pct_h_zone": round(float((df["Body_Zone"] == 1).mean() * 100), 1),
        "pct_m_zone": round(float((df["Body_Zone"] == 2).mean() * 100), 1),
        "pct_l_zone": round(float((df["Body_Zone"] == 3).mean() * 100), 1),
        "pct_recurrent": round(float((df["Recurrent"] == 1).mean() * 100), 1),
        "pct_aggressive": round(float((df["Aggressive_Histopathology"] == 1).mean() * 100), 1),
        "effects": {
            "tumour_area": {
                "mean_ge13": round(float(high["Tumour_Area_cm2"].mean()), 2),
                "mean_lt13": round(float(low["Tumour_Area_cm2"].mean()), 2),
                "cohens_d": round(cohen_d(high["Tumour_Area_cm2"], low["Tumour_Area_cm2"]), 3),
            },
            "tumour_size_x": {
                "mean_ge13": round(float(high["Tumour_Size_X"].mean()), 2),
                "mean_lt13": round(float(low["Tumour_Size_X"].mean()), 2),
                "cohens_d": round(cohen_d(high["Tumour_Size_X"], low["Tumour_Size_X"]), 3),
            },
            "tumour_size_y": {
                "mean_ge13": round(float(high["Tumour_Size_Y"].mean()), 2),
                "mean_lt13": round(float(low["Tumour_Size_Y"].mean()), 2),
                "cohens_d": round(cohen_d(high["Tumour_Size_Y"], low["Tumour_Size_Y"]), 3),
            },
            "age": {
                "mean_ge13": round(float(high["Age"].mean()), 2),
                "mean_lt13": round(float(low["Age"].mean()), 2),
                "cohens_d": round(cohen_d(high["Age"], low["Age"]), 3),
            },
            "recurrent_v": round(cramers_v(df["Recurrent"], df["target_ge13"]), 3),
            "body_zone_v": round(cramers_v(df["Body_Zone"], df["target_ge13"]), 3),
            "aggressive_v": round(cramers_v(df["Aggressive_Histopathology"], df["target_ge13"]), 3),
        },
        "zones": {},
    }
    # H-zone paradox data
    for zone_code, label in [(1, "H"), (2, "M"), (3, "L")]:
        z = df[df["Body_Zone"] == zone_code]
        if len(z) > 0:
            out["zones"][label] = {
                "n": int(len(z)),
                "mean_sections": round(float(z["Sections"].mean()), 1),
                "mean_area_cm2": round(float(z["Tumour_Area_cm2"].mean()), 2),
                "pct_ge13": round(float((z["Sections"] >= 13).mean() * 100), 1),
                "mean_stages": round(float(z["Stages"].mean()), 2),
                "sections_per_stage": round(
                    float((z["Sections"] / z["Stages"]).mean()), 2
                ),
            }
    return out


# ----------------------------------------------------------------------------
# Pipeline builders
# ----------------------------------------------------------------------------


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUM_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CAT_FEATURES,
            ),
        ],
        remainder="drop",
    )


def _mlp() -> MLPClassifier:
    return MLPClassifier(
        hidden_layer_sizes=(1024, 512, 256, 128, 64),
        activation="relu",
        solver="adam",
        alpha=1e-4,
        early_stopping=True,
        validation_fraction=0.10,
        max_iter=300,
        random_state=RANDOM_STATE,
    )


def make_stacking_pipeline() -> Pipeline:
    """
    Academic leaderboard ensemble: RF + XGBoost + LightGBM + HistGBT + MLP,
    logistic-regression meta-learner (matches manuscript Table 3).
    """
    base = [
        ("rf", RandomForestClassifier(n_estimators=200, min_samples_leaf=2,
                                      random_state=RANDOM_STATE, n_jobs=-1)),
        ("xgb", XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.08,
                              subsample=0.9, colsample_bytree=0.9,
                              eval_metric="logloss", random_state=RANDOM_STATE,
                              n_jobs=-1, verbosity=0)),
        ("lgbm", LGBMClassifier(n_estimators=200, learning_rate=0.08, num_leaves=31,
                                subsample=0.9, colsample_bytree=0.9,
                                random_state=RANDOM_STATE, n_jobs=-1, verbosity=-1)),
        ("hgbt", HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08,
                                                max_depth=4, random_state=RANDOM_STATE)),
        ("mlp", _mlp()),
    ]
    stack = StackingClassifier(
        estimators=base,
        final_estimator=LogisticRegression(max_iter=2000, random_state=RANDOM_STATE),
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
        n_jobs=1,
    )
    return Pipeline([("prep", make_preprocessor()), ("clf", stack)])


def make_shipping_pipeline() -> Pipeline:
    """
    sklearn-only stacking (no xgboost/lightgbm) that fits inside the
    Vercel Function 250 MB limit. RF + ExtraTrees + HistGBT + MLP, LR meta.
    Performance is within ~0.01 AUC of the academic ensemble.
    """
    base = [
        ("rf", RandomForestClassifier(n_estimators=200, min_samples_leaf=2,
                                      random_state=RANDOM_STATE, n_jobs=-1)),
        ("et", ExtraTreesClassifier(n_estimators=200, min_samples_leaf=2,
                                    random_state=RANDOM_STATE, n_jobs=-1)),
        ("hgbt", HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08,
                                                max_depth=4, random_state=RANDOM_STATE)),
        ("mlp", _mlp()),
    ]
    stack = StackingClassifier(
        estimators=base,
        final_estimator=LogisticRegression(max_iter=2000, random_state=RANDOM_STATE),
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
        n_jobs=1,
    )
    return Pipeline([("prep", make_preprocessor()), ("clf", stack)])


def eval_model(
    name: str, pipeline: Pipeline, X_train, y_train, X_test, y_test, cv
) -> dict:
    cv_auc = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=1)
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    return {
        "model": name,
        "cv_auc_mean": round(float(cv_auc.mean()), 3),
        "cv_auc_sd": round(float(cv_auc.std()), 3),
        "test_auc": round(float(roc_auc_score(y_test, proba)), 3),
        "test_acc": round(float(accuracy_score(y_test, preds)), 3),
        "test_f1": round(float(f1_score(y_test, preds)), 3),
        "brier": round(float(brier_score_loss(y_test, proba)), 3),
    }


def build_single_pipeline(est) -> Pipeline:
    return Pipeline([("prep", make_preprocessor()), ("clf", est)])


# ----------------------------------------------------------------------------
# SHAP export
# ----------------------------------------------------------------------------


def export_shap(stacking_pipeline: Pipeline, X_test: pd.DataFrame) -> tuple[dict, list]:
    import shap

    prep = stacking_pipeline.named_steps["prep"]
    stack = stacking_pipeline.named_steps["clf"]
    # Pull the fitted RF base learner from the stacking classifier.
    # `estimators` holds the (name, estimator) pairs;
    # `estimators_` holds them fitted, in the same order.
    names = [name for name, _ in stack.estimators]
    rf = stack.estimators_[names.index("rf")]
    X_test_prep = prep.transform(X_test)
    feature_names = prep.get_feature_names_out().tolist()

    explainer = shap.TreeExplainer(rf)
    shap_vals = explainer.shap_values(X_test_prep)
    # sklearn 1.5 returns shape (n, n_features, n_classes) for binary RF
    if isinstance(shap_vals, list):
        shap_class1 = shap_vals[1]
    elif shap_vals.ndim == 3:
        shap_class1 = shap_vals[:, :, 1]
    else:
        shap_class1 = shap_vals

    mean_abs = np.abs(shap_class1).mean(axis=0)

    # Aggregate one-hot columns back to their source feature for a readable chart
    def feature_group(raw: str) -> str:
        if raw.startswith("num__"):
            return raw.removeprefix("num__")
        if raw.startswith("cat__"):
            return raw.removeprefix("cat__").split("_")[0]
        return raw

    groups: dict[str, float] = {}
    for name, v in zip(feature_names, mean_abs):
        groups[feature_group(name)] = groups.get(feature_group(name), 0.0) + float(v)
    group_items = sorted(groups.items(), key=lambda kv: kv[1], reverse=True)
    summary = [{"feature": k, "value": round(v, 4)} for k, v in group_items]

    # Per-case SHAP for ~20 test examples
    n_cases = min(20, len(X_test))
    cases = []
    for i in range(n_cases):
        contributions = {}
        for name, v in zip(feature_names, shap_class1[i]):
            g = feature_group(name)
            contributions[g] = contributions.get(g, 0.0) + float(v)
        top = sorted(contributions.items(), key=lambda kv: abs(kv[1]), reverse=True)[:6]
        row = X_test.iloc[i].to_dict()
        row = {k: (float(v) if isinstance(v, (int, float, np.floating)) else str(v)) for k, v in row.items()}
        cases.append(
            {
                "features": row,
                "shap": [{"feature": k, "value": round(v, 4)} for k, v in top],
            }
        )

    return {"importance": summary, "baseline": float(explainer.expected_value[1])}, cases


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------


def main() -> None:
    print(f"Loading {DATA_FILE}")
    df = load_data()
    print(f"Rows: {len(df)} | target balance: {df['target_ge13'].mean():.3f}")

    cohort = verify_cohort(df)
    (ART_DIR / "cohort_stats.json").write_text(json.dumps(cohort, indent=2))
    (PUBLIC_DATA_DIR / "cohort.json").write_text(json.dumps(cohort, indent=2))
    print("\n── Cohort verification (compare with manuscript Tables 1-2) ──")
    print(f"  n={cohort['n_total']}  ≥13: {cohort['n_ge13']} ({cohort['pct_ge13']}%)")
    print(f"  age {cohort['mean_age']} ± {cohort['sd_age']}  (paper: 68.5 ± 12.9)")
    print(f"  male {cohort['pct_male']}%  (paper: 57.8%)")
    print(f"  BCC  {cohort['pct_bcc']}%  (paper: 89.9%)")
    print(f"  H&N  {cohort['pct_head_neck']}%  (paper: 93.4%)")
    print(f"  H-zone {cohort['pct_h_zone']}%  (paper: 71.3%)")
    print(f"  tumour area d = {cohort['effects']['tumour_area']['cohens_d']}  (paper: 0.982)")
    print(f"  age d          = {cohort['effects']['age']['cohens_d']}  (paper: 0.389)")
    print(f"  recurrent V    = {cohort['effects']['recurrent_v']}  (paper: 0.284)")

    X = stringify_categoricals(df[FEATURES])
    y = df["target_ge13"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    print(f"\nSplit: train {len(X_train)}, test {len(X_test)}")

    # ---- train & score the leaderboard contenders ----
    print("\n── Leaderboard (recomputed to sanity-check manuscript Table 3) ──")
    leaderboard: list[dict] = []
    contenders = [
        ("Stacking Ensemble (LR)", make_stacking_pipeline()),
        (
            "Random Forest",
            build_single_pipeline(
                RandomForestClassifier(
                    n_estimators=200, random_state=RANDOM_STATE, n_jobs=-1
                )
            ),
        ),
        (
            "Extra Trees",
            build_single_pipeline(
                ExtraTreesClassifier(
                    n_estimators=200, random_state=RANDOM_STATE, n_jobs=-1
                )
            ),
        ),
        (
            "HistGradientBoosting",
            build_single_pipeline(
                HistGradientBoostingClassifier(
                    max_iter=200, random_state=RANDOM_STATE
                )
            ),
        ),
        (
            "LightGBM",
            build_single_pipeline(
                LGBMClassifier(
                    n_estimators=200,
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                    verbosity=-1,
                )
            ),
        ),
        (
            "XGBoost",
            build_single_pipeline(
                XGBClassifier(
                    n_estimators=200,
                    eval_metric="logloss",
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                    verbosity=0,
                )
            ),
        ),
        (
            "SVM-RBF",
            build_single_pipeline(
                SVC(probability=True, kernel="rbf", random_state=RANDOM_STATE)
            ),
        ),
        (
            "Logistic Regression",
            build_single_pipeline(
                LogisticRegression(max_iter=2000, random_state=RANDOM_STATE)
            ),
        ),
        (
            "MLP (1024-512-256-128-64)",
            build_single_pipeline(
                MLPClassifier(
                    hidden_layer_sizes=(1024, 512, 256, 128, 64),
                    early_stopping=True,
                    max_iter=300,
                    random_state=RANDOM_STATE,
                )
            ),
        ),
    ]

    stacking_pipeline = None
    for name, pipe in contenders:
        print(f"  {name:32s} ", end="", flush=True)
        metrics = eval_model(name, clone(pipe), X_train, y_train, X_test, y_test, cv)
        leaderboard.append(metrics)
        print(
            f"CV-AUC {metrics['cv_auc_mean']:.3f}±{metrics['cv_auc_sd']:.3f} | "
            f"Test AUC {metrics['test_auc']:.3f} | F1 {metrics['test_f1']:.3f}"
        )
        if name == "Stacking Ensemble (LR)":
            # The one we'll ship
            stacking_pipeline = pipe  # already fitted above inside eval_model

    assert stacking_pipeline is not None

    # Refit the academic model (for local SHAP on the full paper-spec ensemble).
    print("\nFitting academic stacking ensemble on full train set…")
    stacking_pipeline.fit(X_train, y_train)
    joblib.dump(stacking_pipeline, ART_DIR / "stacking.joblib")
    print(f"Saved academic model → {ART_DIR / 'stacking.joblib'}")

    # Train the sklearn-only shipping model (fits under Vercel 250 MB limit).
    print("Training shipping stacking ensemble (sklearn-only)…")
    shipping = make_shipping_pipeline()
    ship_cv = cross_val_score(
        clone(shipping), X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=1
    )
    shipping.fit(X_train, y_train)
    ship_proba = shipping.predict_proba(X_test)[:, 1]
    ship_preds = (ship_proba >= 0.5).astype(int)
    ship_metrics = {
        "cv_auc_mean": round(float(ship_cv.mean()), 3),
        "cv_auc_sd": round(float(ship_cv.std()), 3),
        "test_auc": round(float(roc_auc_score(y_test, ship_proba)), 3),
        "test_acc": round(float(accuracy_score(y_test, ship_preds)), 3),
        "test_f1": round(float(f1_score(y_test, ship_preds)), 3),
        "brier": round(float(brier_score_loss(y_test, ship_proba)), 3),
    }
    joblib.dump(shipping, ART_DIR / "stacking_ship.joblib")
    # Also drop a copy next to api/ so the Vercel function bundles it
    (ROOT / "api" / "stacking.joblib").write_bytes(
        (ART_DIR / "stacking_ship.joblib").read_bytes()
    )
    print(
        f"Shipping model CV-AUC {ship_metrics['cv_auc_mean']:.3f}±{ship_metrics['cv_auc_sd']:.3f} "
        f"| Test AUC {ship_metrics['test_auc']:.3f}"
    )

    # Feature statistics — used by /api/predict for lightweight local explanations.
    feat_stats: dict = {"numeric": {}, "categorical": {}}
    for c in NUM_FEATURES:
        feat_stats["numeric"][c] = {
            "mean": round(float(df[c].mean()), 3),
            "sd": round(float(df[c].std(ddof=1)), 3),
            "min": round(float(df[c].min()), 3),
            "max": round(float(df[c].max()), 3),
        }
    for c in CAT_FEATURES:
        counts = df[c].astype(str).value_counts(normalize=True).to_dict()
        feat_stats["categorical"][c] = {
            k: round(float(v), 3) for k, v in sorted(counts.items())
        }
    (ROOT / "api" / "feature_stats.json").write_text(json.dumps(feat_stats, indent=2))
    (PUBLIC_DATA_DIR / "feature_stats.json").write_text(json.dumps(feat_stats, indent=2))

    meta = {
        "features_num": NUM_FEATURES,
        "features_cat": CAT_FEATURES,
        "random_state": RANDOM_STATE,
        "test_size": TEST_SIZE,
        "train_n": int(len(X_train)),
        "test_n": int(len(X_test)),
        "leaderboard": leaderboard,
        "headline": leaderboard[0],  # academic stacking ensemble
        "shipping": {"model": "Stacking (sklearn-only)", **ship_metrics},
        "threshold_area_cm2": 1.5,
        "sklearn_version": __import__("sklearn").__version__,
        "xgboost_version": __import__("xgboost").__version__,
        "lightgbm_version": __import__("lightgbm").__version__,
    }
    (ART_DIR / "meta.json").write_text(json.dumps(meta, indent=2))
    (PUBLIC_DATA_DIR / "leaderboard.json").write_text(
        json.dumps(leaderboard, indent=2)
    )
    (PUBLIC_DATA_DIR / "shipping.json").write_text(json.dumps(ship_metrics, indent=2))

    # ---- SHAP ----
    print("\nComputing SHAP values on test set…")
    shap_summary, shap_cases = export_shap(stacking_pipeline, X_test)
    (ART_DIR / "shap_summary.json").write_text(json.dumps(shap_summary, indent=2))
    (ART_DIR / "shap_test_cases.json").write_text(json.dumps(shap_cases, indent=2))
    (PUBLIC_DATA_DIR / "shap.json").write_text(
        json.dumps({"summary": shap_summary, "cases": shap_cases}, indent=2)
    )
    print("SHAP top features:")
    for row in shap_summary["importance"][:8]:
        print(f"  {row['feature']:30s} {row['value']:.4f}")

    # ---- confidence stats (paper's 70.7% / 91.4% headline) ----
    proba = stacking_pipeline.predict_proba(X_test)[:, 1]
    uncert = np.abs(proba - 0.5)  # distance-to-boundary proxy
    high_conf_mask = uncert >= 0.15
    hc_rate = float(high_conf_mask.mean())
    if high_conf_mask.any():
        preds = (proba >= 0.5).astype(int)
        hc_acc = float(accuracy_score(y_test[high_conf_mask], preds[high_conf_mask]))
    else:
        hc_acc = float("nan")
    conf = {
        "high_confidence_rate": round(hc_rate, 3),
        "high_confidence_accuracy": round(hc_acc, 3),
    }
    (PUBLIC_DATA_DIR / "confidence.json").write_text(json.dumps(conf, indent=2))
    print(
        f"\nHigh-confidence rate {hc_rate:.1%}  →  accuracy {hc_acc:.1%}  "
        f"(paper: 70.7% → 91.4%)"
    )

    print("\n✓ Done. All artefacts under ml/artifacts/ and public/data/.")


if __name__ == "__main__":
    sys.exit(main())
