import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicFormRunner from '@/components/forms/PublicFormRunner';
import { getForm } from '@/lib/agentic-forms/runtime';

interface PageProps {
  params: Promise<{ formId: string }>;
}

export const metadata: Metadata = {
  title: 'Form',
  robots: { index: false, follow: false },
};

export default async function PublicFormPage({ params }: PageProps) {
  const { formId } = await params;
  try {
    const form = getForm(formId);
    if (form.status !== 'published') notFound();
    return <PublicFormRunner form={form} />;
  } catch {
    notFound();
  }
}

