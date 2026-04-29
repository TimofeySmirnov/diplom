import Link from 'next/link';
import { FileBox, GraduationCap, List, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-gray-700">
          ZSkills
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-gray-500 md:flex">
          <Link href="/" className="inline-flex items-center gap-2 hover:text-gray-700">
            <List size={18} />
            Возможности
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 hover:text-gray-700">
            <GraduationCap size={18} />
            Решения
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 hover:text-gray-700">
            <FileBox size={18} />
            Материалы
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="secondary" size="sm">
              <LogIn size={18} className="mr-1" />
              Войти
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
