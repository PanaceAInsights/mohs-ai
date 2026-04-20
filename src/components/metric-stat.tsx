"use client";

import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function MetricStat({
  value,
  label,
  suffix = "",
  decimals = 0,
  accent = "primary",
  className,
}: {
  value: number;
  label: string;
  suffix?: string;
  decimals?: number;
  accent?: "primary" | "accent" | "destructive" | "foreground";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => v.toFixed(decimals));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, value, mv]);

  const accentClass = {
    primary: "text-primary",
    accent: "text-accent",
    destructive: "text-destructive",
    foreground: "text-foreground",
  }[accent];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
        <motion.span ref={ref} className={accentClass}>
          {display}
        </motion.span>
        {suffix && <span className={cn("text-2xl sm:text-3xl", accentClass)}>{suffix}</span>}
      </div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
