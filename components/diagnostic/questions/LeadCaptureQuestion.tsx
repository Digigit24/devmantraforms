'use client';

import { useState } from 'react';
import type { ScoringResult } from '@/types';

interface Props {
  founderName: string;
  clientScore: ScoringResult;
  onSubmit:    (lead: { email: string; phone: string }) => void;
  onBack:      () => void;
  isSubmitting: boolean;
}

export default function LeadCaptureQuestion({ founderName, clientScore, onSubmit, onBack, isSubmitting }: Props) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email address.';
    if (phone.replace(/\D/g, '').length < 8) e.phone = 'Please enter a valid phone number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) onSubmit({ email: email.trim(), phone: phone.trim() });
  }

  return (
    <div className="animate-fade-up max-w-xl">

      {/* Blurred score teaser */}
      <div className="bg-navy-deep rounded-2xl p-6 mb-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-cyan opacity-10 blur-3xl rounded-full pointer-events-none" />

        <div className="text-brand-cyan text-xs font-semibold tracking-widest uppercase mb-4">
          Dev Mantra · Fundability Index
        </div>

        <div className="flex items-end gap-3 mb-3">
          {/* Blurred score */}
          <div className="relative">
            <div className="score-blur font-heading font-black text-7xl text-white leading-none select-none">
              {clientScore.finalScore}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-brand-cyan/90 backdrop-blur-sm text-navy-deep text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Unlock your score
              </div>
            </div>
          </div>
          <div className="text-white/40 text-2xl font-body mb-2">/100</div>
        </div>

        <div className="flex gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white/20 rounded-full score-blur" style={{ width: `${30 + i * 12}%` }} />
            </div>
          ))}
        </div>

        <p className="text-white/50 text-xs mt-3">
          {founderName ? `Report ready for ${founderName}` : 'Your report is ready'} · Unlock by entering your details below
        </p>
      </div>

      {/* Heading */}
      <h2 className="font-heading font-black text-navy-light text-3xl md:text-4xl mb-2 leading-tight" style={{ letterSpacing: '-0.02em' }}>
        Your Fundability Report is ready.
      </h2>
      <p className="text-text-body text-base mb-8">
        Enter your details to unlock your score, tier, and a personalised 3-point action plan from Dev Mantra's advisory team.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-navy-light mb-2">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@startup.com"
            autoComplete="email"
            className={`w-full px-5 py-4 text-base font-body text-navy-light placeholder-gray-300 bg-white border-2 rounded-xl focus:outline-none focus:border-brand-cyan transition-colors ${
              errors.email ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-navy-light mb-2">WhatsApp / mobile number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            className={`w-full px-5 py-4 text-base font-body text-navy-light placeholder-gray-300 bg-white border-2 rounded-xl focus:outline-none focus:border-brand-cyan transition-colors ${
              errors.phone ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 bg-brand-cyan hover:bg-brand-cyan/90 disabled:opacity-60 text-navy-deep font-heading font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-brand-cyan/20"
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating your report…
            </>
          ) : (
            <>Unlock My Report →</>
          )}
        </button>
      </form>

      <p className="text-text-muted text-xs mb-6">
        We'll also send occasional insights from Dev Mantra. Unsubscribe anytime.
      </p>

      <button
        onClick={onBack}
        disabled={isSubmitting}
        className="text-text-muted hover:text-text-body text-sm transition-colors flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>
  );
}
