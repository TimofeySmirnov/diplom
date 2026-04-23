import { Badge } from '@/components/ui/badge';
import { CourseStatus } from '@/types/domain';

type CourseStatusBadgeProps = {
  status: CourseStatus;
};

export function CourseStatusBadge({ status }: CourseStatusBadgeProps) {
  if (status === 'PUBLISHED') {
    return <Badge tone="success">Опубликован</Badge>;
  }

  return <Badge tone="warning">Черновик</Badge>;
}
