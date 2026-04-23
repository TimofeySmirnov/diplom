import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-gray-100 bg-white p-4 shadow-sm', className)}
      {...props}
    />
  );
}
