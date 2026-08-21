import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { truncate } from '@/lib/utils';
import { PostShell } from '@/components/post/PostShell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { title: true, excerpt: true, cover: true } });
  if (!post) return { title: 'Không tìm thấy bài viết' };
  const description = post.excerpt ? truncate(post.excerpt, 160) : undefined;
  return {
    title: post.title,
    description,
    openGraph: { title: post.title, description, type: 'article', images: post.cover ? [{ url: post.cover }] : undefined },
  };
}

export default async function PostDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ dl?: string }> }) {
  const { slug } = await params;
  const { dl } = await searchParams;
  return <PostShell slug={slug} section="detail" dl={dl} />;
}
