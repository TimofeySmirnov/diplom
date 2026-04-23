import { RegisterForm } from '@/features/auth/components/register-form';

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Создайте аккаунт</h1>
      <p className="mt-1 text-sm text-gray-500">
        Зарегистрируйтесь как студент или преподаватель и начните обучение.
      </p>
      <div className="mt-5">
        <RegisterForm />
      </div>
    </div>
  );
}
