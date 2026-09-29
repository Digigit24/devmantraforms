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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'CeliyoForms - Agentic Forms and MCP Runtime',
    template: '%s | CeliyoForms',
  },
  description: 'Build tenant-aware forms, async interviews, file and video submissions, and MCP-first workflows for any agent.',
  keywords: ['agentic forms', 'MCP forms', 'form builder', 'async interview', 'video form', 'AI agents', 'tenant forms'],
  authors: [{ name: 'CeliyoForms' }],
  creator: 'CeliyoForms',
  publisher: 'CeliyoForms',
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
    title: 'CeliyoForms - Agentic Forms and MCP Runtime',
    description: 'A SaaS-ready, tenant-aware form runtime that agents can operate through MCP.',
    siteName: 'CeliyoForms',
    url: siteUrl,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'CeliyoForms - Agentic Forms and MCP Runtime',
    description: 'Build forms that humans answer and agents can run.',
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
