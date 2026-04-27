/**
 * MOHS AI — ASD conference slides
 * 8-10 minute talk + 5 backup screenshot slides
 *
 * Run:
 *   node slides/build.mjs
 *
 * Output: slides/mohs-ai-asd.pptx
 */

import pptxgen from "pptxgenjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIG = (name) => join(__dirname, "figures", name);

// ─── Theme — matches the deployed app ─────────────────────────────────
const COL = {
  bg: "0A1418",
  card: "162028",
  fg: "F4F8FA",
  muted: "7E8B95",
  border: "2A3540",
  primary: "3FC1CB",
  accent: "E0A95B",
  destructive: "E37962",
};

const FONT_HEAD = "Calibri";
const FONT_BODY = "Calibri";
const FONT_MONO = "Consolas";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 × 7.5"
pres.title = "MOHS AI — Predicting ≥13 sections in Mohs surgery";
pres.author = "Aksoy, Lee, Moreno-Bonilla";

// Master slide — common background + footer
pres.defineSlideMaster({
  title: "DARK",
  background: { color: COL.bg },
  objects: [
    {
      rect: {
        x: 0, y: 0, w: 13.33, h: 0.05,
        fill: { color: COL.primary },
      },
    },
    {
      text: {
        text: "MOHS AI · ASD 2026 · mohs.panacea-i.com",
        options: {
          x: 0.4, y: 7.1, w: 12.5, h: 0.3,
          fontSize: 9, color: COL.muted, fontFace: FONT_BODY,
          align: "left",
        },
      },
    },
    {
      text: {
        placeholder: "slidenum",
        options: {
          x: 12.6, y: 7.1, w: 0.6, h: 0.3,
          fontSize: 9, color: COL.muted, fontFace: FONT_MONO,
          align: "right",
        },
      },
    },
  ],
});

// Helper — colored chip
const chip = (slide, x, y, label, color) => {
  slide.addText(label, {
    x, y, w: 1.8, h: 0.32,
    fontSize: 10, color: color, fontFace: FONT_MONO,
    align: "left", valign: "middle",
    fill: { color: COL.card }, line: { color: color, width: 0.75 },
    rectRadius: 0.04,
    margin: 0.08,
  });
};

// ─── 1. Title ──────────────────────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  s.addShape("rect", {
    x: 0, y: 0, w: 13.33, h: 7.5,
    fill: {
      type: "solid",
      color: COL.bg,
    },
  });
  s.addText("MOHS  AI", {
    x: 0.7, y: 0.55, w: 6, h: 0.5,
    fontSize: 16, color: COL.primary, fontFace: FONT_MONO,
    bold: true, charSpacing: 4,
  });
  s.addText([
    { text: "Predicting which Mohs cases\nwill need ", options: { color: COL.fg } },
    { text: "≥13 sections", options: { color: COL.primary } },
    { text: ",", options: { color: COL.fg } },
    { text: "\nbefore the patient sits down.", options: { color: COL.muted } },
  ], {
    x: 0.7, y: 1.6, w: 12, h: 3.4,
    fontSize: 48, fontFace: FONT_HEAD, bold: true,
    paraSpaceAfter: 4,
  });
  s.addText([
    { text: "Yagiz Alp Aksoy", options: { color: COL.fg, bold: true } },
    { text: " · Simon Lee · Gilberto Moreno-Bonilla", options: { color: COL.muted } },
  ], {
    x: 0.7, y: 5.6, w: 12, h: 0.4,
    fontSize: 16, fontFace: FONT_BODY,
  });
  s.addText("Australasian Society for Dermatology · 2026", {
    x: 0.7, y: 6.05, w: 8, h: 0.35,
    fontSize: 12, color: COL.muted, fontFace: FONT_BODY,
  });
  s.addText("mohs.panacea-i.com", {
    x: 0.7, y: 6.45, w: 8, h: 0.35,
    fontSize: 14, color: COL.accent, fontFace: FONT_MONO, bold: true,
  });
  // Right-side metric strip
  const metrics = [
    ["408", "procedures"],
    ["0.891", "CV-AUC"],
    ["91.4%", "high-conf accuracy"],
    ["1.5 cm²", "SHAP threshold"],
  ];
  metrics.forEach(([v, l], i) => {
    const y = 1.7 + i * 1.05;
    s.addText(v, {
      x: 9.5, y, w: 3, h: 0.55,
      fontSize: 32, color: COL.primary, fontFace: FONT_MONO, bold: true,
      align: "right",
    });
    s.addText(l, {
      x: 9.5, y: y + 0.55, w: 3, h: 0.3,
      fontSize: 10, color: COL.muted, fontFace: FONT_BODY,
      align: "right", charSpacing: 2,
    });
  });
}

