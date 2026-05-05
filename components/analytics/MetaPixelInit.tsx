'use client';

import { useEffect } from 'react';

const META_PIXEL_ID = '1298473208904876';
const FBEVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';
const SCRIPT_ID = 'meta-pixel-fbevents';

export default function MetaPixelInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.fbq) return;
    if (document.getElementById(SCRIPT_ID)) return;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const shim: any = function (...args: unknown[]) {
      if (shim.callMethod) {
        shim.callMethod.apply(shim, args);
      } else {
        shim.queue.push(args);
      }
    };
    shim.push = shim;
    shim.loaded = true;
    shim.version = '2.0';
    shim.queue = [];

    window.fbq = shim;
    if (!window._fbq) window._fbq = shim;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = FBEVENTS_SRC;
    document.head.appendChild(script);

    window.fbq?.('init', META_PIXEL_ID);
  }, []);

  return null;
}
