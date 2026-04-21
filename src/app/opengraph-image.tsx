import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MOHS AI — Predict which Mohs cases will need ≥13 sections";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 64,
          background:
            "linear-gradient(135deg, oklch(0.13 0.018 240) 0%, oklch(0.20 0.03 220) 100%)",
          color: "white",
          fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, oklch(0.78 0.14 195), oklch(0.82 0.16 75))",
              color: "black",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ⚕
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 22, letterSpacing: -0.3 }}>
              MOHS <span style={{ color: "oklch(0.78 0.14 195)" }}>AI</span>
            </span>
            <span style={{ fontSize: 14, opacity: 0.65 }}>
              mohs.panacea-i.com
            </span>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              fontSize: 72,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              fontWeight: 600,
              maxWidth: 1000,
            }}
          >
            Predict which Mohs cases
            <br />
            will need{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.78 0.14 195), oklch(0.82 0.16 75))",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              ≥13 sections
            </span>
            .
          </span>
          <span style={{ fontSize: 22, opacity: 0.7, maxWidth: 900 }}>
            30 ML algorithms · n = 408 · AUC 0.891 · SHAP-explainable
          </span>
        </div>

        {/* stats row */}
        <div
          style={{
            display: "flex",
            gap: 40,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 20,
          }}
        >
          <Stat value="0.891" label="CV AUC · stacking ensemble" />
          <Stat value="91.4%" label="High-confidence accuracy" />
          <Stat value="1.5 cm²" label="SHAP threshold" />
          <Stat value="408" label="procedures" />
        </div>
      </div>
    ),
    { ...size },
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: 32,
          color: "oklch(0.78 0.14 195)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>{label}</span>
    </div>
  );
}
