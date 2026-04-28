'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Status messages ────────────────────────────────────────────────────────
const MESSAGES = [
  'Validating your answers…',
  'Calculating your Fundability Score…',
  'Running AI analysis…',
  'Crafting your executive verdict…',
  'Building your 3-point action plan…',
  'Preparing your PDF report…',
  'Almost ready…',
];
const MSG_AT = [0, 900, 2800, 5500, 9000, 13500, 19000]; // ms

// ── Progress bar pacing ────────────────────────────────────────────────────
// Rush to 68 % in 2.5 s → crawl to 87 % over ~20 s → complete() jumps to 100
const PHASE1_TARGET  = 68;
const PHASE1_EASE    = 'cubic-bezier(0.25, 1, 0.5, 1)';
const PHASE1_DURATION = '2.5s';
const PHASE2_TARGET  = 87;
const PHASE2_DURATION = '22s';

interface Props { isComplete: boolean }

export default function SubmitLoading({ isComplete }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [pct,    setPct]    = useState(0);
  const [trans,  setTrans]  = useState(`width ${PHASE1_DURATION} ${PHASE1_EASE}`);

  // Progress bar phases
  useEffect(() => {
    const t1 = setTimeout(() => {
      setTrans(`width ${PHASE1_DURATION} ${PHASE1_EASE}`);
      setPct(PHASE1_TARGET);
    }, 80);
    const t2 = setTimeout(() => {
      setTrans(`width ${PHASE2_DURATION} linear`);
      setPct(PHASE2_TARGET);
    }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Complete: snap to 100 %
  useEffect(() => {
    if (isComplete) {
      setTrans('width 0.5s cubic-bezier(0.4, 0, 0.2, 1)');
      setPct(100);
    }
  }, [isComplete]);

  // Cycle messages
  useEffect(() => {
    const timers = MSG_AT.map((delay, i) => setTimeout(() => setMsgIdx(i), delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const msg = MESSAGES[Math.min(msgIdx, MESSAGES.length - 1)]!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(140deg,#060C18 0%,#0D1E3D 55%,#1B3C6B 100%)' }}
    >
      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),' +
          'linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
        backgroundSize: '72px 72px',
      }} />

      {/* Ambient glow blobs */}
      <div className="absolute top-1/3 right-1/3 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: '#4A73C4', opacity: 0.07, filter: 'blur(120px)' }} />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: '#4A73C4', opacity: 0.09, filter: 'blur(90px)' }} />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">

        {/* Favicon */}
        <img src="/favicon.ico" alt="Dev Mantra" className="w-8 h-8 rounded-lg mb-7 opacity-60" />

        {/* Animated score ring */}
        <ScoreRingAnim isComplete={isComplete} />

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.h2
            key={isComplete ? 'done' : 'loading'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="font-heading font-black text-white text-xl mt-6 mb-1 text-center tracking-tight"
          >
            {isComplete ? 'Your Report is Ready!' : 'Generating Your Report'}
          </motion.h2>
        </AnimatePresence>

        {/* Cycling status message */}
        <div className="h-5 mb-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.28 }}
              className="text-white/40 text-xs text-center"
            >
              {msg}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Progress bar ──────────────────────────────────────────── */}
        <div className="w-full mb-8">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-white/25 text-[10px] uppercase tracking-widest">Processing</span>
            <span className="text-brand-blue text-xs font-bold tabular-nums">{pct}%</span>
          </div>

          {/* Track */}
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {/* Fill */}
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #1b3c6b, #4a73c4)',
                boxShadow: '0 0 12px rgba(74, 115, 196, 0.55)',
                transition: trans,
              }}
            />
          </div>

          {/* Step dots */}
          <div className="flex justify-between mt-2 px-0.5">
            {[25, 50, 75, 100].map((mark) => (
              <div
                key={mark}
                className="w-1 h-1 rounded-full transition-all duration-500"
                style={{ background: pct >= mark ? '#4A73C4' : 'rgba(255,255,255,0.15)' }}
              />
            ))}
          </div>
        </div>

        {/* ── Shimmer report skeleton ───────────────────────────────── */}
        <ShimmerCard />

        <p className="text-white/15 text-[10px] mt-5 text-center tracking-wider">
          DEVMANTRA.COM · POWERED BY MISTRAL AI
        </p>

      </div>
    </motion.div>
  );
}

// ── Animated score ring ────────────────────────────────────────────────────
function ScoreRingAnim({ isComplete }: { isComplete: boolean }) {
  const r     = 50;
  const circ  = 2 * Math.PI * r;
  const arc   = circ * 0.3; // 30 % of ring

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">

      {/* Outer pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: '1px solid rgba(74, 115, 196, 0.25)' }}
        animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{ border: '1px solid rgba(74, 115, 196, 0.15)' }}
        animate={{ scale: [1, 1.25], opacity: [0.4, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
      />

      {/* Static background ring */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      </svg>

      {/* Spinning arc (hidden when complete) */}
      {!isComplete && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
        >
          <svg className="w-full h-full" viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="arc-g" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#4A73C4" stopOpacity="0" />
                <stop offset="70%"  stopColor="#4A73C4" />
                <stop offset="100%" stopColor="#4A73C4" />
              </linearGradient>
            </defs>
            <circle
              cx="56" cy="56" r={r}
              fill="none"
              stroke="url(#arc-g)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${circ - arc}`}
            />
          </svg>
        </motion.div>
      )}

      {/* Complete: full ring + checkmark */}
      {isComplete && (
        <motion.svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 112 112"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <circle cx="56" cy="56" r={r} fill="none" stroke="#4A73C4" strokeWidth="5" />
        </motion.svg>
      )}

      {/* Center */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
        {isComplete ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          >
            <svg className="w-8 h-8" style={{ color: '#4A73C4' }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        ) : (
          <>
            <span className="text-white/25 text-[9px] uppercase tracking-wider leading-none">Score</span>
            <motion.span
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-white font-heading font-black leading-none"
              style={{ fontSize: '1.9rem' }}
            >
              ?
            </motion.span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Shimmer skeleton of the report card ───────────────────────────────────
function ShimmerCard() {
  return (
    <div
      className="w-full rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)', width: '60%' }}
        initial={{ x: '-100%' }}
        animate={{ x: '280%' }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
      />

      {/* Row 1: score circle + badge */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.10)', width: '55%' }} />
          <div className="h-2 rounded-full"   style={{ background: 'rgba(255,255,255,0.07)', width: '38%' }} />
        </div>
        <div className="h-5 w-20 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }} />
      </div>

      {/* Row 2-7: dimension bars */}
      {[78, 65, 88, 72, 80, 68].map((w, i) => (
        <div key={i} className="flex items-center gap-3 mb-2.5">
          <div
            className="h-2 rounded-full shrink-0"
            style={{ width: `${44 + (i % 4) * 10}px`, background: 'rgba(255,255,255,0.08)' }}
          />
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.14)' }} />
          </div>
          <div className="w-5 h-2 rounded shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      ))}

      {/* Row 3: text lines */}
      <div className="mt-4 space-y-2">
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', width: '82%' }} />
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', width: '65%' }} />
      </div>

      {/* Blurred overlay hint */}
      <div
        className="absolute inset-x-0 bottom-0 h-8 rounded-b-2xl"
        style={{ background: 'linear-gradient(transparent, rgba(6,12,24,0.5))' }}
      />
    </div>
  );
}
