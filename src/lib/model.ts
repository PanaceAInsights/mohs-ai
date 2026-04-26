/**
 * Compatibility shim — delegates to the ensemble runner so existing call
 * sites (mini-predictor, /api/predict, scheduler stage estimator) get the
 * three-model average instead of a lone Logistic Regression.
 */

import {
  predict as ensemblePredict,
  ensembleMeta,
  computeEllipseArea as _computeEllipseArea,
  type EnsemblePrediction,
  type PredictionFactor,
} from "./ensemble";
import type { PatientInput } from "./model-types";

export type Prediction = {
  probability: number;
  logit: number;
  confidence: "high" | "borderline" | "split";
  distanceToBoundary: number;
  label: "≥13 sections likely" | "<13 sections likely";
  tumourAreaCm2: number;
  exceedsThreshold: boolean;
  mbs: EnsemblePrediction["mbs"];
  factors: PredictionFactor[];
  perModel: EnsemblePrediction["perModel"];
  spread: number;
};

export type { PredictionFactor } from "./ensemble";

export const computeEllipseArea = _computeEllipseArea;

export function predict(input: PatientInput): Prediction {
  const r = ensemblePredict(input);
  // logit is no longer meaningful for an averaged ensemble; we report 0
  // so existing UI bindings keep working but treat logit as informational.
  return { ...r, logit: 0 };
}

export const modelMeta = {
  metrics: ensembleMeta.ensembleMetrics,
  numericFeatures: ensembleMeta.numericFeatures,
  categoricalFeatures: ensembleMeta.categoricalFeatures,
  categorical: ensembleMeta.categorical,
  featureLabels: ensembleMeta.featureLabels,
  manuscriptThresholdCm2: ensembleMeta.manuscriptThresholdCm2,
  perModelMetrics: ensembleMeta.perModelMetrics,
};
