import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Phân trang đơn giản dựa trên query param `?page=`. */
export function Pagination({ page, totalPages, basePath, pageParam = 'page' }: {
  page: number; totalPages: number; basePath: string;
  /** Tên tham số trang trên URL (mặc định `page`). */
  pageParam?: string;
}) {
  if (totalPages <= 1) return null;
  const sep = basePath.includes('?') ? '&' : '?';
  const href = (p: number) => `${basePath}${sep}${pageParam}=${p}`;

  // Danh sách trang gọn quanh trang hiện tại
  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  for (let i = from; i <= to; i++) pages.push(i);

  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5">
      <PageLink href={href(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></PageLink>
      {from > 1 && <><PageLink href={href(1)}>1</PageLink>{from > 2 && <span className="px-1 text-ink-400">…</span>}</>}
      {pages.map((p) => (
        <PageLink key={p} href={href(p)} active={p === page}>{p}</PageLink>
      ))}
      {to < totalPages && <>{to < totalPages - 1 && <span className="px-1 text-ink-400">…</span>}<PageLink href={href(totalPages)}>{totalPages}</PageLink></>}
      <PageLink href={href(page + 1)} disabled={page >= totalPages}><ChevronRight size={16} /></PageLink>
    </nav>
  );
}

function PageLink({ href, children, active, disabled }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  const cls = 'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-medium transition-colors';
  if (disabled) return <span className={`${cls} cursor-not-allowed text-ink-300`}>{children}</span>;
  if (active) return <span className={`${cls} bg-brand-500 text-white`}>{children}</span>;
  return <Link href={href} className={`${cls} border border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300`}>{children}</Link>;
}
