"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Send, Sparkles } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/predictor": "Predictor",
  "/evidence": "Evidence",
  "/why": "Why / SHAP",
  "/zones": "H-zone paradox",
  "/tools": "Clinical tools",
  "/chat": "Ask MOHS AI",
};

const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: "What is Mohs surgery?",
    prompt:
      "Explain what Mohs micrographic surgery is in plain language for a patient who has just been told they need one.",
  },
  {
    label: "Why ≥13 sections matters",
    prompt:
      "Why does it matter whether a case requires 13 or more sections? How should a surgeon use the probability in their planning?",
  },
  {
    label: "Interpret my prediction",
    prompt:
      "Given the current probability shown on this page, what factors are driving it and what should I tell the patient?",
  },
  {
    label: "The 1.5 cm² threshold",
    prompt:
      "Explain the 1.5 cm² tumour-area threshold mentioned in the paper. Is it clinically useful?",
  },
  {
    label: "BCC vs SCC",
    prompt:
      "Briefly contrast BCC and SCC — risk profile, typical Mohs pattern, patient counselling implications.",
  },
];

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const pageLabel = PAGE_LABELS[pathname] ?? pathname;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ context: { page: pageLabel } }),
      }),
    [pageLabel],
  );

  const [text, setText] = useState("");
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const submit = (prompt: string) => {
    const v = prompt.trim();
    if (!v || status === "streaming" || status === "submitted") return;
    void sendMessage({ text: v });
    setText("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* context strip */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span>AI assistant · grounded in the manuscript</span>
        <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
          {pageLabel}
        </Badge>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto px-4 py-4",
          compact ? "min-h-[320px]" : "min-h-[360px]",
        )}
      >
        {messages.length === 0 ? (
          <EmptyState onPick={submit} />
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse
                          key={i}
                          isAnimating={status === "streaming"}
                        >
                          {part.text}
                        </MessageResponse>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Dot delay={0} />
                    <Dot delay={0.15} />
                    <Dot delay={0.3} />
                  </span>
                </MessageContent>
              </Message>
            )}
          </div>
        )}

        {error && (() => {
          const raw = error.message ?? "Chat is unavailable.";
          // Pull any https:// URL out of the error so we can render it as a button
          const urlMatch = raw.match(/https:\/\/[^\s)"'`]+/);
          const upgradeUrl = urlMatch?.[0];
          const message = upgradeUrl ? raw.replace(upgradeUrl, "").trim() : raw;
          const isBillingError =
            /credit|tier|upgrade|top.?up|quota|billing/i.test(raw);
          return (
            <div className="mt-4 flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {isBillingError
                      ? "Assistant needs paid credits."
                      : "Chat is unavailable."}
                  </p>
                  <p className="text-destructive/80">{message}</p>
                </div>
              </div>
              {upgradeUrl && (
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 font-mono text-[11px] text-destructive transition hover:bg-destructive/20"
                >
                  Open Vercel billing →
                </a>
              )}
            </div>
          );
        })()}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="border-t border-border/60 bg-card/40 p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(text);
              }
            }}
            rows={1}
            placeholder="Ask about the model, this page, or Mohs surgery…"
            className="min-h-[40px] max-h-32 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {(status === "streaming" || status === "submitted") ? (
            <button
              type="button"
              onClick={() => stop()}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-3 text-xs text-muted-foreground transition hover:text-foreground"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Send message"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="pt-1.5 text-[10px] text-muted-foreground">
          The assistant is an aid, not a replacement for clinical judgement.
          Don't enter identifiable patient information.
        </p>
      </form>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="mx-auto max-w-md py-2 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <Sparkles className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-base font-medium">Ask MOHS AI</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        AI assistant grounded in the manuscript. Ask about predictions,
        clinical context, or Mohs surgery in general.
      </p>
      <div className="mt-4 grid gap-2 text-left">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="group rounded-lg border border-border/60 bg-background px-3 py-2 text-xs transition hover:border-primary/40 hover:bg-card"
          >
            <span className="text-foreground">{s.label}</span>
            <span className="block pt-0.5 text-[11px] text-muted-foreground">
              {s.prompt.slice(0, 80)}
              {s.prompt.length > 80 ? "…" : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
