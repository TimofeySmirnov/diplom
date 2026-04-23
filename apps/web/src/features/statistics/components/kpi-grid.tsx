import { StatCard } from '@/components/ui/stat-card';

type KpiGridProps = {
  items: Array<{
    label: string;
    value: string;
    hint?: string;
  }>;
};

export function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}