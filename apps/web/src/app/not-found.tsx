import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-700">Страница не найдена</h1>
        <p className="mt-2 text-sm text-gray-500">
          Страница, которую вы запрашиваете, не существует или была перемещена.
        </p>
        <div className="mt-5">
          <Link href="/">
            <Button>На главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
