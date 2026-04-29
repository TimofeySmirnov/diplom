import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">С возвращением</h1>
      <p className="mt-1 text-sm text-gray-500">
        Войдите, чтобы продолжить обучение.
      </p>
      <div className="mt-5">
        <LoginForm />
      </div>
    </div>
  );
}
