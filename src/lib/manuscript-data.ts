/**
 * All numbers here are transcribed verbatim from:
 *   Aksoy YA, Lee S, Moreno-Bonilla G.
 *   "Development and Validation of Machine Learning Models for
 *    Predicting 13 or More Sections in Mohs Micrographic Surgery"
 *   (MOHS_AI_Manuscript_v7_CLEAN, March 2026).
 *
 * No page in the app fabricates statistics — everything traces
 * back to Tables 1–3 of the manuscript.
 */

export const paper = {
  title:
    "Development and Validation of Machine Learning Models for Predicting 13 or More Sections in Mohs Micrographic Surgery",
  authors: ["Yagiz Alp Aksoy", "Simon Lee", "Gilberto Moreno-Bonilla"],
  hospital: "a high-volume Mohs surgical centre, Sydney",
  period: "2012–2017",
  deploymentUrl: "https://mohs.panacea-i.com",
} as const;

export const cohort = {
  n: 408,
  nGe13: 195,
  nLt13: 213,
  pctGe13: 47.8,
  pctLt13: 52.2,
  meanAge: 68.5,
  sdAge: 12.9,
  pctMale: 57.8,
  pctBcc: 89.9,
  pctScc: 10.1,
  pctHeadNeck: 93.4,
  pctHZone: 71.3,
  pctMZone: 24.5,
  pctLZone: 4.2,
  pctRecurrent: 31.1,
  pctAggressive: 61.0,
} as const;

/** Headline model result — stacking ensemble with LR meta-learner */
export const headline = {
  bestModel: "Stacking Ensemble (LR)",
  cvAuc: 0.891,
  cvAucCiLow: 0.849,
  cvAucCiHigh: 0.934,
  testAuc: 0.884,
  testAccuracy: 0.817,
  testF1: 0.81,
  brierScore: 0.129,
  algorithmsEvaluated: 30,
  highConfidenceRate: 0.707,
  highConfidenceAccuracy: 0.914,
  thresholdAreaCm2: 1.5, // SHAP dependence clinical cut-off
} as const;

/** Top SHAP importances (mean |SHAP|) from §3.4 */
export const shapImportance = [
  { feature: "Tumour Area (cm²)", value: 0.141 },
  { feature: "Tumour Size X", value: 0.086 },
  { feature: "Tumour Size Y", value: 0.068 },
  { feature: "Aggressive Histopathology", value: 0.046 },
  { feature: "Recurrence", value: 0.035 },
  { feature: "Age", value: 0.035 },
  { feature: "Body Zone", value: 0.006 },
  { feature: "Surgeon Experience", value: 0.008 },
  { feature: "See & Do", value: 0.005 },
] as const;

