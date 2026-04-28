'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import type { ResultRecord } from '@/types';
import { DIMENSION_META, TIER_META } from '@/types';

// ── Animated score counter ────────────────────────────────────────────────
function AnimatedNumber({ target, delay = 0 }: { target: number; delay?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start    = performance.now();
      const duration = 1600;
      function tick(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const e = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(e * target));
        if (t < 1) raf.current = requestAnimationFrame(tick);
      }
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf.current); };
  }, [target, delay]);
  return <>{val}</>;
}

// ── SVG score ring ────────────────────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r      = 76;
  const sw     = 10;
  const cx     = r + sw;
  const size   = (r + sw) * 2;
  const circum = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circum);

  useEffect(() => {
    const t = setTimeout(() => setOffset(circum * (1 - score / 100)), 350);
    return () => clearTimeout(t);
  }, [score, circum]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 18px ${color}55)` }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circum}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-black text-white leading-none" style={{ fontSize: '2.5rem' }}>
          <AnimatedNumber target={score} delay={350} />
        </span>
        <span className="text-white/40 text-sm">/100</span>
      </div>
    </div>
  );
}

// ── Animated dimension bar ────────────────────────────────────────────────
function DimBar({ label, score, weight, color, index }: { label: string; score: number; weight: number; color: string; index: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(score * 10), 400 + index * 80);
    return () => clearTimeout(t);
  }, [score, index]);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-text-body text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-xs">{weight}%</span>
          <span className="font-heading font-bold text-navy-light text-sm tabular-nums">{Math.round(w)}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${w}%`, backgroundColor: color, transitionDelay: `${index * 80}ms` }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ResultsView({ result }: { result: ResultRecord }) {
  const tierMeta   = TIER_META[result.tier];
  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL ?? '#';
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL     ?? 'https://devmantra.com';
  const shareUrl = 'https://startups.devmantra.com';
  const caption  = `Just took Dev Mantra's Fundability Index and scored ${result.finalScore}/100 — ${tierMeta.label}. Useful reality check for anyone raising in the next 12 months. Try it here: ${shareUrl}`;

  function shareOnLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=600,noopener,noreferrer');
  }

  return (
    <div className="min-h-screen bg-off-white font-body">

      {/* ── SCORE HERO ─────────────────────────────────────────────────── */}
      <header className="relative bg-navy-gradient overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-[0.07] blur-[100px] pointer-events-none" style={{ backgroundColor: tierMeta.color }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-12 pt-10 pb-14">

          {/* Nav */}
          <div className="flex items-center justify-between mb-10">
            <div className="text-brand-cyan text-xs font-semibold tracking-widest uppercase">
              Fundability Index · Dev Mantra
            </div>
            <Logo width={130} variant="dark" />
          </div>

          {/* Score + Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

            {/* Score ring */}
            <div className="flex flex-col items-start gap-5">
              <ScoreRing score={result.finalScore} color={tierMeta.color} />

              <div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.4, ease: [0.22,1,0.36,1] }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
                  style={{ backgroundColor: `${tierMeta.color}25`, color: tierMeta.color, border: `1.5px solid ${tierMeta.color}50` }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tierMeta.color }} />
                  {tierMeta.label}
                  <span className="font-normal opacity-60">({tierMeta.range})</span>
                </motion.div>

                <h1 className="font-heading font-black text-white text-2xl leading-tight mb-1.5">
                  {result.companyName}
                </h1>
                <p className="text-white/45 text-sm">
                  Report for {result.founderName} ·{' '}
                  {new Date(result.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Mini dimension bars */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-3.5">
              <div className="text-white/40 text-xs uppercase tracking-wider mb-4">Dimension Scores</div>
              {(Object.entries(result.dimensionScores) as [keyof typeof result.dimensionScores, number][]).map(([k, v], i) => (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-white/55 text-xs">{DIMENSION_META[k].label}</div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${v * 10}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.08, ease: 'easeOut' }}
                      style={{ backgroundColor: tierMeta.color }}
                    />
                  </div>
                  <div className="w-7 shrink-0 text-right text-xs font-bold text-white/65 tabular-nums">
                    {Math.round(v * 10)}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </header>

      {/* ── CONTENT ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10 space-y-6">

        {/* Dimension detail + Verdict (side-by-side on desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Dimension detail card */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tierMeta.color}18` }}>
                <svg className="w-4 h-4" fill="none" stroke={tierMeta.color} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="font-heading font-bold text-navy-light text-base">Dimension Breakdown</h2>
            </div>
            <div className="space-y-4">
              {(Object.entries(result.dimensionScores) as [keyof typeof result.dimensionScores, number][]).map(([k, v], i) => (
                <DimBar key={k} label={DIMENSION_META[k].label} score={v} weight={DIMENSION_META[k].weight} color={tierMeta.color} index={i} />
              ))}
            </div>
          </div>

          {/* Executive Verdict */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: tierMeta.color }} />
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tierMeta.color}18` }}>
                  <svg className="w-4 h-4" fill="none" stroke={tierMeta.color} strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="font-heading font-bold text-navy-light text-base">Executive Verdict</h2>
              </div>
              <div className="space-y-4">
                {result.aiOutput.executive_verdict.split('\n').filter(Boolean).map((p, i) => (
                  <p key={i} className="text-text-body leading-[1.75] text-sm lg:text-base">{p}</p>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Action Plan */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tierMeta.color}18` }}>
              <svg className="w-4 h-4" fill="none" stroke={tierMeta.color} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="font-heading font-bold text-navy-light text-base">Your 3-Point Action Plan</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.aiOutput.top_3_actions.map((a, i) => (
              <div
                key={i}
                className="rounded-xl p-5 border-l-4"
                style={{ borderColor: tierMeta.color, backgroundColor: `${tierMeta.color}08` }}
              >
                <div
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-heading font-black text-sm text-white mb-3"
                  style={{ backgroundColor: tierMeta.color }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-heading font-bold text-navy-light text-sm mb-2 leading-snug">{a.title}</h3>
                <p className="text-text-body text-xs leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Benchmark */}
        <div className="relative bg-navy-mid rounded-2xl p-6 lg:p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-3xl rounded-full" style={{ backgroundColor: tierMeta.color }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-brand-cyan" />
              <div className="text-brand-cyan text-xs font-semibold tracking-widest uppercase">Industry Benchmark</div>
            </div>
            <p className="text-white/75 leading-[1.8] text-sm lg:text-base">{result.aiOutput.industry_benchmark}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="relative bg-navy-gradient rounded-2xl p-8 lg:p-10 overflow-hidden text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 opacity-[0.08] blur-3xl rounded-full bg-brand-cyan pointer-events-none" />
          <div className="relative z-10 max-w-lg mx-auto">
            <h2 className="font-heading font-black text-white text-2xl mb-2" style={{ letterSpacing: '-0.02em' }}>
              Ready to close the gaps?
            </h2>
            <p className="text-white/55 text-sm mb-6">
              Book a free 30-minute strategy call. Dev Mantra has helped move{' '}
              <span className="text-white font-semibold">500+ founders</span> to the next funding tier.
            </p>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-brand-cyan hover:bg-brand-cyan/90 text-navy-deep font-heading font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-brand-cyan/20"
            >
              Book Free Consultation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <p className="text-white/25 text-xs mt-3">Free 30 minutes · No obligation</p>
          </div>
        </div>

        {/* Share */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-heading font-bold text-navy-light text-sm mb-1">Share your result</h3>
          <p className="text-text-muted text-xs mb-4">Let your network know where you stand on fundability.</p>

          <div className="bg-off-white rounded-xl p-4 text-text-body text-sm leading-relaxed mb-5 border border-gray-100 italic">
            "{caption}"
          </div>

          <button
            onClick={shareOnLinkedIn}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: '#0A66C2' }}
          >
            {/* LinkedIn logo */}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Share on LinkedIn
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-navy-deep mt-6 py-8 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo width={110} variant="dark" />
          <p className="text-white/25 text-xs text-center">
            Prepared by Dev Mantra Financial Services · N. Tatia &amp; Associates · ₹5,000 Cr+ in transactions
          </p>
          <a href={appUrl} className="text-white/35 hover:text-white/60 text-xs transition-colors">devmantra.com</a>
        </div>
      </footer>

    </div>
  );
}
