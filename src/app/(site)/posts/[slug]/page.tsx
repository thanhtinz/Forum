import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Eye, MessageSquare, Heart, Calendar, Crown, Coins, Lock } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { canAccess, isVipActive, type AccessUser } from '@/lib/access';
import { Paywall } from '@/components/Paywall';
import { DownloadBox } from '@/components/DownloadBox';
import { fmtCount, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getPost(slug: string) {
  return db.post.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      author: { select: { username: true, name: true, image: true, level: true, vipTier: true } },
      category: { select: { name: true, slug: true, color: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
      downloads: { orderBy: { order: 'asc' } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { title: true, excerpt: true, cover: true },
  });
  if (!post) return { title: 'Không tìm thấy bài viết' };
  const description = post.excerpt ? truncate(post.excerpt, 160) : undefined;
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const session = await auth();
  const su = session?.user;
  const accessUser: AccessUser | null = su?.id
    ? { id: su.id, vipTier: su.vipTier ?? null, vipExpiresAt: su.vipExpiresAt ?? null, vipPermanent: su.vipPermanent ?? false }
    : null;
  const isAuthor = !!accessUser && post.authorId === accessUser.id;

  // Quyền lợi "VIP xem mọi nội dung miễn phí" — chỉ tra VipPlan khi VIP còn hiệu lực.
  let vipFreeContent = false;
  if (accessUser && accessUser.vipTier != null && isVipActive(accessUser)) {
    const plan = await db.vipPlan.findUnique({ where: { tier: accessUser.vipTier }, select: { freeContent: true } });
    vipFreeContent = !!plan?.freeContent;
  }

  const access = await canAccess(accessUser, post, { isAuthor, vipFreeContent });

  // Bảng giá VIP cho khối tải xuống (chỉ tra khi bài có file).
  const plans = post.downloads.length > 0
    ? await db.vipPlan.findMany({
        where: { active: true },
        orderBy: { tier: 'asc' },
        select: { tier: true, name: true, discountPercent: true, freeContent: true },
      })
    : [];

  // Đếm view (best-effort; tối ưu bằng Redis batch ở giai đoạn sau).
  await db.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const published = post.publishedAt ?? post.createdAt;

  const hiddenBlock = post.hiddenContent ? (
    <div className="mt-2 rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-950/20">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
        <Lock size={13} /> Nội dung mở khoá
      </div>
      <div
        className="prose prose-ink max-w-none dark:prose-invert prose-a:text-brand-600"
        dangerouslySetInnerHTML={{ __html: post.hiddenContent }}
      />
    </div>
  ) : null;

  return (
    <article className="mx-auto max-w-3xl">
      {/* Breadcrumb + chuyên mục */}
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-ink-400">
        <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
        {post.category && (
          <>
            <span>/</span>
            <Link href={`/category/${post.category.slug}`} className="hover:text-brand-600">{post.category.name}</Link>
          </>
        )}
      </nav>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {post.category && (
            <Link href={`/category/${post.category.slug}`} className="chip text-white"
              style={{ backgroundColor: post.category.color || '#2c7bfe' }}>
              {post.category.name}
            </Link>
          )}
          <AccessTag access={post.access} pricePoints={post.pricePoints} priceAmount={post.priceAmount} />
        </div>

        <h1 className="text-2xl font-black leading-tight sm:text-3xl">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500">
          <Link href={`/u/${post.author?.username ?? ''}`} className="flex items-center gap-2 font-medium text-ink-700 dark:text-ink-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {post.author?.image
              ? <img src={post.author.image} alt="" className="h-7 w-7 rounded-full object-cover" />
              : <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-200 text-xs font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200">{(post.author?.name ?? post.author?.username ?? 'U')[0]?.toUpperCase()}</span>}
            {post.author?.name ?? post.author?.username ?? 'Ẩn danh'}
          </Link>
          <span className="flex items-center gap-1"><Calendar size={14} />{format(published, 'dd/MM/yyyy')}</span>
          <span className="flex items-center gap-1"><Eye size={14} />{fmtCount(post.viewCount)}</span>
          <span className="flex items-center gap-1"><MessageSquare size={14} />{fmtCount(post.commentCount)}</span>
          <span className="flex items-center gap-1"><Heart size={14} />{fmtCount(post.likeCount)}</span>
        </div>
      </header>

      {post.cover && (
        <div className="mt-5 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover} alt="" className="w-full object-cover" />
        </div>
      )}

      {/* Nội dung công khai — luôn hiển thị */}
      <div
        className="prose prose-ink mt-6 max-w-none dark:prose-invert prose-a:text-brand-600"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Nội dung ẩn — CHỈ render khi được phép (không bao giờ gửi xuống client nếu bị khoá) */}
      {post.downloads.length > 0 ? (
        <>
          {access.allowed && hiddenBlock}
          <DownloadBox
            postId={post.id}
            slug={post.slug}
            allowed={access.allowed}
            reason={access.reason}
            access={post.access}
            pricePoints={post.pricePoints}
            priceAmount={post.priceAmount}
            downloads={post.downloads.map((d) => ({
              id: d.id, label: d.label, url: d.url, provider: d.provider,
              version: d.version, password: d.password, extractCode: d.extractCode,
              sizeBytes: d.sizeBytes == null ? null : Number(d.sizeBytes),
            }))}
            plans={plans}
            updatedAt={format(post.updatedAt, 'yyyy-MM-dd')}
            callbackUrl={`/posts/${post.slug}`}
          />
        </>
      ) : access.allowed ? (
        hiddenBlock
      ) : (
        <Paywall
          postId={post.id}
          slug={post.slug}
          reason={access.reason}
          pricePoints={post.pricePoints}
          priceAmount={post.priceAmount}
          vipTierFree={post.vipTierFree}
          callbackUrl={`/posts/${post.slug}`}
        />
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
          {post.tags.map(({ tag }) => (
            <Link key={tag.slug} href={`/tag/${tag.slug}`}
              className="chip bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300">
              #{tag.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function AccessTag({ access, pricePoints, priceAmount }: {
  access: string; pricePoints: number | null; priceAmount: number | null;
}) {
  if (access === 'FREE' || access === 'LOGIN_REQUIRED') return null;
  if (access === 'VIP_ONLY')
    return <span className="chip gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Crown size={12} /> VIP</span>;
  if (access === 'POINTS')
    return <span className="chip gap-1 bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"><Coins size={12} /> {fmtCount(pricePoints)} điểm</span>;
  return <span className="chip gap-1 bg-accent-500/15 text-accent-600"><Lock size={12} /> {(priceAmount ?? 0).toLocaleString('vi-VN')}₫</span>;
}
