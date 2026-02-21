'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
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
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    if (shouldHideLayout) {
      return;
    }

    const headerNode = headerRef.current;
    const footerNode = footerRef.current;

    if (!headerNode || !footerNode) {
      return;
    }

    const updateHeights = () => {
      setHeaderHeight(headerNode.offsetHeight);
      setFooterHeight(footerNode.offsetHeight);
    };

    updateHeights();

    const observer = new ResizeObserver(updateHeights);
    observer.observe(headerNode);
    observer.observe(footerNode);

    window.addEventListener('resize', updateHeights);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeights);
    };
  }, [shouldHideLayout]);

  if (shouldHideLayout) {
    return <main className="h-app overflow-y-auto">{children}</main>;
  }

  const shellStyle = {
    '--layout-header-height': `${headerHeight}px`,
    '--layout-footer-height': `${footerHeight}px`,
  } as CSSProperties;

  return (
    <AgentCommentProvider>
      <div className="h-app overflow-hidden overscroll-none" style={shellStyle}>
        <div ref={headerRef} className="fixed inset-x-0 top-0 z-40">
          <Header />
        </div>
        <main className="h-app overflow-y-auto pt-(--layout-header-height) pb-(--layout-footer-height)">
          {children}
        </main>
        <div ref={footerRef} className="fixed inset-x-0 bottom-0 z-40">
          <Footer />
        </div>
      </div>
    </AgentCommentProvider>
  );
}
