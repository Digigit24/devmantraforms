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
  const title = `${result.companyName} - ${result.finalScore}/100 Fundability Score`;
  const description = `${result.founderName}'s investor-readiness report from Dev Mantra. Score: ${result.finalScore}/100. See the full AI-powered fundability breakdown.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: '/india_vs_europe_calculator.png',
          width: 1734,
          height: 907,
          alt: 'Dev Mantra Fundability Report',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/india_vs_europe_calculator.png'],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const result = await getResultById(id);
  if (!result) notFound();
  return <ResultsView result={result} />;
}
