/**
 * MOHS AI — TypeScript inference for the calibrated Logistic Regression
 * shipping model. All the math runs in the browser (or any Node runtime);
 * the only dependency is the ~3 KB JSON artefact emitted by
 * `ml/export_linear.py`.
 *
 * The feature engineering mirrors sklearn's ColumnTransformer:
 *   numeric  → z-score with (mean, sd) from training
 *   categorical → one-hot against the fitted vocabulary, with unknown
 *                 categories dropped (handle_unknown="ignore")
 *   logit = dot(weights, x) + intercept
 *   probability = sigmoid(logit)
 */

import type { PatientInput } from "./model-types";
import modelJson from "../../public/data/lr_model.json" with { type: "json" };

type NumericStats = { mean: number; sd: number };

type Model = {
  schemaVersion: number;
  model: string;
  metrics: { cv_auc_mean: number; cv_auc_sd: number; test_auc: number };
  numericFeatures: string[];
  categoricalFeatures: string[];
  numeric: Record<string, NumericStats>;
  categorical: Record<string, string[]>;
  featureNames: string[];
  weights: number[];
  intercept: number;
  manuscriptThresholdCm2: number;
};

const MODEL = modelJson as Model;

/** Ellipse formula from manuscript §2.2. Size inputs are mm, output is cm². */
export function computeEllipseArea(xMm: number, yMm: number): number {
  return (Math.PI * (xMm / 2) * (yMm / 2)) / 100;
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function buildDesignVector(input: PatientInput): number[] {
  const x: number[] = [];

  // Numeric — z-score
  for (const feat of MODEL.numericFeatures) {
    const raw = numericValue(input, feat);
    const s = MODEL.numeric[feat];
    x.push((raw - s.mean) / (s.sd || 1));
  }

  // Categorical — one-hot, ignore unknown
  for (const feat of MODEL.categoricalFeatures) {
    const cats = MODEL.categorical[feat];
    const val = String((input as unknown as Record<string, unknown>)[feat] ?? "");
    for (const cat of cats) {
      x.push(cat === val ? 1 : 0);
    }
  }
  return x;
}

function numericValue(input: PatientInput, feat: string): number {
  if (feat === "Tumour_Area_cm2") {
    return computeEllipseArea(input.Tumour_Size_X, input.Tumour_Size_Y);
  }
  const v = (input as unknown as Record<string, number>)[feat];
  return typeof v === "number" ? v : 0;
}

export type PredictionFactor = {
  feature: string;
  label: string;
  kind: "numeric" | "categorical";
  value: number | string;
  cohortMean?: number;
  z?: number;
  contribution: number;
  direction: "up" | "down" | "flat";
};

export type Prediction = {
  probability: number;
  logit: number;
  confidence: "high" | "borderline";
  distanceToBoundary: number;
  label: "≥13 sections likely" | "<13 sections likely";
  tumourAreaCm2: number;
  exceedsThreshold: boolean;
  mbs: { code: "31000" | "31001" | "31002"; label: string; scheduleFee: number };
  factors: PredictionFactor[];
};

const FEATURE_LABELS: Record<string, string> = {
  Age: "Patient age",
  Tumour_Size_X: "Tumour width",
  Tumour_Size_Y: "Tumour height",
  Tumour_Area_cm2: "Tumour area (ellipse)",
  Sex: "Sex",
  See_Do: "See-and-do planning",
  Experience: "Surgeon experience",
  Recurrent: "Recurrent tumour",
  Tumour_Stats: "Tumour type",
  Body_Site: "Body site",
  Body_Zone: "Body zone",
  Laterality: "Laterality",
  Unit: "Anatomical unit",
  Aggressive_Histopathology: "Aggressive histopathology",
  Biopsy: "Biopsy method",
  Smoking: "Smoking",
};

function mbsBucket(prob: number): Prediction["mbs"] {
  if (prob >= 0.5) return { code: "31002", label: "Mohs ≥13 sections", scheduleFee: 1016.4 };
  if (prob >= 0.25) return { code: "31001", label: "Mohs 7–12 sections", scheduleFee: 847.0 };
  return { code: "31000", label: "Mohs 1–6 sections", scheduleFee: 677.7 };
}

export function predict(input: PatientInput): Prediction {
  const x = buildDesignVector(input);
  let logit = MODEL.intercept;
  for (let i = 0; i < x.length; i++) logit += MODEL.weights[i] * x[i];
  const probability = sigmoid(logit);
  const distanceToBoundary = Math.abs(probability - 0.5);
  const confidence: Prediction["confidence"] =
    distanceToBoundary >= 0.15 ? "high" : "borderline";

  const tumourAreaCm2 = computeEllipseArea(input.Tumour_Size_X, input.Tumour_Size_Y);

  // Per-feature contributions (signed): weight · x_i per design-matrix column.
  // For categoricals, attribute to the active category's column.
  const numericCount = MODEL.numericFeatures.length;
  const factors: PredictionFactor[] = [];
  for (let i = 0; i < numericCount; i++) {
    const feat = MODEL.numericFeatures[i];
    const z = x[i];
    const contribution = MODEL.weights[i] * z;
    const val = numericValue(input, feat);
    factors.push({
      feature: feat,
      label: FEATURE_LABELS[feat] ?? feat,
      kind: "numeric",
      value: val,
      cohortMean: MODEL.numeric[feat].mean,
      z: Number(z.toFixed(3)),
      contribution: Number(contribution.toFixed(4)),
      direction: contribution > 0.02 ? "up" : contribution < -0.02 ? "down" : "flat",
    });
  }

  let col = numericCount;
  for (const feat of MODEL.categoricalFeatures) {
    const cats = MODEL.categorical[feat];
    const val = String((input as unknown as Record<string, unknown>)[feat] ?? "");
    const activeIdx = cats.indexOf(val);
    const contribution = activeIdx >= 0 ? MODEL.weights[col + activeIdx] : 0;
    factors.push({
      feature: feat,
      label: FEATURE_LABELS[feat] ?? feat,
      kind: "categorical",
      value: val,
      contribution: Number(contribution.toFixed(4)),
      direction: contribution > 0.05 ? "up" : contribution < -0.05 ? "down" : "flat",
    });
    col += cats.length;
  }

  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    probability: Number(probability.toFixed(4)),
    logit: Number(logit.toFixed(4)),
    confidence,
    distanceToBoundary: Number(distanceToBoundary.toFixed(4)),
    label: probability >= 0.5 ? "≥13 sections likely" : "<13 sections likely",
    tumourAreaCm2: Number(tumourAreaCm2.toFixed(3)),
    exceedsThreshold: tumourAreaCm2 >= MODEL.manuscriptThresholdCm2,
    mbs: mbsBucket(probability),
    factors,
  };
}

/** Metadata exposed to callers — feature names, vocabulary, AUC. */
export const modelMeta = {
  metrics: MODEL.metrics,
  numericFeatures: MODEL.numericFeatures,
  categoricalFeatures: MODEL.categoricalFeatures,
  categorical: MODEL.categorical,
  featureLabels: FEATURE_LABELS,
  manuscriptThresholdCm2: MODEL.manuscriptThresholdCm2,
};
