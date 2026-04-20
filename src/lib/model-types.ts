/**
 * Pre-operative patient input schema (16 features per manuscript §2.2).
 * Categoricals use the same numeric codes as the raw dataset (1/0, 1/2/3…)
 * plus `Unit` which is a string.
 */
export type PatientInput = {
  /** Age in years */
  Age: number;
  /** 0 = female, 1 = male */
  Sex: "0" | "1";
  /** 0 = no, 1 = yes — see-and-do surgical planning */
  See_Do: "0" | "1";
  /** 0 = <5 yr / <1500 cases, 1 = experienced */
  Experience: "0" | "1";
  /** 0 = primary, 1 = recurrent */
  Recurrent: "0" | "1";
  /** 1 = BCC, 2 = SCC, 3 = Other */
  Tumour_Stats: "1" | "2" | "3";
  /** 1 = Head & neck, 2 = Other */
  Body_Site: "1" | "2";
  /** 1 = H-zone (high risk), 2 = M-zone (medium), 3 = L-zone (low) */
  Body_Zone: "1" | "2" | "3";
  /** 1 = left, 2 = right, 3 = midline */
  Laterality: "1" | "2" | "3";
  /** Anatomical unit — NOSE, EAR, SCALP, TEMPLE, EYE, EYEBROW, LIP, CHEEK, OTHER */
  Unit: string;
  /** Largest tumour diameter in mm */
  Tumour_Size_X: number;
  /** Perpendicular widest diameter in mm */
  Tumour_Size_Y: number;
  /** 0 = non-aggressive subtype, 1 = aggressive subtype */
  Aggressive_Histopathology: "0" | "1";
  /** 1 = Excisional, 2 = Mohs, 3 = No margin control, 5 = Untreated */
  Biopsy: "1" | "2" | "3" | "5";
  /** 0 = no, 1 = yes, 2 = unknown */
  Smoking: "0" | "1" | "2";
};

export const DEFAULT_PATIENT: PatientInput = {
  Age: 68,
  Sex: "1",
  See_Do: "1",
  Experience: "1",
  Recurrent: "0",
  Tumour_Stats: "1",
  Body_Site: "1",
  Body_Zone: "1",
  Laterality: "3",
  Unit: "NOSE",
  Tumour_Size_X: 10,
  Tumour_Size_Y: 8,
  Aggressive_Histopathology: "0",
  Biopsy: "1",
  Smoking: "0",
};
