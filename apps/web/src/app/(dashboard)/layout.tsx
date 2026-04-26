'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/wardrobe', label: 'Wardrobe' },
  { href: '/wardrobe/gaps', label: 'Gap Analysis' },
  { href: '/outfits', label: 'Outfits' },
  { href: '/trends', label: 'Trends' },
  { href: '/profile', label: 'Profile' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-900 flex flex-col py-8 px-4 fixed h-full">
        <Link href="/wardrobe" className="text-2xl font-bold mb-10 px-2">
          Fitte
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-lg transition text-sm font-medium',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-white hover:bg-gray-900'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
