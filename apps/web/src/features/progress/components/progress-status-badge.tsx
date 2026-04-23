import { Badge } from '@/components/ui/badge';
import { LessonProgressStatus } from '@/types/domain';

type ProgressStatusBadgeProps = {
  status: LessonProgressStatus;
};

export function ProgressStatusBadge({ status }: ProgressStatusBadgeProps) {
  if (status === 'COMPLETED') {
    return <Badge tone="success">Завершено</Badge>;
  }

  if (status === 'IN_PROGRESS') {
    return <Badge tone="warning">В процессе</Badge>;
  }

  return <Badge tone="neutral">Не начато</Badge>;
}
