import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { MessagesSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { forumTint } from '@/lib/forum';
import { checkForumPostAccess } from '@/lib/forum-post-access';
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
  const forum = await db.forum.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, icon: true, description: true,
      postAccess: true, minLevel: true, requiredMedalId: true,
    },
  });
  if (!forum) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/forum/${slug}/new`)}`);

  // Báo trước cho khỏi gõ cả bài rồi mới biết không được đăng ở đây.
  const denied = await checkForumPostAccess(session.user.id, forum);

  const wallet = await db.user.findUnique({ where: { id: session.user.id }, select: { points: true } });
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

        {denied ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">{denied}</p>
            <Link href={`/forum/${forum.slug}`} className="mt-2 inline-block text-brand-600 hover:underline">
              Quay lại {forum.name}
            </Link>
          </div>
        ) : (
          <NewThreadForm forumSlug={forum.slug} myPoints={wallet?.points ?? 0} />
        )}
      </div>
    </div>
  );
}
