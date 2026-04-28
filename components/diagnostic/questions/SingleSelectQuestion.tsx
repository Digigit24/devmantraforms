'use client';

import { useState } from 'react';
import type { QuestionOption } from '@/types';

interface Props {
  questionId:  string;
  question:    string;
  helperText?: string;
  options:     QuestionOption[];
  value:       string;
  onAnswer:    (v: string) => void;
  onNext:      () => void;
  onBack:      () => void;
}

// Questions that benefit from a visual scale indicator (left = early, right = advanced)
const SCALE_QUESTIONS = new Set(['q3', 'q5', 'q6', 'q11']);

export default function SingleSelectQuestion({
  questionId, question, helperText, options, value, onAnswer, onNext, onBack,
}: Props) {
  const [selected, setSelected] = useState(value);
  const isScale = SCALE_QUESTIONS.has(questionId);

  function handleSelect(v: string) {
    setSelected(v);
    onAnswer(v);
  }

  function handleNext() {
    if (!selected) return;
    onNext();
  }

  return (
    <div className="animate-fade-up">
      <h2 className="font-heading font-black text-navy-light text-3xl md:text-4xl mb-2 leading-tight" style={{ letterSpacing: '-0.02em' }}>
        {question}
      </h2>
      {helperText && (
        <p className="text-text-muted text-sm italic mb-6">{helperText}</p>
      )}
      {!helperText && <div className="mb-6" />}

      {/* Scale label for relevant questions */}
      {isScale && (
        <div className="flex justify-between text-xs text-text-muted mb-3 px-1">
          <span>← Earlier stage</span>
          <span>More advanced →</span>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {options.map((opt, i) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`option-card w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-150 group ${
                isSelected
                  ? 'bg-navy-deep border-brand-blue shadow-lg shadow-navy-deep/15'
                  : 'bg-white border-gray-200 hover:border-navy-light hover:shadow-sm'
              }`}
            >
              {/* Option index indicator */}
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm transition-colors ${
                isSelected
                  ? 'bg-brand-blue text-navy-deep'
                  : 'bg-gray-100 text-text-muted group-hover:bg-navy-light/10 group-hover:text-navy-light'
              }`}>
                {String.fromCharCode(65 + i)}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm leading-snug ${isSelected ? 'text-white' : 'text-navy-light'}`}>
                  {opt.label}
                </div>
                {opt.description && (
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/60' : 'text-text-muted'}`}>
                    {opt.description}
                  </div>
                )}
              </div>

              {/* Scale dot for scale questions */}
              {isScale && (
                <div className="shrink-0 flex items-center gap-0.5">
                  {options.map((_, j) => (
                    <div
                      key={j}
                      className={`rounded-full transition-all ${
                        j <= i
                          ? (isSelected ? 'bg-brand-blue w-2 h-2' : 'bg-brand-blue/30 w-1.5 h-1.5')
                          : 'bg-gray-200 w-1.5 h-1.5'
                      }`}
                    />
                  ))}
                </div>
              )}

              {isSelected && (
                <div className="shrink-0 w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center">
                  <svg className="w-3 h-3 text-navy-deep" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleNext}
          disabled={!selected}
          className="flex items-center gap-3 bg-brand-gradient hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-bold text-base px-7 py-3.5 rounded-xl transition-colors"
        >
          Continue <span>→</span>
        </button>
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-body text-sm transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
    </div>
  );
}
