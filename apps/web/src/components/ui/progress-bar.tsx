import { cn } from '@/lib/utils/cn';

type ProgressBarProps = {
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('h-2 w-full rounded-full bg-gray-100', className)}>
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
