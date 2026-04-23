import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type LessonPanelProps = {
  title: string;
  type: 'LECTURE' | 'TEST' | 'WEBINAR';
  description: string;
};

export function LessonPanel({ title, type, description }: LessonPanelProps) {
  const typeLabel =
    type === 'LECTURE' ? 'Лекция' : type === 'TEST' ? 'Тест' : 'Вебинар';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
        <Badge tone={type === 'TEST' ? 'warning' : type === 'WEBINAR' ? 'accent' : 'neutral'}>
          {typeLabel}
        </Badge>
      </div>
      <p className="mt-3 text-sm text-gray-500">{description}</p>
      <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
        Область содержимого урока. В MVP этот блок заменяется контентом по типу урока.
      </div>
    </Card>
  );
}
