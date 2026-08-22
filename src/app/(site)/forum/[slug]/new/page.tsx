import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { MessagesSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { forumTint } from '@/lib/forum';
import { NewThreadForm } from '@/components/forum/NewThreadForm';
import { IconGlyph } from '@/components/IconGlyph';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const forum = await db.forum.findUnique({ where: { slug }, select: { name: true } });
  return { title: forum ? `Đăng chủ đề · ${forum.name}` : 'Đăng chủ đề' };
}

export default async function NewThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const forum = await db.forum.findUnique({ where: { slug }, select: { slug: true, name: true, icon: true, description: true } });
  if (!forum) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/forum/${slug}/new`)}`);

  const tint = forumTint(forum.slug);

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-ink-400">
        <Link href="/" className="hover:text-brand-600">Diễn đàn</Link>
        <span>/</span>
        <Link href={`/forum/${forum.slug}`} className="hover:text-brand-600">{forum.name}</Link>
      </nav>

      <div className="card p-5 sm:p-6">
        <header className="mb-5 flex items-center gap-3 border-b border-ink-100 pb-4 dark:border-ink-800">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${tint}1f`, color: tint }}>
            <IconGlyph icon={forum.icon} fallback={<MessagesSquare size={22} />} className="size-9" />
          </span>
          <div>
            <h1 className="text-lg font-bold">Đăng chủ đề mới</h1>
            <p className="text-sm text-ink-500">tại <span className="font-medium">{forum.name}</span></p>
          </div>
        </header>

        <NewThreadForm forumSlug={forum.slug} />
      </div>
    </div>
  );
}
