import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat
 * Body: { messages: UIMessage[], context?: { page, prediction, patient } }
 *
 * Routes through the Vercel AI Gateway. On Vercel deployments auth happens
 * automatically via the project's OIDC token — no key management needed.
 * For local `npm run dev`, run `vercel env pull` once to populate .env.local
 * with a short-lived OIDC token that rotates automatically.
 */

const MODEL = "anthropic/claude-sonnet-4.6";

const SYSTEM_PROMPT = `You are the MOHS AI Assistant, embedded in a clinical decision-support application for Mohs micrographic surgery — a tissue-sparing skin-cancer treatment.

Background the app is built on (cite these when relevant):
- 408 consecutive procedures at The Skin Hospital, Sydney (2012–2017)
- 195 (47.8%) required ≥13 tissue sections; 213 (<13)
- Aksoy, Lee, Moreno-Bonilla, 2026 — 30 ML algorithms evaluated
- Stacking Ensemble: CV AUC 0.891 (95% CI 0.849–0.934), test AUC 0.884
- Tumour area (ellipse formula, π × X/2 × Y/2) is the dominant predictor (SHAP 0.141)
- Threshold: ≥1.5 cm² sharply increases probability of ≥13 sections
- H-zone paradox: H-zone tumours are anatomically high-risk but in this cohort require FEWER sections than L-zone, because L-zone tumours are ~6× larger
- Deployed shipping model: Calibrated Logistic Regression, test AUC 0.884

You help:
- Clinicians understand a prediction ("why is this patient 71% ≥13?") with reference to SHAP contributions and the 1.5 cm² threshold
- Patients understand Mohs surgery in plain language (no scare words)
- Trainees learn the research background

Rules:
- Always ground explanations in the manuscript findings above — don't invent new statistics
- When the user shares prediction context, reference their actual numbers
- Never recommend changing a surgical plan — this is decision support, not a substitute for clinical judgement
- If asked "is this safe / will I be OK?", be reassuring but honest: cure rates >98% for primary BCC with Mohs; refer questions about their individual case to their surgeon
- Suggest credible links for further reading:
  - https://www.dermcoll.edu.au/ (Australasian College of Dermatologists)
  - https://dermnetnz.org/topics/mohs-surgery (DermNet NZ)
  - https://www.aad.org/public/diseases/skin-cancer/types/common/mohs-surgery (AAD patient info)
  - https://pubmed.ncbi.nlm.nih.gov/ (PubMed)
- Keep answers concise (3–6 short paragraphs max, use Markdown lists when helpful)
- If the user asks something far outside Mohs / skin cancer / the app, politely redirect`;

type ChatContext = {
  page?: string;
  prediction?: {
    probability?: number;
    label?: string;
    confidence?: string;
    tumourAreaCm2?: number;
    exceedsThreshold?: boolean;
    mbs?: { code?: string; label?: string };
  };
};

function renderContext(ctx: ChatContext | undefined): string {
  if (!ctx) return "";
  const lines: string[] = ["<user_context>"];
  if (ctx.page) lines.push(`current page: ${ctx.page}`);
  if (ctx.prediction) {
    const p = ctx.prediction;
    if (p.probability != null)
      lines.push(
        `probability of ≥13 sections: ${(p.probability * 100).toFixed(1)}%`,
      );
    if (p.label) lines.push(`prediction: ${p.label}`);
    if (p.confidence) lines.push(`confidence: ${p.confidence}`);
    if (p.tumourAreaCm2 != null)
      lines.push(`tumour area: ${p.tumourAreaCm2.toFixed(2)} cm²`);
    if (p.exceedsThreshold) lines.push(`above the 1.5 cm² threshold`);
    if (p.mbs?.code) lines.push(`est. MBS: ${p.mbs.code} ${p.mbs.label ?? ""}`);
  }
  lines.push("</user_context>");
  return lines.join("\n");
}

export async function POST(req: Request) {
  let body: { messages?: UIMessage[]; context?: ChatContext };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const messages = body.messages ?? [];
  const contextBlock = renderContext(body.context);
  const system = contextBlock
    ? `${SYSTEM_PROMPT}\n\n${contextBlock}`
    : SYSTEM_PROMPT;

  try {
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: MODEL,
      system,
      messages: modelMessages,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/chat] streamText failed", message);
    return NextResponse.json(
      {
        error:
          "Chat is not configured. Enable the Vercel AI Gateway for this project; for local development run `vercel env pull` once to fetch an OIDC token.",
        detail: message,
      },
      { status: 503 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ model: MODEL, configured: "runtime" });
}