// ─── 2. The clinical question ───────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  THE QUESTION", COL.primary);
  s.addText("Section count varies wildly — and we can't currently predict it.", {
    x: 0.7, y: 1.1, w: 12, h: 1.0,
    fontSize: 32, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });
  s.addImage({
    path: FIG("section_distribution.png"),
    x: 0.7, y: 2.4, w: 8.0, h: 4.0,
  });
  // Right-side callout cards
  const cards = [
    ["1 → 41", "sections per case in this cohort"],
    ["≥13", "MBS 31002 cut-off · longest cases"],
    ["47.8%", "of cases needed ≥13 sections"],
  ];
  cards.forEach(([big, small], i) => {
    const y = 2.4 + i * 1.35;
    s.addShape("roundRect", {
      x: 9.0, y, w: 3.7, h: 1.2,
      fill: { color: COL.card }, line: { color: COL.border, width: 0.5 },
      rectRadius: 0.08,
    });
    s.addText(big, {
      x: 9.2, y: y + 0.1, w: 3.4, h: 0.55,
      fontSize: 28, color: COL.accent, fontFace: FONT_MONO, bold: true,
    });
    s.addText(small, {
      x: 9.2, y: y + 0.65, w: 3.4, h: 0.45,
      fontSize: 11, color: COL.muted, fontFace: FONT_BODY,
    });
  });
}

// ─── 3. Cohort + methods ───────────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  COHORT & METHODS", COL.primary);
  s.addText("408 consecutive Mohs procedures · pre-operative features only", {
    x: 0.7, y: 1.1, w: 12, h: 0.7,
    fontSize: 26, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });

  // 4 KPI boxes
  const k = [
    ["408", "consecutive procedures"],
    ["16", "pre-operative variables"],
    ["30", "ML algorithms tested"],
    ["80 / 20", "train · test split, 5-fold CV"],
  ];
  k.forEach(([big, small], i) => {
    const x = 0.7 + i * 3.05;
    s.addShape("roundRect", {
      x, y: 2.0, w: 2.85, h: 1.3,
      fill: { color: COL.card }, line: { color: COL.border, width: 0.5 },
      rectRadius: 0.08,
    });
    s.addText(big, {
      x: x + 0.2, y: 2.1, w: 2.6, h: 0.65,
      fontSize: 30, color: COL.primary, fontFace: FONT_MONO, bold: true,
    });
    s.addText(small, {
      x: x + 0.2, y: 2.75, w: 2.6, h: 0.45,
      fontSize: 11, color: COL.muted, fontFace: FONT_BODY,
    });
  });

  // Highlights of cohort
  s.addText("Cohort highlights", {
    x: 0.7, y: 3.7, w: 6, h: 0.4,
    fontSize: 14, color: COL.muted, fontFace: FONT_BODY, bold: true, charSpacing: 1,
  });
  const rowsLeft = [
    ["Mean age", "68.5 ± 12.9 yrs"],
    ["Male", "57.8%"],
    ["BCC", "89.9%"],
    ["Head & neck", "93.4%"],
  ];
  rowsLeft.forEach(([k, v], i) => {
    const y = 4.15 + i * 0.4;
    s.addText(k, { x: 0.7, y, w: 3.0, h: 0.35, fontSize: 13, color: COL.fg, fontFace: FONT_BODY });
    s.addText(v, { x: 3.5, y, w: 2.3, h: 0.35, fontSize: 13, color: COL.fg, fontFace: FONT_MONO, align: "right" });
  });

  s.addText("Predictors used", {
    x: 7.1, y: 3.7, w: 6, h: 0.4,
    fontSize: 14, color: COL.muted, fontFace: FONT_BODY, bold: true, charSpacing: 1,
  });
  s.addText([
    "Demographics ", "(age, sex, smoking)\n",
    "Tumour ", "(size X, Y, area, type, recurrence, aggressive histo)\n",
    "Anatomy ", "(body site, zone, unit, laterality)\n",
    "Surgeon ", "(experience, see-and-do)",
  ].map((t, i) => i % 2 === 0
    ? { text: t, options: { bold: true, color: COL.primary } }
    : { text: t, options: { color: COL.fg } }
  ), {
    x: 7.1, y: 4.15, w: 5.6, h: 2.4,
    fontSize: 13, fontFace: FONT_BODY, paraSpaceAfter: 4,
  });
}

