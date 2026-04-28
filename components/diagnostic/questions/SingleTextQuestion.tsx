'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  question:      string;
  subtext?:      string;
  placeholder:   string;
  value:         string;
  inputType?:    'text' | 'email' | 'tel';
  autoComplete?: string;
  onAnswer:      (v: string) => void;
  onNext:        () => void;
  onBack?:       () => void;
  backToHome?:   boolean;
}

export default function SingleTextQuestion({
  question, subtext, placeholder, value, inputType = 'text',
  autoComplete, onAnswer, onNext, onBack, backToHome,
}: Props) {
  const [val, setVal] = useState(value);
  const valid = val.trim().length >= 2;

  function handleNext() {
    if (!valid) return;
    onAnswer(val.trim());
    onNext();
  }

  return (
    <div className="animate-fade-up">
      <h2
        className="font-heading font-black text-navy-light leading-tight mb-2"
        style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.025em' }}
      >
        {question}
      </h2>
      {subtext && <p className="text-text-muted text-base mb-8">{subtext}</p>}
      {!subtext && <div className="mb-8" />}

      <input
        type={inputType}
        value={val}
        autoFocus
        autoComplete={autoComplete}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleNext()}
        placeholder={placeholder}
        className="w-full px-0 py-4 text-2xl md:text-3xl font-heading font-bold text-navy-light placeholder-gray-200 bg-transparent border-b-2 border-gray-200 focus:border-brand-blue outline-none transition-colors mb-10"
      />

      <div className="flex items-center gap-5">
        <button
          onClick={handleNext}
          disabled={!valid}
          className="group flex items-center gap-2.5 bg-brand-gradient hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-heading font-bold text-base px-7 py-3.5 rounded-xl transition-all"
        >
          Continue
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {onBack && !backToHome && (
          <button onClick={onBack} className="text-text-muted hover:text-text-body text-sm flex items-center gap-1.5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {backToHome && (
          <Link href="/" className="text-text-muted hover:text-text-body text-sm flex items-center gap-1.5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        )}

        <span className="text-text-muted text-xs hidden sm:inline">Press Enter ↵</span>
      </div>
    </div>
  );
}
