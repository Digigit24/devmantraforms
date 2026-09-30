import type { Metadata } from 'next';
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
  return <FormBuilderClient tenantSlug={tenant.slug} />;
}