// ─── 4. Headline AUC ───────────────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  HEADLINE RESULT", COL.accent);
  s.addText("CV-AUC", {
    x: 0.7, y: 1.5, w: 12, h: 0.6,
    fontSize: 22, color: COL.muted, fontFace: FONT_BODY, charSpacing: 2,
  });
  s.addText("0.891", {
    x: 0.7, y: 2.0, w: 12, h: 3.5,
    fontSize: 280, color: COL.primary, fontFace: FONT_MONO, bold: true,
  });
  s.addText("95% CI 0.849 – 0.934 · stacking ensemble · n = 408", {
    x: 0.7, y: 5.7, w: 12, h: 0.5,
    fontSize: 18, color: COL.fg, fontFace: FONT_BODY,
  });
  s.addText("Test-AUC 0.884 · F1 0.81 · 30 algorithms compared", {
    x: 0.7, y: 6.15, w: 12, h: 0.4,
    fontSize: 13, color: COL.muted, fontFace: FONT_BODY,
  });
}

// ─── 5. SHAP — tumour area dominates ─────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  WHY THE MODEL DECIDES", COL.primary);
  s.addText("Tumour area dominates every other feature", {
    x: 0.7, y: 1.1, w: 12, h: 0.7,
    fontSize: 26, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });
  s.addImage({
    path: FIG("shap_importance.png"),
    x: 0.7, y: 1.95, w: 8.0, h: 4.5,
  });
  // Side panel with the take-aways
  const takeaways = [
    ["Area", "is nearly as informative as the next two combined."],
    ["Recurrence + aggressive histo", "are the next clinically actionable signals."],
    ["Surgeon experience", "did not contribute meaningfully — likely selection bias."],
  ];
  takeaways.forEach(([head, body], i) => {
    const y = 2.0 + i * 1.45;
    s.addShape("roundRect", {
      x: 9.0, y, w: 3.8, h: 1.3,
      fill: { color: COL.card }, line: { color: COL.border, width: 0.5 },
      rectRadius: 0.08,
    });
    s.addText(head, {
      x: 9.2, y: y + 0.1, w: 3.5, h: 0.4,
      fontSize: 13, color: COL.accent, fontFace: FONT_BODY, bold: true,
    });
    s.addText(body, {
      x: 9.2, y: y + 0.5, w: 3.5, h: 0.75,
      fontSize: 11, color: COL.fg, fontFace: FONT_BODY,
    });
  });
}

