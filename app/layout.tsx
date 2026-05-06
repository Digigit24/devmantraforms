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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://startups.devmantra.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Fundability Index - Dev Mantra',
    template: '%s | Dev Mantra',
  },
  description:
    'Answer 12 focused questions. Get an AI-powered fundability score, tier classification, and a personalized 3-step action plan from Dev Mantra\'s advisory team.',
  keywords: [
    'fundability score',
    'investor readiness',
    'startup funding',
    'India startup',
    'Dev Mantra',
    'fundraising diagnostic',
    'pitch readiness',
    'venture capital India',
    'startup advisor',
  ],
  authors: [{ name: 'Dev Mantra Financial Services' }],
  creator: 'Dev Mantra Financial Services',
  publisher: 'Dev Mantra Financial Services',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Fundability Index - Are You Investor-Ready?',
    description: '3 minutes. 12 questions. Instant AI report. Know your fundability score before you pitch.',
    siteName: 'Dev Mantra',
    url: siteUrl,
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: '/india_vs_europe_calculator.png',
        width: 1734,
        height: 907,
        alt: 'India vs Europe Startup Funding Calculator - Dev Mantra',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fundability Index - Are You Investor-Ready?',
    description: '3 minutes. 12 questions. Instant AI report. Know your fundability score before you pitch.',
    images: ['/india_vs_europe_calculator.png'],
    creator: '@devmantra',
    site: '@devmantra',
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${onest.variable}`}>
      <head>
        <meta name="theme-color" content="#0B1829" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
