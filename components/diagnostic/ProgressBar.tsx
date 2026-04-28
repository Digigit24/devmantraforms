'use client';

import { motion } from 'framer-motion';

interface Props {
  progress:    number; // 0–100
  currentStep: number;
  totalSteps:  number;
}

export default function ProgressBar({ progress, currentStep, totalSteps }: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Full-width gradient bar */}
      <div className="h-[3px] w-full bg-gray-200">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #1b3c6b, #4a73c4)',
            boxShadow: '0 0 10px rgba(74, 115, 196, 0.5)',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Step info strip */}
      <div className="bg-white/96 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
        {/* Dot sequence */}
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 shrink-0 ${
                i < currentStep - 1
                  ? 'w-4 h-[3px] bg-brand-blue'
                  : i === currentStep - 1
                  ? 'w-5 h-[3px] bg-navy-deep'
                  : 'w-2 h-[3px] bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step counter + favicon */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-text-muted text-xs tabular-nums">
            {currentStep}<span className="text-gray-300 mx-1">/</span>{totalSteps}
          </span>
          <div className="h-3 w-px bg-gray-200" />
          <span className="text-brand-blue text-xs font-bold tabular-nums">{Math.round(progress)}%</span>
          <div className="h-3 w-px bg-gray-200" />
          {/* Favicon — always in the bar, never floats over content */}
          <img
            src="/favicon.ico"
            alt="Dev Mantra"
            className="w-6 h-6 rounded-md object-contain opacity-70"
          />
        </div>
      </div>
    </div>
  );
}