// ─── 6. The 1.5 cm² threshold ──────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  CLINICAL TAKE-AWAY", COL.accent);
  s.addText([
    { text: "Above ", options: { color: COL.fg } },
    { text: "~1.5 cm²", options: { color: COL.accent, bold: true } },
    { text: " ellipse area, probability of ≥13 sections climbs steeply.", options: { color: COL.fg } },
  ], {
    x: 0.7, y: 1.1, w: 12, h: 1.4,
    fontSize: 26, fontFace: FONT_HEAD, bold: true,
  });
  s.addImage({
    path: FIG("dependence_threshold.png"),
    x: 0.7, y: 2.6, w: 9.5, h: 4.0,
  });
  s.addShape("roundRect", {
    x: 10.5, y: 2.6, w: 2.4, h: 1.6,
    fill: { color: COL.card }, line: { color: COL.accent, width: 0.75 },
    rectRadius: 0.08,
  });
  s.addText("Ellipse area\n= π × (X/2) × (Y/2)", {
    x: 10.6, y: 2.7, w: 2.2, h: 0.7,
    fontSize: 11, color: COL.muted, fontFace: FONT_MONO,
  });
  s.addText("e.g. 18 × 12 mm\n→ 1.70 cm²", {
    x: 10.6, y: 3.4, w: 2.2, h: 0.7,
    fontSize: 12, color: COL.accent, fontFace: FONT_MONO, bold: true,
  });
  s.addText(
    "A practical rule clinicians can use at first consultation, before any imaging or biopsy results return.",
    { x: 10.5, y: 4.4, w: 2.4, h: 1.4,
      fontSize: 11, color: COL.fg, fontFace: FONT_BODY }
  );
}

// ─── 7. The H-zone paradox ─────────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  THE COUNTER-INTUITIVE FINDING", COL.destructive);
  s.addText([
    { text: "H-zone is anatomically high-risk — yet needs ", options: { color: COL.fg } },
    { text: "fewer", options: { color: COL.destructive, italic: true } },
    { text: " sections than L-zone.", options: { color: COL.fg } },
  ], {
    x: 0.7, y: 1.1, w: 12, h: 1.0,
    fontSize: 24, fontFace: FONT_HEAD, bold: true,
  });
  s.addImage({
    path: FIG("hzone_scatter.png"),
    x: 0.7, y: 2.2, w: 8.0, h: 4.4,
  });
  // Right-side three rows: zone, area, sections
  const zones = [
    { z: "H-zone", n: 291, area: "2.12", sec: "9.0", pct: "42%", color: COL.primary },
    { z: "M-zone", n: 100, area: "4.80", sec: "11.5", pct: "59%", color: COL.accent },
    { z: "L-zone", n: 17,  area: "12.55", sec: "15.7", pct: "89%", color: COL.destructive },
  ];
  zones.forEach((zd, i) => {
    const y = 2.3 + i * 1.45;
    s.addShape("roundRect", {
      x: 9.0, y, w: 3.8, h: 1.3,
      fill: { color: COL.card }, line: { color: zd.color, width: 0.75 },
      rectRadius: 0.08,
    });
    s.addText(`${zd.z}  n=${zd.n}`, {
      x: 9.2, y: y + 0.1, w: 3.5, h: 0.35,
      fontSize: 12, color: zd.color, fontFace: FONT_BODY, bold: true,
    });
    s.addText(`${zd.sec}  sections  ·  ${zd.pct} ≥13`, {
      x: 9.2, y: y + 0.45, w: 3.5, h: 0.35,
      fontSize: 13, color: COL.fg, fontFace: FONT_MONO, bold: true,
    });
    s.addText(`mean tumour ${zd.area} cm²`, {
      x: 9.2, y: y + 0.85, w: 3.5, h: 0.3,
      fontSize: 11, color: COL.muted, fontFace: FONT_BODY,
    });
  });
}

