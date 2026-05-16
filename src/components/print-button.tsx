"use client";

import { Printer } from "lucide-react";
import { track } from "@vercel/analytics";

/**
 * Trigger the browser's print flow. Combined with @media print styles in
 * globals.css, this produces a clean, chart-friendly PDF via
 * "Save as PDF" in any modern browser.
 */
export function PrintButton({
  label = "Print / save as PDF",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        track("pdf_export", { page: typeof window !== "undefined" ? window.location.pathname : "" });
        window.print();
      }}
      className="no-print inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
    >
      <Printer className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
