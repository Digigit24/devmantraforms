interface Props {
  width?: number;
  variant?: 'light' | 'dark';
  className?: string;
}

export default function Logo({ width = 140, variant = 'light', className = '' }: Props) {
  const sizeClass = width >= 150 ? 'text-2xl' : width >= 120 ? 'text-xl' : 'text-lg';
  const colorClass = variant === 'dark' ? 'text-white' : 'text-slate-950';

  return (
    <span className={`inline-flex items-center font-heading font-black ${sizeClass} ${colorClass} ${className}`}>
      CeliyoForms
    </span>
  );
}
