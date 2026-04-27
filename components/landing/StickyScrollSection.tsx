'use client';

import { useRef, useState } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

const DELIVERABLES = [
  { icon: '📊', num: '01', title: 'Fundability Score (0–100)',   desc: 'A deterministic number computed across 6 weighted investment dimensions — Management Team, Market, Moat, Channels, Stage, and Funding Ask. Not an estimate. Not AI-generated. A structured, repeatable calculation.' },
  { icon: '🏅', num: '02', title: 'Tier Classification',          desc: 'Idea Stage, Seed-Ready with Gaps, Series A Fundable, or Top-Decile Founder — each with a score range and a plain-English explanation of what it means for your next capital raise.' },
  { icon: '🧠', num: '03', title: 'AI Executive Verdict',         desc: '2–3 paragraphs of personalised, advisory-grade analysis — not generic templates. References your specific answers and the weakest dimensions in your profile.' },
  { icon: '⚡', num: '04', title: '3-Point Action Plan',          desc: 'Three prioritised, specific actions to close your biggest gaps in the next 90 days. At least one references a relevant Dev Mantra service area. Written for founders, not consultants.' },
  { icon: '📈', num: '05', title: 'Industry Benchmark',           desc: "How your score compares against real Indian startup fundraising outcomes — grounded in Dev Mantra's portfolio of 500+ companies across sectors and stages." },
  { icon: '📄', num: '06', title: 'Branded PDF Report',           desc: 'A 3-page, professionally formatted PDF emailed to you within seconds of completing the diagnostic. Shareable with co-founders, board members, and advisors.' },
];

const N = DELIVERABLES.length;

export default function StickyScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target:  containerRef,
    offset: ['start start', 'end end'],
  });

  const [active, setActive] = useState(0);

  // Derive active index purely from scroll progress — clean, no overlap
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(Math.floor(v * N), N - 1);
    setActive(idx);
  });

  return (
    <>
      {/* ── MOBILE: image + stacked cards ────────────────────────────── */}
      <section className="block lg:hidden bg-white pt-14 pb-20 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-brand-cyan text-xs font-bold tracking-widest uppercase mb-3">What You'll Receive</div>
          <h2 className="font-heading font-black text-navy-light text-3xl mb-8" style={{ letterSpacing: '-0.02em' }}>
            A Complete Investment Report
          </h2>

          {/* Feature image — full on mobile */}
          <div className="rounded-2xl overflow-hidden shadow-md mb-10">
            <img
              src="/feature.png"
              alt="Fundability report"
              className="w-full h-auto object-contain block"
            />
          </div>

          <div className="space-y-5">
            {DELIVERABLES.map(d => (
              <div key={d.title} className="flex gap-4 p-5 bg-off-white rounded-2xl border border-gray-100">
                <span className="text-3xl shrink-0 mt-0.5">{d.icon}</span>
                <div>
                  <div className="text-brand-cyan text-xs font-bold tracking-wider mb-1">{d.num}</div>
                  <h3 className="font-heading font-bold text-navy-light text-sm mb-1.5">{d.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESKTOP: sticky scroll parallax ──────────────────────────── */}
      {/* Height = N viewports so each feature gets exactly 1vh of scroll window */}
      <section
        ref={containerRef}
        style={{ height: `${N * 100}vh` }}
        className="hidden lg:block relative bg-white"
      >
        <div className="sticky top-0 h-screen overflow-hidden bg-white">
          <div className="h-full flex items-center">
            <div className="w-full max-w-6xl mx-auto px-16 grid grid-cols-2 gap-20 items-center">

              {/* ── Left: completely still ──────────────────────────── */}
              <div className="rounded-3xl overflow-hidden shadow-lg flex items-center justify-center bg-off-white/50">
                <img
                  src="/feature.png"
                  alt="Fundability report in hand"
                  className="w-full h-auto max-h-[72vh] object-contain block"
                />
              </div>

              {/* ── Right: ONE feature shown at a time ─────────────── */}
              <div className="flex flex-col" style={{ height: '70vh' }}>

                {/* Static heading */}
                <div className="shrink-0 pb-8 pt-6">
                  <div className="text-brand-cyan text-xs font-bold tracking-widest uppercase mb-3">What You'll Receive</div>
                  <h2 className="font-heading font-black text-navy-light text-4xl" style={{ letterSpacing: '-0.02em' }}>
                    A Complete<br />Investment Report
                  </h2>
                </div>

                {/* Feature area — overflow hidden so only one slot visible */}
                <div className="flex-1 relative overflow-hidden">
                  {DELIVERABLES.map((d, i) => (
                    <div
                      key={d.title}
                      className="absolute inset-0 flex flex-col justify-center"
                      style={{
                        opacity:    i === active ? 1 : 0,
                        transform:  i === active
                          ? 'translateY(0)'
                          : i < active
                            ? 'translateY(-32px)'
                            : 'translateY(32px)',
                        transition: 'opacity 400ms ease, transform 400ms ease',
                        pointerEvents: i === active ? 'auto' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <span className="text-4xl">{d.icon}</span>
                        <span className="text-brand-cyan text-xs font-bold tracking-widest">
                          {d.num} / {String(N).padStart(2, '0')}
                        </span>
                      </div>
                      <h3
                        className="font-heading font-black text-navy-light text-3xl mb-4 leading-tight"
                        style={{ letterSpacing: '-0.02em' }}
                      >
                        {d.title}
                      </h3>
                      <p className="text-text-body text-lg leading-relaxed">{d.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Progress dots */}
                <div className="shrink-0 pb-6 flex items-center gap-2">
                  {DELIVERABLES.map((_, i) => (
                    <div
                      key={i}
                      className="h-[3px] rounded-full bg-brand-cyan transition-all duration-300"
                      style={{ width: i === active ? '2rem' : '0.5rem', opacity: i === active ? 1 : 0.25 }}
                    />
                  ))}
                  <span className="ml-2 text-xs text-text-muted tabular-nums">
                    {active + 1} of {N}
                  </span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