/** Table 3 — all 30 algorithms evaluated in manuscript §3.3. */
export const leaderboard = [
  { model: "Stacking Ensemble (LR meta)", category: "Ensemble", cvAuc: 0.891, cvSd: 0.042, cvAcc: 0.801, testAuc: 0.884, testF1: 0.81, brier: 0.129 },
  { model: "Random Forest", category: "Tree", cvAuc: 0.891, cvSd: 0.043, cvAcc: 0.807, testAuc: 0.851, testF1: 0.8, brier: 0.155 },
  { model: "Soft Voting Classifier", category: "Ensemble", cvAuc: 0.888, cvSd: 0.045, cvAcc: 0.801, testAuc: 0.873, testF1: 0.795, brier: 0.14 },
  { model: "Extra Trees", category: "Tree", cvAuc: 0.885, cvSd: 0.043, cvAcc: 0.819, testAuc: 0.87, testF1: 0.795, brier: 0.147 },
  { model: "CatBoost", category: "Gradient Boosting", cvAuc: 0.885, cvSd: 0.035, cvAcc: 0.807, testAuc: 0.881, testF1: 0.779, brier: 0.134 },
  { model: "MLP Wide 5-Layer (1024-512-256-128-64)", category: "Neural Network", cvAuc: 0.882, cvSd: 0.039, cvAcc: 0.816, testAuc: 0.874, testF1: 0.816, brier: 0.141 },
  { model: "MLP 7-Layer (512-256-128-64-32-16-8)", category: "Neural Network", cvAuc: 0.881, cvSd: 0.024, cvAcc: 0.816, testAuc: 0.871, testF1: 0.8, brier: 0.14 },
  { model: "SVM-RBF", category: "SVM", cvAuc: 0.877, cvSd: 0.024, cvAcc: 0.804, testAuc: 0.887, testF1: 0.785, brier: 0.137 },
  { model: "SVM-Linear", category: "SVM", cvAuc: 0.875, cvSd: 0.037, cvAcc: 0.807, testAuc: 0.886, testF1: 0.8, brier: 0.132 },
  { model: "Stacking Ensemble (XGB meta)", category: "Ensemble", cvAuc: 0.874, cvSd: 0.048, cvAcc: 0.795, testAuc: 0.875, testF1: 0.795, brier: 0.142 },
  { model: "AdaBoost", category: "Gradient Boosting", cvAuc: 0.872, cvSd: 0.049, cvAcc: 0.795, testAuc: 0.882, testF1: 0.779, brier: 0.207 },
  { model: "LightGBM", category: "Gradient Boosting", cvAuc: 0.87, cvSd: 0.053, cvAcc: 0.782, testAuc: 0.853, testF1: 0.76, brier: 0.177 },
  { model: "MLP Wide 3-Layer (512-256-128)", category: "Neural Network", cvAuc: 0.869, cvSd: 0.018, cvAcc: 0.785, testAuc: 0.892, testF1: 0.825, brier: 0.126 },
  { model: "Linear Discriminant Analysis", category: "Traditional", cvAuc: 0.869, cvSd: 0.029, cvAcc: 0.779, testAuc: 0.887, testF1: 0.795, brier: 0.13 },
  { model: "Logistic Regression", category: "Traditional", cvAuc: 0.867, cvSd: 0.034, cvAcc: 0.779, testAuc: 0.886, testF1: 0.789, brier: 0.133 },
  { model: "Ridge Classifier", category: "Traditional", cvAuc: 0.864, cvSd: 0.031, cvAcc: 0.779, testAuc: 0.883, testF1: 0.785, brier: 0.138 },
  { model: "Gradient Boosting (sklearn)", category: "Gradient Boosting", cvAuc: 0.861, cvSd: 0.04, cvAcc: 0.779, testAuc: 0.848, testF1: 0.755, brier: 0.173 },
  { model: "XGBoost", category: "Gradient Boosting", cvAuc: 0.858, cvSd: 0.046, cvAcc: 0.779, testAuc: 0.844, testF1: 0.753, brier: 0.168 },
  { model: "MLP-Large (256-128-64-32)", category: "Neural Network", cvAuc: 0.856, cvSd: 0.032, cvAcc: 0.772, testAuc: 0.85, testF1: 0.765, brier: 0.152 },
  { model: "Bagging Classifier", category: "Tree", cvAuc: 0.854, cvSd: 0.039, cvAcc: 0.776, testAuc: 0.842, testF1: 0.76, brier: 0.162 },
  { model: "MLP-Medium (128-64-32)", category: "Neural Network", cvAuc: 0.851, cvSd: 0.035, cvAcc: 0.773, testAuc: 0.848, testF1: 0.755, brier: 0.16 },
  { model: "MLP 6-Layer (512-256-128-64-32-16)", category: "Neural Network", cvAuc: 0.848, cvSd: 0.028, cvAcc: 0.772, testAuc: 0.853, testF1: 0.762, brier: 0.151 },
  { model: "MLP-Small (64-32)", category: "Neural Network", cvAuc: 0.842, cvSd: 0.042, cvAcc: 0.764, testAuc: 0.838, testF1: 0.748, brier: 0.169 },
  { model: "MLP 5-Layer (256-128-64-32-16)", category: "Neural Network", cvAuc: 0.84, cvSd: 0.031, cvAcc: 0.765, testAuc: 0.841, testF1: 0.75, brier: 0.165 },
  { model: "SVM-Polynomial", category: "SVM", cvAuc: 0.838, cvSd: 0.048, cvAcc: 0.752, testAuc: 0.821, testF1: 0.72, brier: 0.185 },
  { model: "Quadratic Discriminant Analysis", category: "Traditional", cvAuc: 0.819, cvSd: 0.053, cvAcc: 0.74, testAuc: 0.817, testF1: 0.71, brier: 0.196 },
  { model: "SVM-Sigmoid", category: "SVM", cvAuc: 0.806, cvSd: 0.055, cvAcc: 0.73, testAuc: 0.78, testF1: 0.692, brier: 0.212 },
  { model: "Decision Tree", category: "Tree", cvAuc: 0.762, cvSd: 0.062, cvAcc: 0.705, testAuc: 0.75, testF1: 0.68, brier: 0.245 },
  { model: "Naïve Bayes (Gaussian)", category: "Traditional", cvAuc: 0.755, cvSd: 0.048, cvAcc: 0.692, testAuc: 0.735, testF1: 0.66, brier: 0.268 },
  { model: "k-Nearest Neighbours", category: "Traditional", cvAuc: 0.72, cvSd: 0.069, cvAcc: 0.68, testAuc: 0.715, testF1: 0.65, brier: 0.275 },
] as const;

