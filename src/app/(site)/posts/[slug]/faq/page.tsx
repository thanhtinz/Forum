import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { PostShell } from '@/components/post/PostShell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { title: true } });
  if (!post) return { title: 'Không tìm thấy bài viết' };
  return { title: `Câu hỏi thường gặp — ${post.title}` };
}

export default async function PostFaqPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PostShell slug={slug} section="faq" />;
}
