import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';

type CourseCardProps = {
  id: string;
  title: string;
  description: string;
  progress?: number;
  tag?: string;
  href?: string;
  coverImageUrl?: string | null;
  meta?: string;
};

export function CourseCard({
  id,
  title,
  description,
  progress,
  tag,
  href,
  coverImageUrl,
  meta,
}: CourseCardProps) {
  return (
    <Link href={(href ?? `/courses/${id}`) as Route}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-xl">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={title} className="mb-4 h-36 w-full rounded-xl object-cover" />
        ) : (
          <div className="mb-4 h-36 w-full rounded-xl bg-gradient-to-br from-emerald-500/20 via-gray-50 to-emerald-100" />
        )}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
          {tag ? <Badge tone="accent">{tag}</Badge> : null}
        </div>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        {meta ? <p className="mt-3 text-xs font-medium text-gray-500">{meta}</p> : null}
        {progress !== undefined ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Прогресс</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        ) : null}
      </Card>
    </Link>
  );
}
