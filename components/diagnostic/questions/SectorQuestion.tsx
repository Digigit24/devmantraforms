'use client';

import type { QuestionOption } from '@/types';

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  saas: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  d2c: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  fintech: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  manufacturing: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  services: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  other: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

interface Props {
  question: string;
  options:  QuestionOption[];
  value:    string;
  onAnswer: (v: string) => void;
  onNext:   () => void;
  onBack?:  () => void;
}

export default function SectorQuestion({ question, options, value, onAnswer, onNext, onBack }: Props) {
  function handleSelect(v: string) {
    const isFirstTime = !value;
    onAnswer(v);
    // Auto-advance on first selection. On revisit, user clicks Continue or picks a different option.
    if (isFirstTime) setTimeout(onNext, 220);
  }

  return (
    <div className="animate-fade-up">
      <h2 className="font-heading font-black text-navy-light text-3xl md:text-4xl mb-2 leading-tight" style={{ letterSpacing: '-0.02em' }}>
        {question}
      </h2>
      <p className="text-text-muted text-base mb-8">Select the one that fits best.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`option-card group flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                selected
                  ? 'bg-navy-deep border-brand-blue text-white shadow-lg shadow-navy-deep/20'
                  : 'bg-white border-gray-200 text-navy-light hover:border-brand-blue hover:shadow-md'
              }`}
            >
              <div className={selected ? 'text-brand-blue' : 'text-brand-blue group-hover:text-brand-blue transition-colors'}>
                {SECTOR_ICONS[opt.value] ?? SECTOR_ICONS.other}
              </div>
              <span className="font-semibold text-sm leading-snug">{opt.label}</span>
              {selected && (
                <div className="ml-auto self-end">
                  <div className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center">
                    <svg className="w-3 h-3 text-navy-deep" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {/* Continue button — shown once an answer is selected */}
        {value && (
          <button
            onClick={onNext}
            className="flex items-center gap-3 bg-brand-gradient hover:opacity-90 text-white font-heading font-bold text-base px-7 py-3.5 rounded-xl transition-colors"
          >
            Continue <span>→</span>
          </button>
        )}

        {onBack && (
          <button onClick={onBack} className="text-text-muted hover:text-text-body text-sm transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </div>
    </div>
  );
}
