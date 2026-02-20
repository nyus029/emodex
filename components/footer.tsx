'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    name: 'HOME',
    href: '/',
    icon: '/home.svg',
  },
  {
    name: 'INSIGHT',
    href: '/insight',
    icon: '/insight.svg',
  },
  {
    name: 'INVEST',
    href: '/invest',
    icon: '/invest.svg',
  },
  {
    name: 'DIVIDEND',
    href: '/dividend',
    icon: '/dividend.svg',
  },
  {
    name: 'PORTFOLIO',
    href: '/portfolio',
    icon: '/portfolio.svg',
  },
];

export default function Footer() {
  const pathname = usePathname();

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white shadow-card">
      <nav className="flex items-center h-18">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-xs"
            >
              <Image
                src={item.icon}
                alt={item.name}
                width={24}
                height={24}
                className={`w-6 h-6 ${isActive ? 'opacity-100' : 'opacity-40'}`}
              />

              <span
                className={`text-xs font-semibold ${
                  isActive ? 'text-green' : 'text-gray-green'
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
