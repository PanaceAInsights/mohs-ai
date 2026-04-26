import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "@/components/chat/chat-panel";

export const metadata = {
  title: "Ask MOHS AI",
  description:
    "AI assistant grounded in the manuscript. Ask about predictions, clinical context, or patient education for Mohs surgery.",
};

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 border-b border-border/60 pb-6">
        <Badge
          variant="outline"
          className="mb-3 border-accent/40 bg-accent/5 text-accent"
        >
          AI assistant · grounded in the manuscript
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ask MOHS AI
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          An assistant grounded in the manuscript — it knows the cohort,
          the SHAP findings, and the 1.5 cm² threshold. Ask it to explain a
          prediction, unpack a statistic, or translate a clinical concept
          into plain language.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <div className="flex min-h-[70vh] flex-col">
          <ChatPanel />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Not medical advice. Don't enter identifiable patient information. The
        assistant can hallucinate — always verify clinical claims with the
        manuscript or a specialist.
      </p>
    </div>
  );
}
