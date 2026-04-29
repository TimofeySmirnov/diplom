import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Регистрация закрыта</h1>
      <p className="mt-1 text-sm text-gray-500">
        Самостоятельная регистрация отключена. Для создания аккаунта обратитесь к преподавателю
        или администратору.
      </p>
      <div className="mt-5">
        <Link href="/login">
          <Button>Перейти ко входу</Button>
        </Link>
      </div>
    </div>
  );
}
