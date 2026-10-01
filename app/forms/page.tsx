import type { Metadata } from 'next';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import SignOutLink from '@/components/auth/SignOutLink';
import FormBuilderClient from '@/components/forms/FormBuilderClient';
import { resolveAdminTenant } from '@/lib/agentic-forms/runtime';

export const metadata: Metadata = {
  title: 'Agentic Form Builder',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function FormsPage({ searchParams }: PageProps) {
  const { tenant: tenantSlug } = await searchParams;
  const tenant = resolveAdminTenant(tenantSlug);
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Logo width={160} />
          <div className="flex items-center gap-2">
            <Link href={`/dashboard?tenant=${tenant.slug}`} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Dashboard</Link>
            <SignOutLink />
          </div>
        </div>
      </header>
      <FormBuilderClient tenantSlug={tenant.slug} />
    </>
  );
}
