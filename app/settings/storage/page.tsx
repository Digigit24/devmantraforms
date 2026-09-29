import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export const metadata = {
  title: 'Storage Settings',
};

const envKeys = [
  'S3_BUCKET',
  'S3_REGION',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_FORCE_PATH_STYLE',
  'S3_PUBLIC_BASE_URL',
];

export default function StorageSettingsPage() {
  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Logo width={160} />
          <Link href="/dashboard" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Dashboard</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">Storage</p>
        <h1 className="mt-2 font-heading text-3xl font-black">S3-compatible uploads</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          CeliyoForms stores file and video objects outside the database. For production, use a new bucket and credentials for CeliyoForms, not the legacy Dev Mantra database or assets.
        </p>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-xl font-black">Required environment</h2>
          <div className="mt-4 grid gap-2">
            {envKeys.map((key) => (
              <code key={key} className="rounded-md bg-slate-100 px-3 py-2 text-sm">{key}</code>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
