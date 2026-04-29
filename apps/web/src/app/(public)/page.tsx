import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-gray-700">
          Единое пространство обучения для студентов и преподавателей.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-gray-500">
          ZSkills - современная LMS-платформа для создания и управления онлайн-курсами, на
          которой удобно учиться и обучать.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/login">
            <Button>Войти в систему</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h3 className="text-lg font-semibold text-gray-700">Удобно студентам и команде</h3>
          <p className="mt-2 text-sm text-gray-500">
            Понятный интерфейс помогает быстро начать обучение и не теряться в материалах.
          </p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-gray-700">Все форматы в одном месте</h3>
          <p className="mt-2 text-sm text-gray-500">
            Лекции, тесты и вебинары собраны в едином рабочем пространстве курса.
          </p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-gray-700">Готово для учебного процесса</h3>
          <p className="mt-2 text-sm text-gray-500">
            Создавайте и развивайте курсы, отслеживайте прогресс и управляйте обучением.
          </p>
        </Card>
      </section>
    </div>
  );
}
