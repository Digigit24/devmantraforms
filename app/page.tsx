import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import HeroSection from '@/components/landing/HeroSection';
import StickyScrollSection from '@/components/landing/StickyScrollSection';

const STEPS = [
  {
    num: '01',
    title: 'Answer 12 Questions',
    body:  'Cover your team, market, competitive moat, channels, stage, and funding ask. Takes ~3 minutes.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'AI Analyses Your Profile',
    body:  'A deterministic scoring engine evaluates 6 investment dimensions. Then Mistral AI writes a personalised advisory verdict.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Get Your Report Instantly',
    body:  'Score, tier, executive verdict, and a 3-point action plan - emailed as a branded PDF within seconds of completing the diagnostic.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

const STATS = [
  { value: '₹5,000 Cr+', label: 'In transactions'   },
  { value: '20+',         label: 'Years of advisory'  },
  { value: '500+',        label: 'Startups assessed'  },
  { value: 'Series A',    label: 'Proven track record' },
];

const SERVICES = ['Virtual CFO', 'M&A Advisory', 'IPO Readiness', 'Compliance', 'GCC Setup'];

export default function LandingPage() {
  return (
    <main>

      {/* ── HERO (client component for animations) ───────────────────── */}
      <HeroSection />

      {/* ── STATS STRIP ──────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-16 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-heading font-black text-3xl text-navy-light mb-1">{s.value}</div>
              <div className="text-text-muted text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-off-white py-20 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-brand-blue text-xs font-semibold tracking-widest uppercase mb-4">
              <div className="w-5 h-px bg-brand-blue" />
              How It Works
              <div className="w-5 h-px bg-brand-blue" />
            </div>
            <h2 className="font-heading font-black text-navy-light text-4xl" style={{ letterSpacing: '-0.02em' }}>
              From Question to Report in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map(s => (
              <div
                key={s.num}
                className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
                <div className="text-brand-blue mb-4">{s.icon}</div>
                <div className="font-heading font-black text-5xl text-gray-100 absolute top-5 right-6">{s.num}</div>
                <h3 className="font-heading font-bold text-navy-light text-base mb-2">{s.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/diagnostic">
              <button className="bg-brand-gradient hover:opacity-90 text-white font-heading font-bold text-sm px-7 py-3.5 rounded-xl transition-colors">
                Start Now - It's Free →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STICKY SCROLL: WHAT YOU'LL GET (client component) ────────── */}
      <StickyScrollSection />

      {/* ── ABOUT DEV MANTRA ─────────────────────────────────────────── */}
      <section className="bg-off-white py-20 px-6 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* Text */}
            <div>
              {/* Logo on light bg - no wrapper needed */}
              <Logo width={160} variant="light" className="mb-8" />
              <h2 className="font-heading font-black text-navy-light text-3xl mb-4" style={{ letterSpacing: '-0.02em' }}>
                20+ Years Helping Founders Raise Capital
              </h2>
              <p className="text-text-body leading-relaxed mb-6">
                Dev Mantra Financial Services and N. Tatia &amp; Associates have advised 500+ Indian startups
                across funding rounds, M&amp;A transactions, IPO readiness, and compliance. We built this
                diagnostic to give founders a clear, honest picture of where they stand - before they
                walk into an investor meeting.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {SERVICES.map(s => (
                  <span key={s} className="bg-white border border-gray-200 text-navy-light text-xs font-semibold px-3.5 py-1.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
              <Link href="/diagnostic">
                <button className="bg-brand-gradient hover:opacity-90 text-white font-heading font-bold px-7 py-3.5 rounded-xl transition-colors text-sm">
                  Take the Diagnostic →
                </button>
              </Link>
            </div>

            {/* About image */}
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-md">
              <img
                src="/about.png"
                alt="Dev Mantra advisory team"
                className="w-full h-full object-cover"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="relative bg-navy-gradient overflow-hidden py-24 px-6 lg:px-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-blue opacity-[0.06] blur-[80px] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-brand-blue text-xs font-semibold tracking-widest uppercase mb-6">
            <div className="w-5 h-px bg-brand-blue" />
            Free Diagnostic
            <div className="w-5 h-px bg-brand-blue" />
          </div>
          <h2 className="font-heading font-black text-white text-4xl lg:text-5xl mb-4" style={{ letterSpacing: '-0.025em' }}>
            Ready to Know Where You Stand?
          </h2>
          <p className="text-white/55 text-lg mb-10">
            Your fundability score is 3 minutes away. No credit card. No fluff.
          </p>
          <Link href="/diagnostic">
            <button className="group inline-flex items-center gap-3 bg-brand-gradient hover:opacity-90 text-white font-heading font-bold text-lg px-10 py-5 rounded-2xl transition-all shadow-xl shadow-brand-blue/20">
              Start Your Fundability Check
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Link>
          <p className="text-white/25 text-sm mt-4">Free · Instant report · PDF emailed immediately</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-navy-deep border-t border-white/5 pt-12 pb-8 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto">

          {/* Contact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10 mb-8">

            <div className="lg:col-span-1">
              <Logo width={120} variant="dark" className="mb-3" />
              <p className="text-white/35 text-xs leading-relaxed">
                Dev Mantra Financial Services<br />N. Tatia &amp; Associates
              </p>
            </div>

            <div>
              <div className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Call Us</div>
              <a href="tel:+918042061247" className="text-white/60 hover:text-white text-sm transition-colors">
                +91-80-4206-1247
              </a>
            </div>

            <div>
              <div className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Email</div>
              <a href="mailto:info@devmantra.com" className="text-white/60 hover:text-white text-sm transition-colors">
                info@devmantra.com
              </a>
            </div>

            <div>
              <div className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Head Office</div>
              <p className="text-white/50 text-xs leading-relaxed">
                No.85/1, 2nd Floor, 10th Cross<br />
                CBI Road, Ganganagar<br />
                Bengaluru - 560024
              </p>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/20 text-xs text-center sm:text-left">
              © {new Date().getFullYear()} Dev Mantra Financial Services · N. Tatia &amp; Associates
            </p>
            <a href="https://devmantra.com" className="text-white/30 hover:text-white/60 text-xs transition-colors">
              devmantra.com
            </a>
          </div>

        </div>
      </footer>

    </main>
  );
}