// ─── 8. Surgeon-behaviour clue + confidence ────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  EXPLAINING THE PARADOX", COL.primary);
  s.addText("Sections per stage tell us what's really happening.", {
    x: 0.7, y: 1.1, w: 12, h: 0.7,
    fontSize: 24, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });

  // Two giant numbers
  const cmp = [
    { v: "3.0", l: "H-zone sections / stage", color: COL.primary },
    { v: "8.6", l: "L-zone sections / stage", color: COL.destructive },
  ];
  cmp.forEach((c, i) => {
    const x = 0.7 + i * 4.2;
    s.addShape("roundRect", {
      x, y: 2.2, w: 3.9, h: 2.7,
      fill: { color: COL.card }, line: { color: c.color, width: 0.75 },
      rectRadius: 0.08,
    });
    s.addText(c.v, {
      x: x + 0.2, y: 2.4, w: 3.5, h: 1.6,
      fontSize: 96, color: c.color, fontFace: FONT_MONO, bold: true,
      align: "center",
    });
    s.addText(c.l, {
      x: x + 0.2, y: 4.0, w: 3.5, h: 0.7,
      fontSize: 13, color: COL.muted, fontFace: FONT_BODY,
      align: "center", charSpacing: 1,
    });
  });

  s.addText([
    { text: "Surgeons take smaller, more conservative slices on cosmetically sensitive territory ",
      options: { color: COL.fg } },
    { text: "(stages did not differ by zone, p = 0.11).",
      options: { color: COL.muted, italic: true } },
  ], {
    x: 0.7, y: 5.1, w: 8, h: 1.0,
    fontSize: 14, fontFace: FONT_BODY,
  });

  // Side: confidence stratification
  s.addImage({ path: FIG("confidence_donut.png"), x: 9.2, y: 2.0, w: 3.5, h: 3.4 });
  s.addText([
    { text: "70.7% high-confidence cases\n",
      options: { bold: true, color: COL.accent } },
    { text: "→ 91.4% accuracy on those.",
      options: { color: COL.fg } },
  ], {
    x: 9.0, y: 5.5, w: 3.9, h: 1.0,
    fontSize: 12, fontFace: FONT_BODY, align: "center",
  });
}

// ─── 9. Hand-off to live demo ──────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: COL.bg } });
  s.addText("Now let's open the tool.", {
    x: 0.7, y: 2.4, w: 12, h: 1.2,
    fontSize: 56, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });
  s.addText("mohs.panacea-i.com", {
    x: 0.7, y: 3.8, w: 12, h: 1.0,
    fontSize: 64, color: COL.primary, fontFace: FONT_MONO, bold: true,
  });
  s.addText(
    "Live ensemble · per-model breakdown · threshold visual · MBS billing · OR scheduler",
    { x: 0.7, y: 5.0, w: 12, h: 0.7,
      fontSize: 16, color: COL.muted, fontFace: FONT_BODY }
  );
}

// ─── 10–14. Backup screenshot slides ──────────────────────────────────
const backupSlides = [
  {
    title: "Backup · Predictor",
    url: "/predictor",
    note: "Probability ring with 95% CI band · ensemble breakdown · per-feature factor bars · MBS code preview",
  },
  {
    title: "Backup · Why / SHAP dependence",
    url: "/why",
    note: "Live tumour-area sweep with 1.5 cm² annotation · per-case waterfall from cohort baseline",
  },
  {
    title: "Backup · H-zone paradox explorer",
    url: "/zones",
    note: "Toggle between mean sections and mean tumour area — bars flip · interactive scatter of all 408 cases",
  },
  {
    title: "Backup · Clinical tools — day scheduler",
    url: "/tools",
    note: "Multi-room Mohs day Gantt with patient names, arrival times, lunch break, CSV export",
  },
  {
    title: "Backup · Evidence — 30-model leaderboard",
    url: "/evidence",
    note: "Filter by family · sort by CV-AUC, Test-AUC, F1, Brier · stacking ensemble tops the table",
  },
];

