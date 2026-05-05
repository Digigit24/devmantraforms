import type { Metadata } from 'next';
import { Inter, Onest } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const META_PIXEL_ID = '1298473208904876';

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
      <head>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');`}
        </Script>
      </head>
      <body>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
