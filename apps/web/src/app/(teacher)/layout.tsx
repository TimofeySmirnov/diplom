import { RoleProtectedShell } from '@/components/layout/role-protected-shell';
import { TEACHER_NAV } from '@/config/navigation';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtectedShell
      role="TEACHER"
      title="Кабинет преподавателя"
      subtitle="Раздел преподавателя"
      navItems={TEACHER_NAV}
    >
      {children}
    </RoleProtectedShell>
  );
}