backupSlides.forEach((b) => {
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  BACKUP", COL.muted);
  s.addText(b.title, {
    x: 0.7, y: 1.1, w: 12, h: 0.7,
    fontSize: 24, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });
  // Frame for the screenshot
  s.addShape("roundRect", {
    x: 0.7, y: 2.0, w: 11.9, h: 4.6,
    fill: { color: COL.card }, line: { color: COL.border, width: 0.5 },
    rectRadius: 0.08,
  });
  s.addText("Insert screenshot of\nmohs.panacea-i.com" + b.url, {
    x: 0.7, y: 3.4, w: 11.9, h: 1.5,
    fontSize: 18, color: COL.muted, fontFace: FONT_MONO,
    align: "center", italic: true,
  });
  s.addText(b.note, {
    x: 0.7, y: 6.7, w: 12, h: 0.4,
    fontSize: 12, color: COL.muted, fontFace: FONT_BODY,
  });
});

// ─── 15. Limitations + conclusions ─────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  chip(s, 0.7, 0.55, "  LIMITATIONS & CONCLUSIONS", COL.primary);
  s.addText("Three sentences to take home.", {
    x: 0.7, y: 1.1, w: 12, h: 0.7,
    fontSize: 24, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });

  const items = [
    { n: "1", h: "Pre-operative ML predicts ≥13 sections at AUC 0.89.", b: "Using only features any clinician already records at first consultation." },
    { n: "2", h: "Tumour area is the dominant predictor.", b: "Clean threshold near 1.5 cm² ellipse area." },
    { n: "3", h: "Anatomical risk-zone label is not destiny.", b: "Size drives sections, not 'H' vs 'L'. Pattern needs external validation." },
  ];
  items.forEach((it, i) => {
    const y = 2.1 + i * 1.45;
    s.addText(it.n, {
      x: 0.8, y, w: 0.8, h: 1.2,
      fontSize: 64, color: COL.accent, fontFace: FONT_MONO, bold: true,
    });
    s.addText(it.h, {
      x: 1.7, y: y + 0.05, w: 11, h: 0.55,
      fontSize: 20, color: COL.fg, fontFace: FONT_HEAD, bold: true,
    });
    s.addText(it.b, {
      x: 1.7, y: y + 0.65, w: 11, h: 0.5,
      fontSize: 13, color: COL.muted, fontFace: FONT_BODY,
    });
  });

  s.addText([
    { text: "Limitations · ", options: { color: COL.muted, bold: true } },
    { text: "single-centre · L-zone n = 17 · external validation pending — collaborators welcome.",
      options: { color: COL.muted } },
  ], {
    x: 0.7, y: 6.4, w: 12, h: 0.5,
    fontSize: 12, fontFace: FONT_BODY,
  });
}

// ─── 16. Acknowledgements / Q&A ────────────────────────────────────────
{
  const s = pres.addSlide({ masterName: "DARK" });
  s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: COL.bg } });
  s.addText("Thank you.", {
    x: 0.7, y: 2.0, w: 12, h: 1.2,
    fontSize: 64, color: COL.fg, fontFace: FONT_HEAD, bold: true,
  });
  s.addText("mohs.panacea-i.com", {
    x: 0.7, y: 3.4, w: 12, h: 1.0,
    fontSize: 44, color: COL.primary, fontFace: FONT_MONO, bold: true,
  });
  s.addText([
    { text: "Open to test · open to collaborate.\n", options: { color: COL.fg } },
    { text: "External validation invitation: ", options: { color: COL.muted } },
    { text: "your-email@your-domain.com", options: { color: COL.accent, italic: true } },
  ], {
    x: 0.7, y: 4.7, w: 12, h: 1.5,
    fontSize: 18, fontFace: FONT_BODY,
  });
  s.addText("Aksoy, Lee, Moreno-Bonilla. Development and Validation of Machine Learning Models for Predicting 13 or More Sections in Mohs Micrographic Surgery. 2026.", {
    x: 0.7, y: 6.4, w: 12, h: 0.6,
    fontSize: 11, color: COL.muted, fontFace: FONT_BODY, italic: true,
  });
}

const out = join(__dirname, "mohs-ai-asd.pptx");
await pres.writeFile({ fileName: out });
console.log(`✓ Saved → ${out}`);
