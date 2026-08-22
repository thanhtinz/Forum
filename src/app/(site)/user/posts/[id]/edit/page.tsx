import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fromParagraphs } from '@/lib/post-form';
import { WriteForm, type CatOption, type PostDraft } from '@/components/write/WriteForm';
import { updatePost } from '../../actions';

export const metadata: Metadata = { title: 'Sửa bài viết' };
export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/user/posts/${id}/edit`);

  const post = await db.post.findUnique({
    where: { id },
    include: {
      categories: { select: { category: { select: { slug: true } } } },
      tags: { select: { tag: { select: { name: true } } } },
      downloads: { orderBy: { order: 'asc' } },
    },
  });
  if (!post) notFound();

  const role = (session.user as { role?: string }).role;
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  if (post.authorId !== session.user.id && !isStaff) redirect('/user/posts');

  const cats = await db.category.findMany({
    orderBy: [{ order: 'asc' }],
    select: { slug: true, name: true, color: true, parent: { select: { name: true } } },
  });
  const options: CatOption[] = cats.map((c) => ({ slug: c.slug, name: c.name, color: c.color, parentName: c.parent?.name ?? null }));

  const initial: PostDraft = {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt ?? '',
    content: fromParagraphs(post.content),
    hiddenContent: fromParagraphs(post.hiddenContent),
    cover: post.cover ?? '',
    cardStyle: post.cardStyle,
    access: post.access,
    pricePoints: post.pricePoints != null ? String(post.pricePoints) : '',
    priceAmount: post.priceAmount != null ? String(post.priceAmount) : '',
    tags: post.tags.map((t) => t.tag.name).join(', '),
    categorySlugs: post.categories.map((c) => c.category.slug),
    downloads: post.downloads.map((d) => ({
      label: d.label,
      url: d.url,
      provider: d.provider ?? '',
      version: d.version ?? '',
      sizeMb: d.sizeBytes != null ? String(Math.round((Number(d.sizeBytes) / 1024 / 1024) * 10) / 10) : '',
      password: d.password ?? '',
      extractCode: d.extractCode ?? '',
    })),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/user/posts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Bài viết của tôi
      </Link>
      <WriteForm categories={options} initial={initial} action={updatePost} />
    </div>
  );
}
