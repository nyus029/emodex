'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { AgentCommentProvider } from '@/lib/agent-comment-context';

type LayoutShellProps = {
  children: ReactNode;
};

const HIDE_LAYOUT_PATHS = new Set(['/login']);

export default function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();
  const shouldHideLayout = HIDE_LAYOUT_PATHS.has(pathname);

  if (shouldHideLayout) {
    return <main className="h-app overflow-y-auto">{children}</main>;
  }

  return (
    <AgentCommentProvider>
      <div className="flex flex-col h-app overflow-hidden overscroll-none">
        <div className="shrink-0">
          <Header />
        </div>
        <main className="grow overflow-y-auto">{children}</main>
        <div className="shrink-0">
          <Footer />
        </div>
      </div>
    </AgentCommentProvider>
  );
}
