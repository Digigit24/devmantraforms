'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import Logo from '@/components/ui/Logo';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
};
const fadeRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show:   { opacity: 1, x: 0 },
};


export default function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(true), []);

  return (
    <section className="relative min-h-screen bg-navy-gradient overflow-hidden flex flex-col">

      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
        backgroundSize: '72px 72px',
      }} />

      {/* Glow blobs */}
      <div className="absolute top-1/4 right-1/3 w-[600px] h-[600px] rounded-full bg-brand-cyan opacity-[0.06] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full bg-brand-blue opacity-[0.10] blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 pt-8 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-px bg-brand-cyan" />
          <span className="text-brand-cyan text-xs font-semibold tracking-widest uppercase">Fundability Index</span>
        </div>
        <Logo width={150} variant="dark" />
      </nav>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center px-6 lg:px-16 py-10">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left */}
          <motion.div variants={stagger} initial="hidden" animate={loaded ? 'show' : 'hidden'} className="max-w-xl">

            <motion.div variants={fadeUp} transition={{ duration: 0.55, ease: 'easeOut' }} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
              <span className="text-white/80 text-sm font-medium">3-minute investment readiness diagnostic</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="font-heading font-black text-white leading-[1.04] mb-5"
              style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4rem)', letterSpacing: '-0.03em' } as React.CSSProperties}
            >
              Do Investors See{' '}
              <span className="relative inline-block">
                <span className="text-brand-cyan">Fundability</span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-brand-cyan/40 rounded-full" />
              </span>
              {' '}in You?
            </motion.h1>

            <motion.p variants={fadeUp} transition={{ duration: 0.55, ease: 'easeOut' }} className="text-white/60 text-lg leading-relaxed mb-8">
              Answer 12 focused questions. Get an AI-powered score, tier classification,
              and a personalised 3-step action plan from Dev Mantra's advisory team.
            </motion.p>

            {/* Mini stats */}
            <motion.div variants={fadeUp} transition={{ duration: 0.55, ease: 'easeOut' }} className="flex items-center gap-6 mb-10">
              {[{ v: '3 min', l: 'Completion' }, { v: '12', l: 'Questions' }, { v: '100', l: 'Point scale' }].map(s => (
                <div key={s.l} className="text-center">
                  <div className="font-heading font-black text-2xl text-white">{s.v}</div>
                  <div className="text-white/40 text-xs mt-0.5 uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="font-heading font-black text-xl text-white">Free</div>
                
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div variants={fadeUp} transition={{ duration: 0.55, ease: 'easeOut' }}>
              <Link href="/diagnostic">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group flex items-center gap-3 bg-brand-cyan hover:bg-brand-cyan/90 text-navy-deep font-heading font-bold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-brand-cyan/20"
                >
                  Start Your Fundability Check
                  <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </Link>
              <p className="text-white/30 text-xs mt-3">Free · Instant report · No credit card required</p>
            </motion.div>

          </motion.div>

          {/* Right — hero image */}
          <motion.div variants={fadeRight} initial="hidden" animate={loaded ? 'show' : 'hidden'} transition={{ duration: 0.65, ease: 'easeOut', delay: 0.4 }} className="relative">

            {/* Hero image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-navy-deep/40">
              <img
                src="/hero.png"
                alt="Fundability report preview"
                className="w-full h-auto object-cover block"
              />
              {/* Subtle overlay to blend with dark hero */}
              <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 16 }}
              animate={loaded ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl shadow-navy-deep/20 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-navy-light font-semibold text-xs">PDF Report</div>
                <div className="text-text-muted text-xs">Emailed instantly</div>
              </div>
            </motion.div>

          </motion.div>

        </div>
      </div>

      {/* Scroll hint */}
      <div className="relative z-10 flex justify-center pb-8">
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-1 text-white/20"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
