'use client';

import { useEffect } from 'react';

interface Props {
  dedupeKey?: string;
}

export default function MetaPixelLead({ dedupeKey }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    window.fbq('track', 'Lead');
  }, [dedupeKey]);

  return null;
}
