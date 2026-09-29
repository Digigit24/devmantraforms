import type { Metadata } from 'next';
import FormBuilderClient from '@/components/forms/FormBuilderClient';

export const metadata: Metadata = {
  title: 'Agentic Form Builder',
  robots: { index: false, follow: false },
};

export default function FormsPage() {
  return <FormBuilderClient />;
}

