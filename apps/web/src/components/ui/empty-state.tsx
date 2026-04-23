import { ReactNode } from 'react';
import { Card } from './card';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="text-center">
      <h3 className="text-2xl font-semibold text-gray-700">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-base text-gray-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}
