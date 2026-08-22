import Link from 'next/link';
import { db } from '@/lib/db';
import { getNavItems } from '@/lib/nav';
import { getSiteSettings } from '@/lib/site';

export async function Footer() {
  const [nav, site] = await Promise.all([getNavItems('footer'), getSiteSettings()]);
  const friendLinks = await db.friendLink
    .findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      take: 20,
      select: { id: true, name: true, url: true, description: true },
    })
    .catch(() => []);

  return (
    <footer className="mt-10 border-t border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-950">
      {friendLinks.length > 0 && (
        <div className="container-nova border-b border-ink-100 py-5 dark:border-ink-800">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Liên kết bạn bè</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {friendLinks.map((l) => (
              <a key={l.id} href={l.url} title={l.description ?? l.name} target="_blank" rel="noopener noreferrer nofollow"
                className="text-sm text-ink-500 hover:text-brand-600">
                {l.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="container-nova flex flex-col items-center justify-between gap-3 py-6 text-sm text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} {site.footerText}</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {nav.map((n) => (
            <Link key={n.id} href={n.url} className="hover:text-brand-600">{n.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
