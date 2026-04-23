import { CourseCard } from './course-card';

type CourseGridItem = {
  id: string;
  title: string;
  description: string;
  progress?: number;
  tag?: string;
  href?: string;
  coverImageUrl?: string | null;
  meta?: string;
};

type CourseGridProps = {
  items: CourseGridItem[];
};

export function CourseGrid({ items }: CourseGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <CourseCard key={item.id} {...item} />
      ))}
    </div>
  );
}
