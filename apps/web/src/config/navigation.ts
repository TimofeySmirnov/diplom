import { NavItem } from '@/types/navigation';

export const STUDENT_NAV: NavItem[] = [
  { href: '/student/dashboard', label: 'Панель' },
  { href: '/student/courses', label: 'Мои курсы' },
  { href: '/student/progress', label: 'Прогресс' },
];

export const TEACHER_NAV: NavItem[] = [
  { href: '/teacher/courses', label: 'Курсы' },
  { href: '/teacher/courses/new', label: 'Новый курс' },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/teachers', label: 'Преподаватели' },
  { href: '/admin/students', label: 'Студенты' },
];

