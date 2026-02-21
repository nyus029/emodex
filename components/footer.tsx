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
    name: 'ALBUM',
    href: '/album',
    icon: '/album.svg',
  },
  {
    name: 'INVEST',
    href: '/invests',
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
    // pb-safe: iOS ホームインジケーター分の safe area を確保
    <footer className="bg-white shadow-card pb-safe pl-safe pr-safe">
      <nav className="flex items-center h-18">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-xs min-h-11"
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
