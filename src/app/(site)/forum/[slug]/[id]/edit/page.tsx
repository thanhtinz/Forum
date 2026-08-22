import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canModerateForum } from '@/lib/moderation';
import { EditThreadForm } from '@/components/forum/EditThreadForm';

export const metadata: Metadata = { title: 'Sửa chủ đề' };
export const dynamic = 'force-dynamic';

/** Dựng lại văn bản thô từ HTML cũ (chủ đề đăng trước khi có BBCode). */
function htmlToText(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .trim();
}

export default async function EditThreadPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/forum/${slug}/${id}/edit`);

  const thread = await db.thread.findUnique({
    where: { id },
    select: {
      id: true, title: true, content: true, contentSource: true, locked: true,
      authorId: true, forumId: true, forum: { select: { slug: true, name: true } },
    },
  });
  if (!thread || thread.forum.slug !== slug) notFound();

  if (thread.authorId !== session.user.id) {
    const isMod = await canModerateForum(
      { id: session.user.id, role: (session.user as { role?: string }).role },
      thread.forumId,
    );
    if (!isMod) redirect(`/forum/${slug}/${id}`);
  }
  if (thread.locked) redirect(`/forum/${slug}/${id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/forum/${slug}/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Quay lại chủ đề
      </Link>
      <EditThreadForm
        threadId={thread.id}
        title={thread.title}
        content={thread.contentSource ?? htmlToText(thread.content)}
      />
    </div>
  );
}
