"""
Export a small ensemble (LR + HistGradientBoosting + MLP) as a single
JSON artefact runnable from TypeScript with no third-party deps.

The browser will:
  1. Standardise numerics + one-hot-encode categoricals using the saved
     mean/sd/vocab (identical to sklearn's ColumnTransformer)
  2. Run each base model and average their probabilities

Run after ml/train.py:
    python ml/export_ensemble.py

Emits public/data/ensemble.json (~80–150 KB; gzips small).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, brier_score_loss, accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train import (  # type: ignore[import-not-found]
    CAT_FEATURES,
    FEATURES,
    NUM_FEATURES,
    RANDOM_STATE,
    TEST_SIZE,
    load_data,
    stringify_categoricals,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "ensemble.json"


def export_lr(prep_fit, clf, X_test, y_test) -> dict:
    scaler = prep_fit.named_transformers_["num"]
    ohe = prep_fit.named_transformers_["cat"]
    proba = clf.predict_proba(X_test)[:, 1]
    return {
        "name": "LR",
        "label": "Logistic Regression (regularised)",
        "category": "Linear",
        "metrics": {
            "test_auc": round(float(roc_auc_score(y_test, proba)), 3),
            "test_acc": round(float(accuracy_score(y_test, proba >= 0.5)), 3),
            "brier": round(float(brier_score_loss(y_test, proba)), 3),
        },
        "numeric": {
            f: {"mean": float(scaler.mean_[i]), "sd": float(scaler.scale_[i])}
            for i, f in enumerate(NUM_FEATURES)
        },
        "categorical": {
            f: [str(c) for c in cats]
            for f, cats in zip(CAT_FEATURES, ohe.categories_)
        },
        "weights": [round(float(w), 6) for w in clf.coef_[0]],
        "intercept": round(float(clf.intercept_[0]), 6),
    }


def export_hgb(clf, X_test, y_test) -> dict:
    """
    HistGradientBoosting → JSON tree dump.
    Each predictor is a tree with arrays for left/right children, splits,
    and leaf values (in raw logit space). The final raw prediction is the
    init value plus the sum of selected leaf values × learning_rate.
    """
    proba = clf.predict_proba(X_test)[:, 1]
    init = float(clf._baseline_prediction.ravel()[0])
    lr = float(clf.learning_rate)
    trees: list[dict] = []
    for stage in clf._predictors:
        # Each stage is a list of trees; binary classification ⇒ 1 tree per stage
        for predictor in stage:
            nodes = predictor.nodes
            tree = {
                "feature": [int(n["feature_idx"]) for n in nodes],
                "threshold": [float(n["num_threshold"]) for n in nodes],
                "left": [int(n["left"]) for n in nodes],
                "right": [int(n["right"]) for n in nodes],
                "isLeaf": [bool(n["is_leaf"]) for n in nodes],
                "value": [float(n["value"]) for n in nodes],
            }
            trees.append(tree)

    return {
        "name": "HGB",
        "label": "Histogram Gradient Boosting",
        "category": "Gradient Boosting",
        "metrics": {
            "test_auc": round(float(roc_auc_score(y_test, proba)), 3),
            "test_acc": round(float(accuracy_score(y_test, proba >= 0.5)), 3),
            "brier": round(float(brier_score_loss(y_test, proba)), 3),
        },
        "init": init,
        "learningRate": lr,
        "nTrees": len(trees),
        "trees": trees,
    }


def export_mlp(clf, X_test, y_test) -> dict:
    proba = clf.predict_proba(X_test)[:, 1]
    return {
        "name": "MLP",
        "label": "Multilayer Perceptron",
        "category": "Neural Network",
        "metrics": {
            "test_auc": round(float(roc_auc_score(y_test, proba)), 3),
            "test_acc": round(float(accuracy_score(y_test, proba >= 0.5)), 3),
            "brier": round(float(brier_score_loss(y_test, proba)), 3),
        },
        "layers": [
            {
                "weights": [
                    [round(float(w), 5) for w in row]
                    for row in clf.coefs_[i]
                ],
                "biases": [round(float(b), 5) for b in clf.intercepts_[i]],
                "activation": "relu" if i < len(clf.coefs_) - 1 else "logistic",
            }
            for i in range(len(clf.coefs_))
        ],
    }


def main() -> None:
    df = load_data()
    X = stringify_categoricals(df[FEATURES])
    y = df["target_ge13"].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    # Shared preprocessor (numeric standardise + one-hot)
    prep = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUM_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT_FEATURES),
        ],
    )
    # Fit prep ONCE on train data — every model will share its outputs
    prep.fit(X_train)
    Xtr_p = prep.transform(X_train)
    Xte_p = prep.transform(X_test)

    # ---- LR (regularised)
    lr = LogisticRegression(C=0.3, max_iter=2000, random_state=RANDOM_STATE)
    cv_lr = cross_val_score(LogisticRegression(C=0.3, max_iter=2000, random_state=RANDOM_STATE),
                            Xtr_p, y_train, cv=cv, scoring="roc_auc", n_jobs=1)
    lr.fit(Xtr_p, y_train)

    # ---- HistGradientBoosting
    hgb = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08,
                                         max_depth=4, random_state=RANDOM_STATE)
    cv_hgb = cross_val_score(HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08,
                                                            max_depth=4, random_state=RANDOM_STATE),
                             Xtr_p, y_train, cv=cv, scoring="roc_auc", n_jobs=1)
    hgb.fit(Xtr_p, y_train)

    # ---- MLP (smaller than the academic 5-layer to keep JSON compact)
    mlp = MLPClassifier(hidden_layer_sizes=(64, 32, 16), activation="relu", solver="adam",
                        alpha=1e-4, early_stopping=True, validation_fraction=0.10,
                        max_iter=400, random_state=RANDOM_STATE)
    cv_mlp = cross_val_score(MLPClassifier(hidden_layer_sizes=(64, 32, 16), activation="relu",
                                           solver="adam", alpha=1e-4, early_stopping=True,
                                           validation_fraction=0.10, max_iter=400,
                                           random_state=RANDOM_STATE),
                             Xtr_p, y_train, cv=cv, scoring="roc_auc", n_jobs=1)
    mlp.fit(Xtr_p, y_train)

    # Compute ensemble metrics on test set
    p_lr = lr.predict_proba(Xte_p)[:, 1]
    p_hgb = hgb.predict_proba(Xte_p)[:, 1]
    p_mlp = mlp.predict_proba(Xte_p)[:, 1]
    p_avg = (p_lr + p_hgb + p_mlp) / 3
    print("                    CV-AUC      Test-AUC    Test-F1   Brier")
    print(f"  LR (C=0.3)        {cv_lr.mean():.3f}±{cv_lr.std():.3f}  "
          f"{roc_auc_score(y_test, p_lr):.3f}      "
          f"{f1_score(y_test, p_lr>=0.5):.3f}    {brier_score_loss(y_test, p_lr):.3f}")
    print(f"  HGB               {cv_hgb.mean():.3f}±{cv_hgb.std():.3f}  "
          f"{roc_auc_score(y_test, p_hgb):.3f}      "
          f"{f1_score(y_test, p_hgb>=0.5):.3f}    {brier_score_loss(y_test, p_hgb):.3f}")
    print(f"  MLP               {cv_mlp.mean():.3f}±{cv_mlp.std():.3f}  "
          f"{roc_auc_score(y_test, p_mlp):.3f}      "
          f"{f1_score(y_test, p_mlp>=0.5):.3f}    {brier_score_loss(y_test, p_mlp):.3f}")
    print(f"  Soft-vote avg     —            "
          f"{roc_auc_score(y_test, p_avg):.3f}      "
          f"{f1_score(y_test, p_avg>=0.5):.3f}    {brier_score_loss(y_test, p_avg):.3f}")

    feature_names = prep.get_feature_names_out().tolist()

    # Build single ensemble JSON
    scaler = prep.named_transformers_["num"]
    ohe = prep.named_transformers_["cat"]
    export = {
        "schemaVersion": 2,
        "numericFeatures": NUM_FEATURES,
        "categoricalFeatures": CAT_FEATURES,
        "numeric": {
            f: {"mean": float(scaler.mean_[i]), "sd": float(scaler.scale_[i])}
            for i, f in enumerate(NUM_FEATURES)
        },
        "categorical": {
            f: [str(c) for c in cats]
            for f, cats in zip(CAT_FEATURES, ohe.categories_)
        },
        "featureNames": feature_names,
        "manuscriptThresholdCm2": 1.5,
        "ensembleMetrics": {
            "test_auc": round(float(roc_auc_score(y_test, p_avg)), 3),
            "test_acc": round(float(accuracy_score(y_test, p_avg >= 0.5)), 3),
            "brier": round(float(brier_score_loss(y_test, p_avg)), 3),
        },
        "models": [
            {**export_lr(prep, lr, Xte_p, y_test),
             "metrics": {**export_lr(prep, lr, Xte_p, y_test)["metrics"],
                         "cv_auc_mean": round(float(cv_lr.mean()), 3),
                         "cv_auc_sd": round(float(cv_lr.std()), 3)}},
            {**export_hgb(hgb, Xte_p, y_test),
             "metrics": {**export_hgb(hgb, Xte_p, y_test)["metrics"],
                         "cv_auc_mean": round(float(cv_hgb.mean()), 3),
                         "cv_auc_sd": round(float(cv_hgb.std()), 3)}},
            {**export_mlp(mlp, Xte_p, y_test),
             "metrics": {**export_mlp(mlp, Xte_p, y_test)["metrics"],
                         "cv_auc_mean": round(float(cv_mlp.mean()), 3),
                         "cv_auc_sd": round(float(cv_mlp.std()), 3)}},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(export))
    kb = OUT.stat().st_size / 1024
    print(f"\nSaved → {OUT} ({kb:.1f} KB)")


if __name__ == "__main__":
    main()
