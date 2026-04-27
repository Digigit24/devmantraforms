import Image from 'next/image';

interface Props {
  width?:   number;
  /** 'light' = logo on white/light bg (default) · 'dark' = logo on dark bg → white pill wrapper */
  variant?: 'light' | 'dark';
  className?: string;
}

export default function Logo({ width = 140, variant = 'light', className = '' }: Props) {
  const height = Math.round(width * 0.32);

  if (variant === 'dark') {
    return (
      <div className={`inline-flex items-center bg-white rounded-xl px-3 py-1.5 ${className}`}>
        <Image src="/logo.png" alt="Dev Mantra" width={width} height={height} className="object-contain" priority />
      </div>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="Dev Mantra"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority
    />
  );
}
