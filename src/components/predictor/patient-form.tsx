"use client";

import type { PatientInput } from "@/lib/model-types";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { modelMeta } from "@/lib/model";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS = [
  "NOSE", "EAR", "SCALP", "TEMPLE", "EYE", "EYEBROW", "LIP", "CHEEK", "OTHER",
];

type Setter = (patch: Partial<PatientInput>) => void;

export function PatientForm({
  value,
  onChange,
}: {
  value: PatientInput;
  onChange: Setter;
}) {
  return (
    <div className="space-y-8">
      <Section title="Patient" kicker="Demographics">
        <NumberSlider
          label="Age (years)"
          value={value.Age}
          min={25}
          max={99}
          step={1}
          cohort="Cohort mean 68.5"
          onChange={(v) => onChange({ Age: v })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice
            label="Sex"
            value={value.Sex}
            options={[
              { v: "1", l: "Male" },
              { v: "0", l: "Female" },
            ]}
            onChange={(v) => onChange({ Sex: v as PatientInput["Sex"] })}
          />
          <Choice
            label="Smoking"
            value={value.Smoking}
            options={[
              { v: "0", l: "Non" },
              { v: "1", l: "Yes" },
              { v: "2", l: "Unknown" },
            ]}
            onChange={(v) => onChange({ Smoking: v as PatientInput["Smoking"] })}
          />
          <Choice
            label="Laterality"
            value={value.Laterality}
            options={[
              { v: "1", l: "Left" },
              { v: "2", l: "Right" },
              { v: "3", l: "Midline" },
            ]}
            onChange={(v) => onChange({ Laterality: v as PatientInput["Laterality"] })}
          />
        </div>
      </Section>

      <Section title="Tumour" kicker="Strongest predictors">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberSlider
            label="Width / size X (mm)"
            value={value.Tumour_Size_X}
            min={2}
            max={80}
            step={1}
            cohort="Cohort median ~10 mm"
            onChange={(v) => onChange({ Tumour_Size_X: v })}
          />
          <NumberSlider
            label="Height / size Y (mm)"
            value={value.Tumour_Size_Y}
            min={2}
            max={80}
            step={1}
            cohort="Cohort median ~8 mm"
            onChange={(v) => onChange({ Tumour_Size_Y: v })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice
            label="Type"
            value={value.Tumour_Stats}
            options={[
              { v: "1", l: "BCC" },
              { v: "2", l: "SCC" },
              { v: "3", l: "Other" },
            ]}
            onChange={(v) => onChange({ Tumour_Stats: v as PatientInput["Tumour_Stats"] })}
          />
          <Choice
            label="Recurrent"
            value={value.Recurrent}
            options={[
              { v: "0", l: "Primary" },
              { v: "1", l: "Recurrent" },
            ]}
            onChange={(v) => onChange({ Recurrent: v as PatientInput["Recurrent"] })}
          />
          <Choice
            label="Aggressive histo"
            value={value.Aggressive_Histopathology}
            options={[
              { v: "0", l: "Non-aggressive" },
              { v: "1", l: "Aggressive" },
            ]}
            onChange={(v) =>
              onChange({
                Aggressive_Histopathology: v as PatientInput["Aggressive_Histopathology"],
              })
            }
          />
        </div>
        <Choice
          label="Biopsy method"
          value={value.Biopsy}
          options={[
            { v: "1", l: "Excisional" },
            { v: "2", l: "Mohs" },
            { v: "3", l: "No margin control" },
            { v: "5", l: "Untreated" },
          ]}
          onChange={(v) => onChange({ Biopsy: v as PatientInput["Biopsy"] })}
        />
      </Section>

      <Section title="Location" kicker="Anatomy">
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice
            label="Body site"
            value={value.Body_Site}
            options={[
              { v: "1", l: "Head & Neck" },
              { v: "2", l: "Other" },
            ]}
            onChange={(v) => onChange({ Body_Site: v as PatientInput["Body_Site"] })}
          />
          <Choice
            label="Body zone"
            value={value.Body_Zone}
            options={[
              { v: "1", l: "H (high-risk)" },
              { v: "2", l: "M (medium)" },
              { v: "3", l: "L (low)" },
            ]}
            onChange={(v) => onChange({ Body_Zone: v as PatientInput["Body_Zone"] })}
          />
        </div>
        <UnitPicker
          value={value.Unit}
          onChange={(v) => onChange({ Unit: v })}
          options={
            modelMeta.categorical.Unit?.length
              ? [...modelMeta.categorical.Unit]
              : UNIT_OPTIONS
          }
        />
      </Section>

      <Section title="Surgeon" kicker="Operator factors">
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice
            label="Experience"
            value={value.Experience}
            options={[
              { v: "1", l: ">5 yrs / 1500 cases" },
              { v: "0", l: "Junior" },
            ]}
            onChange={(v) => onChange({ Experience: v as PatientInput["Experience"] })}
          />
          <Choice
            label="See & do planning"
            value={value.See_Do}
            options={[
              { v: "1", l: "Yes" },
              { v: "0", l: "No" },
            ]}
            onChange={(v) => onChange({ See_Do: v as PatientInput["See_Do"] })}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-medium">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {kicker}
        </span>
      </div>
      <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
        {children}
      </div>
    </section>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  cohort,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  cohort?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <Slider
        className="mt-2"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) =>
          onChange(Array.isArray(v) ? v[0] ?? value : v)
        }
      />
      {cohort && (
        <p className="pt-1 text-[10px] text-muted-foreground">{cohort}</p>
      )}
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { v: T; l: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(opt.v)}
            aria-pressed={value === opt.v}
            className={cn(
              "flex-1 rounded-md border px-2 py-1.5 text-xs transition",
              value === opt.v
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
            )}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function UnitPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">
        Anatomical unit
      </Label>
      <div className="flex flex-wrap gap-1">
        {options.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onChange(u)}
            aria-pressed={value === u}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[11px] transition",
              value === u
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
            )}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}
