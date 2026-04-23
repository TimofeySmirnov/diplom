import { Card } from '@/components/ui/card';

type ActivityFeedProps = {
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
  }>;
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-700">Последняя активность</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-700">{item.title}</p>
            <p className="mt-1 text-xs text-gray-500">{item.subtitle}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
