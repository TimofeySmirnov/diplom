import { RoleProtectedShell } from '@/components/layout/role-protected-shell';
import { ADMIN_NAV } from '@/config/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtectedShell
      role="ADMIN"
      title="Панель администратора"
      subtitle="Администрирование"
      navItems={ADMIN_NAV}
    >
      {children}
    </RoleProtectedShell>
  );
}