/** Univariate effects — Table 2 */
export const effects = {
  continuous: [
    { variable: "Tumour Area (cm²)", meanGe13: 6.32, meanLt13: 0.75, cohensD: 0.982, interpretation: "Large" },
    { variable: "Tumour Size X (mm)", meanGe13: 26.51, meanLt13: 9.12, cohensD: 1.237, interpretation: "Large" },
    { variable: "Tumour Size Y (mm)", meanGe13: 24.79, meanLt13: 8.67, cohensD: 1.111, interpretation: "Large" },
    { variable: "Age (years)", meanGe13: 71.03, meanLt13: 66.12, cohensD: 0.389, interpretation: "Small" },
  ],
  categorical: [
    { variable: "Recurrent", cramersV: 0.284, interpretation: "Medium", p: "<0.001" },
    { variable: "Body Zone", cramersV: 0.232, interpretation: "Small–Medium", p: "<0.001" },
    { variable: "Aggressive Histopathology", cramersV: 0.176, interpretation: "Small", p: "<0.001" },
    { variable: "Body Site", cramersV: 0.15, interpretation: "Small", p: "0.002" },
    { variable: "Tumour Type", cramersV: 0.113, interpretation: "Small", p: "0.023" },
    { variable: "Sex", cramersV: 0.087, interpretation: "Negligible", p: "0.081" },
    { variable: "Surgeon Experience", cramersV: 0.053, interpretation: "Negligible", p: "0.283" },
  ],
} as const;

/**
 * The H-zone paradox — §4.2 of the paper.
 * Counterintuitive finding: H-zone is anatomically "high risk"
 * yet requires FEWER sections, because L-zone tumours are ~6× larger.
 */
export const hZoneParadox = {
  zones: [
    { zone: "H", label: "High-risk", sites: "nose, ear, eye, lip, temple", meanSections: 9.0, meanAreaCm2: 2.12, pctGe13: 42, n: 291 },
    { zone: "M", label: "Medium-risk", sites: "forehead, cheek, scalp", meanSections: 11.5, meanAreaCm2: 4.8, pctGe13: 59, n: 100 },
    { zone: "L", label: "Low-risk", sites: "neck, hand, trunk, pretibial", meanSections: 15.7, meanAreaCm2: 12.55, pctGe13: 89, n: 17 },
  ],
  sectionsPerStageHvsL: { h: 3.0, l: 8.6 }, // p<0.001
} as const;

/**
 * MBS item codes (Australian Medicare, verified July 1 2025).
 * Derived downstream from predicted section count — not re-trained.
 */
export const mbsCodes = [
  { code: "31000", label: "Mohs 1–6 sections", fee: 677.7, rebate75: 508.3, gap: 169.4 },
  { code: "31001", label: "Mohs 7–12 sections", fee: 847.0, rebate75: 635.25, gap: 211.75 },
  { code: "31002", label: "Mohs ≥13 sections", fee: 1016.4, rebate75: 762.3, gap: 254.1 },
] as const;

/** Stage → OR time lookup (§3.1 of the technical reference) */
export const stageOrMinutes: Record<number, number> = {
  1: 45, 2: 70, 3: 95, 4: 120, 5: 145, 6: 170,
  7: 195, 8: 220, 9: 245, 10: 270, 11: 295,
};
