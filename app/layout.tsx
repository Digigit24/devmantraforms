import type { Metadata } from 'next';
import { Inter, Onest } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const onest = Onest({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-onest',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fundability Index - Dev Mantra',
  description:
    'Answer 12 focused questions. Get an AI-powered fundability score, tier classification, and a personalized 3-step action plan from Dev Mantra\'s advisory team.',
  openGraph: {
    title: 'Fundability Index - Are You Investor-Ready?',
    description: '3 minutes. 12 questions. Instant AI report.',
    siteName: 'Dev Mantra',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${onest.variable}`}>
      <body>{children}</body>
    </html>
  );
}
