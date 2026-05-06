import type { Metadata } from 'next';
import DiagnosticFlow from '@/components/diagnostic/DiagnosticFlow';

export const metadata: Metadata = {
  title: 'Fundability Diagnostic',
  description: 'Take the 3-minute fundability diagnostic. Answer 12 focused questions and get your AI-powered investor-readiness score instantly.',
  openGraph: {
    title: 'Fundability Diagnostic - Dev Mantra',
    description: 'Take the 3-minute fundability diagnostic. 12 questions. Instant AI-powered score and action plan.',
    images: [
      {
        url: '/india_vs_europe_calculator.png',
        width: 1734,
        height: 907,
        alt: 'India vs Europe Startup Funding Calculator - Dev Mantra',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fundability Diagnostic - Dev Mantra',
    description: 'Take the 3-minute fundability diagnostic. 12 questions. Instant AI-powered score and action plan.',
    images: ['/india_vs_europe_calculator.png'],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DiagnosticPage() {
  return <DiagnosticFlow />;
}
