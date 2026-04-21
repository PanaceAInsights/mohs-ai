"use client";

import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";

/**
 * Floating assistant button — fixed bottom-right. Opens a side sheet
 * containing the ChatPanel. Hidden on /chat (which is the full-page view).
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (pathname === "/chat") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open MOHS AI assistant"
        className={cn(
          "fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 py-2.5 text-sm shadow-lg backdrop-blur transition hover:border-primary/40 hover:text-primary",
          "sm:bottom-6 sm:right-6",
          open && "pointer-events-none opacity-0",
        )}
      >
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <MessageSquarePlus className="h-3 w-3" />
        </span>
        <span className="hidden sm:inline">Ask MOHS AI</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border/60 bg-background shadow-2xl sm:w-[440px]"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-medium">Ask MOHS AI</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <ChatPanel compact />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
