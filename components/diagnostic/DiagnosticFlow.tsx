'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
// Logo import removed — using favicon inline in the progress bar

import ProgressBar from './ProgressBar';
import SingleTextQuestion from './questions/SingleTextQuestion';
import SectorQuestion from './questions/SectorQuestion';
import SingleSelectQuestion from './questions/SingleSelectQuestion';
import LeadCaptureQuestion from './questions/LeadCaptureQuestion';

import { QUESTIONS, Q9_SECTOR_OPTIONS, getQuestionSequence } from '@/lib/questions';
import { computeScore } from '@/lib/scoring';
import type { DiagnosticAnswers, Sector } from '@/types';

interface State {
  stepIndex:    number;
  direction:    'forward' | 'backward';
  answers:      Partial<DiagnosticAnswers>;
  isSubmitting: boolean;
  error:        string | null;
}

const SLIDE = {
  enter: (dir: string) => ({ x: dir === 'forward' ?  56 : -56, opacity: 0 }),
  center:                  { x: 0,                              opacity: 1 },
  exit:  (dir: string) => ({ x: dir === 'forward' ? -56 :  56, opacity: 0 }),
};

export default function DiagnosticFlow() {
  const router = useRouter();

  const [state, setState] = useState<State>({
    stepIndex:    0,
    direction:    'forward',
    answers:      {},
    isSubmitting: false,
    error:        null,
  });

  const sequence   = getQuestionSequence(state.answers.q3);
  const totalSteps = sequence.length;
  const questionId = sequence[state.stepIndex]!;
  const question   = QUESTIONS.find((q) => q.id === questionId)!;
  const progress   = totalSteps <= 1 ? 0 : (state.stepIndex / (totalSteps - 1)) * 100;

  const questionText = (question?.question ?? '')
    .replace(/{company_name}/g,  state.answers.companyName  || 'your company')
    .replace(/{founder_name}/g,  state.answers.founderName  || 'you');

  const goForward = useCallback(() =>
    setState(p => ({ ...p, stepIndex: p.stepIndex + 1, direction: 'forward', error: null })), []);

  const goBack = useCallback(() =>
    setState(p => ({ ...p, stepIndex: Math.max(0, p.stepIndex - 1), direction: 'backward', error: null })), []);

  const setAnswer = useCallback((partial: Partial<DiagnosticAnswers>) =>
    setState(p => ({ ...p, answers: { ...p.answers, ...partial } })), []);

  const handleLeadSubmit = useCallback(async (lead: { email: string; phone: string }) => {
    setState(p => ({ ...p, isSubmitting: true, error: null }));

    const finalAnswers: DiagnosticAnswers = {
      ...(state.answers as DiagnosticAnswers),
      email: lead.email,
      phone: lead.phone,
    };

    try {
      const res  = await fetch('/api/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ answers: finalAnswers }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Server error');
      }

      const data = await res.json() as { id: string };
      router.push(`/results/${data.id}`);
    } catch (err) {
      setState(p => ({
        ...p,
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }));
    }
  }, [state.answers, router]);

  const clientScore = computeScore(state.answers);

  const q9Options =
    questionId === 'q9' && state.answers.sector
      ? (Q9_SECTOR_OPTIONS[state.answers.sector as Sector] ?? question?.options ?? [])
      : question?.options ?? [];

  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      <ProgressBar progress={progress} currentStep={state.stepIndex + 1} totalSteps={totalSteps} />

      {/* Favicon lives inside the progress bar — never overlaps content */}

      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 pt-24 pb-16">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={state.direction}>
            <motion.div
              key={questionId}
              custom={state.direction}
              variants={SLIDE}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            >

              {/* Q1a — founder name */}
              {question?.type === 'founder_name' && (
                <SingleTextQuestion
                  question={questionText}
                  subtext="Let's personalise your report."
                  placeholder="e.g. Aarav Mehta"
                  value={state.answers.founderName ?? ''}
                  autoComplete="given-name"
                  onAnswer={(v) => setAnswer({ founderName: v })}
                  onNext={goForward}
                  backToHome
                />
              )}

              {/* Q1b — company name */}
              {question?.type === 'company_name' && (
                <SingleTextQuestion
                  question={questionText}
                  placeholder="e.g. Lumen AI"
                  value={state.answers.companyName ?? ''}
                  autoComplete="organization"
                  onAnswer={(v) => setAnswer({ companyName: v })}
                  onNext={goForward}
                  onBack={goBack}
                />
              )}

              {/* Q2 — sector */}
              {question?.type === 'sector' && (
                <SectorQuestion
                  question={questionText}
                  options={question.options!}
                  value={state.answers.sector ?? ''}
                  onAnswer={(v) => setAnswer({ sector: v as Sector, q9: undefined })}
                  onNext={goForward}
                  onBack={goBack}
                />
              )}

              {/* Q3–Q11 — single select */}
              {question?.type === 'single_select' && (
                <SingleSelectQuestion
                  questionId={questionId}
                  question={questionText}
                  helperText={question.helperText}
                  options={q9Options}
                  value={(state.answers[questionId as keyof DiagnosticAnswers] as string) ?? ''}
                  onAnswer={(v) => {
                    if (questionId === 'q3') {
                      const preRev = ['business_plan', 'product_described', 'product_ready'].includes(v);
                      setAnswer({ q3: v, ...(preRev ? { q4: undefined } : {}) });
                    } else {
                      setAnswer({ [questionId as keyof DiagnosticAnswers]: v } as Partial<DiagnosticAnswers>);
                    }
                  }}
                  onNext={goForward}
                  onBack={goBack}
                />
              )}

              {/* Q12 — lead capture */}
              {question?.type === 'lead_capture' && (
                <LeadCaptureQuestion
                  founderName={state.answers.founderName ?? ''}
                  clientScore={clientScore}
                  onSubmit={handleLeadSubmit}
                  onBack={goBack}
                  isSubmitting={state.isSubmitting}
                />
              )}

            </motion.div>
          </AnimatePresence>

          {state.error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm"
            >
              {state.error}
            </motion.div>
          )}
        </div>
      </div>

      <div className="text-center py-4 text-text-muted text-xs">
        devmantra.com · Free diagnostic · Your data is secure
      </div>
    </div>
  );
}
