import { PDFDocument, StandardFonts, rgb, type RGB } from 'pdf-lib';
import type { AIOutput, DimensionKey, DimensionScores, TierValue } from '@/types';
import { DIMENSION_META, TIER_META } from '@/types';

const W = 595;
const H = 842;
const MARGIN = 56;
const LINE_HEIGHT = 20;

// Brand colours as rgb() fractions
const NAVY  = rgb(0.024, 0.047, 0.094);
const CYAN  = rgb(0.000, 0.706, 0.784);
const WHITE = rgb(1,     1,     1    );
const OFFWH = rgb(0.957, 0.965, 0.984);
const MUTED = rgb(0.482, 0.518, 0.580);
const DARK  = rgb(0.102, 0.102, 0.180);
const BODY  = rgb(0.227, 0.271, 0.337);

const TIER_COLORS: Record<TierValue, RGB> = {
  idea_stage:           rgb(0.800, 0.122, 0.165),
  seed_ready_with_gaps: rgb(0.784, 0.537, 0.039),
  series_a_fundable:    rgb(0.290, 0.451, 0.769),
  top_decile_founder:   rgb(0.055, 0.486, 0.310),
};

// WinAnsi (Standard PDF fonts) can't encode Unicode > U+00FF.
// Replace common Indian/typographic characters before drawing.
function pdf(text: string): string {
  return text
    .replace(/₹/g,       'Rs.')   // Indian Rupee sign
    .replace(/–/g,  '-')     // en dash
    .replace(/—/g,  '--')    // em dash
    .replace(/‘/g,  "'")     // left single quote
    .replace(/’/g,  "'")     // right single quote
    .replace(/“/g,  '"')     // left double quote
    .replace(/”/g,  '"')     // right double quote
    .replace(/…/g,  '...')   // ellipsis
    .replace(/[^\x00-\xFF]/g, ''); // strip anything else that can't encode
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

interface PDFInput {
  founderName:     string;
  companyName:     string;
  finalScore:      number;
  tier:            TierValue;
  dimensionScores: DimensionScores;
  aiOutput:        AIOutput;
  logoBytes?:      Uint8Array;
}

export async function generatePDF(input: PDFInput): Promise<Uint8Array> {
  const { founderName, companyName, finalScore, tier, dimensionScores, aiOutput, logoBytes } = input;
  const tierMeta  = TIER_META[tier];
  const tierColor = TIER_COLORS[tier];

  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  let logo;
  if (logoBytes) {
    try { logo = await doc.embedPng(logoBytes); } catch { logo = undefined; }
  }

  // ─────────────────────────────── PAGE 1 — COVER ──────────────────────────
  const p1 = doc.addPage([W, H]);

  // Navy background
  p1.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });

  // Cyan accent strip top
  p1.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: CYAN });

  // Dev Mantra label
  p1.drawText(pdf('DEV MANTRA · FUNDABILITY INDEX'), {
    x: MARGIN, y: H - 52, size: 9, font: bold, color: CYAN,
  });

  // Date
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  p1.drawText(pdf(dateStr), { x: W - MARGIN - 100, y: H - 52, size: 9, font: reg, color: MUTED });

  // Logo (top-right area)
  if (logo) {
    const logoW = 120;
    const logoH = logo.height * (logoW / logo.width);
    p1.drawImage(logo, { x: W - MARGIN - logoW, y: H - 100, width: logoW, height: logoH });
  }

  // Score — large
  const scoreStr = String(finalScore);
  const scoreSize = 120;
  const scoreW = bold.widthOfTextAtSize(scoreStr, scoreSize);
  p1.drawText(scoreStr, {
    x: MARGIN, y: H / 2 + 60, size: scoreSize, font: bold, color: WHITE,
  });
  p1.drawText('/100', {
    x: MARGIN + scoreW + 8, y: H / 2 + 60, size: 36, font: reg, color: MUTED,
  });

  // Tier badge
  const tierLabel = pdf(tierMeta.label);
  const badgeW    = bold.widthOfTextAtSize(tierLabel, 14) + 28;
  p1.drawRectangle({ x: MARGIN, y: H / 2 + 20, width: badgeW, height: 28, color: tierColor });
  p1.drawText(tierLabel, { x: MARGIN + 14, y: H / 2 + 29, size: 14, font: bold, color: WHITE });

  // Company / founder
  p1.drawText(pdf(companyName), { x: MARGIN, y: H / 2 - 20, size: 28, font: bold, color: WHITE });
  p1.drawText(pdf(`Prepared for ${founderName}`), { x: MARGIN, y: H / 2 - 50, size: 13, font: reg, color: MUTED });

  // Divider
  p1.drawLine({ start: { x: MARGIN, y: 120 }, end: { x: W - MARGIN, y: 120 }, thickness: 1, color: MUTED, opacity: 0.2 });

  // Footer
  p1.drawText(
    pdf('Prepared by Dev Mantra Financial Services · N. Tatia & Associates · 20+ years of advisory · Rs.5,000 Cr+ in transactions · devmantra.com'),
    { x: MARGIN, y: 96, size: 8, font: reg, color: MUTED },
  );

  // ─────────────────────────── PAGE 2 — VERDICT + DIMENSIONS ──────────────
  const p2 = doc.addPage([W, H]);
  p2.drawRectangle({ x: 0, y: 0, width: W, height: H, color: OFFWH });
  p2.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: CYAN });

  let y2 = H - 52;
  p2.drawText('EXECUTIVE VERDICT', { x: MARGIN, y: y2, size: 9, font: bold, color: CYAN });
  y2 -= 24;
  p2.drawText(pdf(companyName), { x: MARGIN, y: y2, size: 22, font: bold, color: DARK });
  y2 -= LINE_HEIGHT * 1.5;

  // Verdict text — sanitize then wrap
  const verdictParagraphs = pdf(aiOutput.executive_verdict).split('\n').filter(Boolean);
  for (const para of verdictParagraphs) {
    const lines = wrapText(para, 88);
    for (const line of lines) {
      if (y2 < 200) break;
      p2.drawText(line, { x: MARGIN, y: y2, size: 11, font: reg, color: BODY });
      y2 -= LINE_HEIGHT;
    }
    y2 -= 8;
  }

  // Dimension bars
  y2 -= 16;
  p2.drawText('DIMENSION SCORES', { x: MARGIN, y: y2, size: 9, font: bold, color: CYAN });
  y2 -= 20;

  const barMaxW = W - MARGIN * 2 - 160;
  for (const [key, val] of Object.entries(dimensionScores) as [DimensionKey, number][]) {
    const pct       = val / 10;
    const dimLabel  = DIMENSION_META[key].label;
    const scoreLabel = `${Math.round(val * 10)}/100`;

    p2.drawText(pdf(dimLabel), { x: MARGIN, y: y2, size: 10, font: reg, color: BODY });
    p2.drawText(`${DIMENSION_META[key].weight}%`, {
      x: MARGIN + 160, y: y2, size: 9, font: reg, color: MUTED,
    });

    const barX = MARGIN + 200;
    const barY = y2 - 2;
    p2.drawRectangle({ x: barX, y: barY, width: barMaxW, height: 10, color: WHITE });
    p2.drawRectangle({ x: barX, y: barY, width: barMaxW * pct, height: 10, color: tierColor });
    p2.drawText(scoreLabel, { x: barX + barMaxW + 8, y: y2, size: 10, font: bold, color: DARK });

    y2 -= 26;
  }

  // Footer p2
  p2.drawLine({ start: { x: MARGIN, y: 56 }, end: { x: W - MARGIN, y: 56 }, thickness: 0.5, color: MUTED });
  p2.drawText('devmantra.com', { x: MARGIN, y: 36, size: 9, font: reg, color: MUTED });
  p2.drawText('Page 2 of 3', { x: W - MARGIN - 48, y: 36, size: 9, font: reg, color: MUTED });

  // ─────────────────────────── PAGE 3 — ACTIONS + BENCHMARK ───────────────
  const p3 = doc.addPage([W, H]);
  p3.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });
  p3.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: CYAN });

  let y3 = H - 52;
  p3.drawText('YOUR 3-POINT ACTION PLAN', { x: MARGIN, y: y3, size: 9, font: bold, color: CYAN });
  y3 -= 24;

  for (let i = 0; i < aiOutput.top_3_actions.length; i++) {
    const action = aiOutput.top_3_actions[i];
    if (!action) continue;

    p3.drawRectangle({ x: MARGIN, y: y3 - 4, width: 24, height: 24, color: tierColor });
    p3.drawText(String(i + 1), { x: MARGIN + 8, y: y3 + 3, size: 12, font: bold, color: WHITE });
    p3.drawText(pdf(action.title), { x: MARGIN + 32, y: y3 + 3, size: 13, font: bold, color: DARK });
    y3 -= LINE_HEIGHT + 4;

    const bodyLines = wrapText(pdf(action.body), 88);
    for (const line of bodyLines) {
      p3.drawText(line, { x: MARGIN + 32, y: y3, size: 10, font: reg, color: BODY });
      y3 -= LINE_HEIGHT - 2;
    }
    y3 -= 16;
  }

  // Benchmark
  y3 -= 8;
  p3.drawRectangle({ x: MARGIN, y: y3 - 80, width: W - MARGIN * 2, height: 100, color: OFFWH });
  p3.drawText('INDUSTRY BENCHMARK', { x: MARGIN + 16, y: y3, size: 9, font: bold, color: CYAN });
  y3 -= 18;
  const benchLines = wrapText(pdf(aiOutput.industry_benchmark), 80);
  for (const line of benchLines) {
    p3.drawText(line, { x: MARGIN + 16, y: y3, size: 10, font: reg, color: BODY });
    y3 -= LINE_HEIGHT - 2;
  }

  // Footer p3
  p3.drawLine({ start: { x: MARGIN, y: 56 }, end: { x: W - MARGIN, y: 56 }, thickness: 0.5, color: MUTED });
  p3.drawText('devmantra.com', { x: MARGIN, y: 36, size: 9, font: reg, color: MUTED });
  p3.drawText('Page 3 of 3', { x: W - MARGIN - 48, y: 36, size: 9, font: reg, color: MUTED });

  return doc.save();
}
