'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  CirclePlus,
  LayoutDashboard,
  LineChart,
  TrendingUp,
} from 'lucide-react';
import { NavItem } from '@/types/navigation';
import { cn } from '@/lib/utils/cn';

type SideNavProps = {
  title: string;
  subtitle: string;
  items: NavItem[];
};

export function SideNav({ title, subtitle, items }: SideNavProps) {
  const pathname = usePathname();

  return (
    <aside className="border-r border-gray-200 bg-slate-900 px-4 py-5 lg:sticky lg:top-0 lg:h-screen">
      <div className="rounded-2xl bg-slate-800 p-4">
        <p className="text-xs  tracking-wide text-slate-400">{subtitle}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-100">{title}</h2>
      </div>

      <nav className="mt-5 grid gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = navIconByHref(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                'flex items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                active
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Icon size={18} />
                {item.label}
              </span>
              {item.badge ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400',
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function navIconByHref(href: string) {
  if (href.endsWith('/dashboard')) return LayoutDashboard;
  if (href.endsWith('/courses')) return BookOpen;
  if (href.endsWith('/courses/new')) return CirclePlus;
  if (href.endsWith('/progress')) return TrendingUp;
  if (href.endsWith('/statistics')) return BarChart3;
  return LineChart;
}
