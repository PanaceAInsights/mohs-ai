import { NextRequest, NextResponse } from "next/server";
import { predict, modelMeta } from "@/lib/model";
import type { PatientInput } from "@/lib/model-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    model: "Calibrated Logistic Regression (shipping)",
    metrics: modelMeta.metrics,
    inputs: {
      numeric: modelMeta.numericFeatures,
      categorical: modelMeta.categoricalFeatures,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: Partial<PatientInput>;
  try {
    body = (await request.json()) as Partial<PatientInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Minimal validation — fall back to safe defaults for missing fields so the
  // endpoint is forgiving for demos, but require the sizing variables that
  // drive the prediction.
  if (typeof body.Tumour_Size_X !== "number" || typeof body.Tumour_Size_Y !== "number") {
    return NextResponse.json(
      { error: "Tumour_Size_X and Tumour_Size_Y (in mm) are required." },
      { status: 400 },
    );
  }

  const input: PatientInput = {
    Age: Number(body.Age ?? 68),
    Sex: (body.Sex ?? "1") as PatientInput["Sex"],
    See_Do: (body.See_Do ?? "0") as PatientInput["See_Do"],
    Experience: (body.Experience ?? "1") as PatientInput["Experience"],
    Recurrent: (body.Recurrent ?? "0") as PatientInput["Recurrent"],
    Tumour_Stats: (body.Tumour_Stats ?? "1") as PatientInput["Tumour_Stats"],
    Body_Site: (body.Body_Site ?? "1") as PatientInput["Body_Site"],
    Body_Zone: (body.Body_Zone ?? "1") as PatientInput["Body_Zone"],
    Laterality: (body.Laterality ?? "3") as PatientInput["Laterality"],
    Unit: String(body.Unit ?? "NOSE").toUpperCase(),
    Tumour_Size_X: Number(body.Tumour_Size_X),
    Tumour_Size_Y: Number(body.Tumour_Size_Y),
    Aggressive_Histopathology: (body.Aggressive_Histopathology ?? "0") as PatientInput["Aggressive_Histopathology"],
    Biopsy: (body.Biopsy ?? "1") as PatientInput["Biopsy"],
    Smoking: (body.Smoking ?? "0") as PatientInput["Smoking"],
  };

  const result = predict(input);
  return NextResponse.json({ input, ...result });
}
