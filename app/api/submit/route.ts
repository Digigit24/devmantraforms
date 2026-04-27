import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

import { computeScore }         from '@/lib/scoring';
import { generateAIReport }     from '@/lib/ai';
import { generatePDF }          from '@/lib/pdf';
import { sendReportEmail }      from '@/lib/email';
import { saveSubmission }       from '@/lib/db';
import { createRequestLogger }  from '@/lib/logger';
import type { DiagnosticAnswers } from '@/types';

const AnswersSchema = z.object({
  founderName: z.string().min(2),
  companyName: z.string().min(2),
  sector:      z.enum(['saas', 'd2c', 'fintech', 'manufacturing', 'services', 'other']),
  q3:  z.string(),
  q4:  z.string().optional(),
  q5:  z.string(),
  q6:  z.string(),
  q7:  z.string(),
  q8:  z.string(),
  q9:  z.string(),
  q10: z.string(),
  q11: z.string(),
  email: z.string().email(),
  phone: z.string().min(8),
});

const BodySchema = z.object({ answers: AnswersSchema });

export async function POST(req: NextRequest) {
  const reqId  = randomUUID().slice(0, 8);
  const logger = createRequestLogger(reqId);
  const reqStart = Date.now();

  logger.info('request_received', { url: req.url });

  // ── 1. Parse & validate ───────────────────────────────────────────────────
  let answers: DiagnosticAnswers;
  {
    const s = logger.step('validate_input');
    let body: unknown;
    try {
      body = await req.json();
    } catch (err) {
      s.fail(err);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parse = BodySchema.safeParse(body);
    if (!parse.success) {
      s.fail(new Error('Validation failed'), { issues: parse.error.flatten() });
      return NextResponse.json({ error: 'Invalid input', details: parse.error.flatten() }, { status: 400 });
    }

    answers = parse.data.answers as DiagnosticAnswers;
    s.ok({ founder: answers.founderName, company: answers.companyName, sector: answers.sector });
  }

  // ── 2. Score (deterministic, instant) ────────────────────────────────────
  let scoring: ReturnType<typeof computeScore>;
  {
    const s = logger.step('scoring');
    try {
      scoring = computeScore(answers);
      s.ok({ score: scoring.finalScore, tier: scoring.tier, flags: scoring.flags });
    } catch (err) {
      s.fail(err);
      return NextResponse.json({ reqId, error: 'Scoring failed' }, { status: 500 });
    }
  }

  // ── 3. AI report (has internal fallback — should never throw) ────────────
  const aiStep = logger.step('ai_generate', { provider: process.env.AI_PROVIDER ?? 'mistral' });
  let aiOutput: Awaited<ReturnType<typeof generateAIReport>>;
  try {
    aiOutput = await generateAIReport(answers, scoring);
    aiStep.ok({ verdictLength: aiOutput.executive_verdict.length });
  } catch (err) {
    aiStep.fail(err);
    return NextResponse.json({ reqId, error: 'AI generation failed unexpectedly' }, { status: 500 });
  }

  // ── 4. Save to DB ← ALWAYS first, before PDF/email ───────────────────────
  const dbStep = logger.step('db_save');
  let leadId: string;
  try {
    leadId = await saveSubmission(answers, scoring, aiOutput);
    dbStep.ok({ leadId });
  } catch (err) {
    dbStep.fail(err);
    return NextResponse.json({ reqId, error: 'Database save failed', detail: String(err) }, { status: 500 });
  }

  // ── 5. PDF — best-effort (failure does NOT block the response) ───────────
  let pdfBuffer: Uint8Array | null = null;
  {
    const s = logger.step('pdf_generate');
    try {
      let logoBytes: Uint8Array | undefined;
      try {
        const buf = readFileSync(join(process.cwd(), 'public', 'logo.png'));
        logoBytes = new Uint8Array(buf);
      } catch {
        logger.warn('pdf_logo_missing');
      }

      pdfBuffer = await generatePDF({
        founderName:     answers.founderName,
        companyName:     answers.companyName,
        finalScore:      scoring.finalScore,
        tier:            scoring.tier,
        dimensionScores: scoring.dimensionScores,
        aiOutput,
        logoBytes,
      });
      s.ok({ bytes: pdfBuffer.length });
    } catch (err) {
      // Log but DO NOT return — DB is already saved, user can still see results
      s.fail(err, { note: 'PDF skipped; email will be sent without attachment' });
    }
  }

  // ── 6. Email — best-effort, non-blocking ─────────────────────────────────
  const emailStep = logger.step('email_send', { to: answers.email, hasPdf: pdfBuffer !== null });
  sendReportEmail({
    to:              answers.email,
    founderName:     answers.founderName,
    companyName:     answers.companyName,
    finalScore:      scoring.finalScore,
    tier:            scoring.tier,
    dimensionScores: scoring.dimensionScores,
    aiOutput,
    pdfBuffer:       pdfBuffer ?? new Uint8Array(0),
  })
    .then(() => emailStep.ok())
    .catch((err) => emailStep.fail(err));

  // ── Done ──────────────────────────────────────────────────────────────────
  logger.info('request_complete', {
    leadId,
    score:   scoring.finalScore,
    tier:    scoring.tier,
    hasPdf:  pdfBuffer !== null,
    totalMs: Date.now() - reqStart,
  });

  return NextResponse.json({
    id:               leadId,
    finalScore:       scoring.finalScore,
    tier:             scoring.tier,
    dimensionScores:  scoring.dimensionScores,
    weakestDimension: scoring.weakestDimension,
    flags:            scoring.flags,
    aiOutput,
  });
}
