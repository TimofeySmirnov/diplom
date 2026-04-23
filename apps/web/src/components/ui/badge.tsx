import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'accent';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-500',
  success: 'bg-emerald-100 text-emerald-500',
  warning: 'bg-yellow-100 text-yellow-500',
  accent: 'bg-emerald-100 text-emerald-500',
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
