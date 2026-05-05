'use client';

import { useEffect } from 'react';

interface Props {
  id: string;
}

export default function MetaPixelLead({ id }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.fbq?.('track', 'Lead', {
      content_name: 'Fundability Result',
      content_id: id,
    });
  }, [id]);

  return null;
}
