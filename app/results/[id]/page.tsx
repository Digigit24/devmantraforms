import { notFound } from 'next/navigation';
import { getResultById } from '@/lib/db';
import ResultsView from '@/components/results/ResultsView';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const result = await getResultById(id);
  if (!result) return { title: 'Result Not Found' };
  return {
    title: `${result.companyName} — ${result.finalScore}/100 Fundability Score`,
    description: `${result.founderName}'s fundability report from Dev Mantra.`,
  };
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const result = await getResultById(id);
  if (!result) notFound();
  return <ResultsView result={result} />;
}
