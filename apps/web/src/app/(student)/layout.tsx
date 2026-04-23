import { RoleProtectedShell } from '@/components/layout/role-protected-shell';
import { STUDENT_NAV } from '@/config/navigation';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtectedShell
      role="STUDENT"
      title="Кабинет студента"
      subtitle="ZSkills"
      navItems={STUDENT_NAV}
    >
      {children}
    </RoleProtectedShell>
  );
}
