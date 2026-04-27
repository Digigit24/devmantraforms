'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  question:  string;
  value:     { founderName: string; companyName: string };
  onAnswer:  (v: { founderName: string; companyName: string }) => void;
  onNext:    () => void;
}

export default function NameQuestion({ question, value, onAnswer, onNext }: Props) {
  const [name, setName]    = useState(value.founderName);
  const [company, setComp] = useState(value.companyName);

  const valid = name.trim().length >= 2 && company.trim().length >= 2;

  function handleNext() {
    if (!valid) return;
    onAnswer({ founderName: name.trim(), companyName: company.trim() });
    onNext();
  }

  return (
    <div className="animate-fade-up">
      <h2 className="font-heading font-black text-navy-light text-3xl md:text-4xl mb-2 leading-tight" style={{ letterSpacing: '-0.02em' }}>
        {question}
      </h2>
      <p className="text-text-muted text-base mb-10">Let's personalise your report.</p>

      <div className="space-y-5 mb-10">
        {/* Founder name */}
        <div className="group">
          <label className="block text-sm font-semibold text-navy-light mb-2">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('company-input')?.focus()}
            placeholder="e.g. Aarav Mehta"
            autoFocus
            className="w-full px-5 py-4 text-lg font-body text-navy-light placeholder-gray-300 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>

        {/* Company name */}
        <div>
          <label className="block text-sm font-semibold text-navy-light mb-2">Company / startup name</label>
          <input
            id="company-input"
            type="text"
            value={company}
            onChange={(e) => setComp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            placeholder="e.g. Lumen AI"
            className="w-full px-5 py-4 text-lg font-body text-navy-light placeholder-gray-300 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleNext}
          disabled={!valid}
          className="flex items-center gap-3 bg-navy-deep hover:bg-navy-mid disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-bold text-lg px-8 py-4 rounded-xl transition-colors"
        >
          Let's go <span>→</span>
        </button>

        <Link
          href="/"
          className="text-text-muted hover:text-text-body text-sm transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </div>
    </div>
  );
}
