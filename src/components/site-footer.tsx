import Link from "next/link";
import { paper } from "@/lib/manuscript-data";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Clinical decision support for Mohs micrographic surgery. Not a substitute for
          clinical judgement. External validation pending.
        </p>
        <p className="tabular-nums">
          <span className="text-foreground/80">Aksoy, Lee, Moreno-Bonilla (2026)</span>{" "}
          · n={408} ·{" "}
          <Link href={paper.deploymentUrl} className="underline-offset-4 hover:underline">
            mohs.panacea-i.com
          </Link>
        </p>
      </div>
    </footer>
  );
}
