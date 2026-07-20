import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-10 border-t border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="container-nova flex flex-col items-center justify-between gap-3 py-6 text-sm text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Nova Platform. Nền tảng blog + diễn đàn.</p>
        <nav className="flex items-center gap-4">
          <Link href="/vip" className="hover:text-brand-600">VIP</Link>
          <Link href="/forum" className="hover:text-brand-600">Diễn đàn</Link>
          <Link href="/search" className="hover:text-brand-600">Tìm kiếm</Link>
        </nav>
      </div>
    </footer>
  );
}
