import Link from 'next/link';
import { Eye, MessageSquare, Heart, Lock, Coins, Crown, ImageIcon } from 'lucide-react';
import type { AccessLevel, CardStyle } from '@prisma/client';
import { cn, fmtCount, fmtVnd } from '@/lib/utils';

export interface PostCardData {
  slug: string;
  title: string;
  excerpt?: string | null;
  cover?: string | null;
  cardStyle: CardStyle;
  access: AccessLevel;
  pricePoints?: number | null;
  priceAmount?: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  gallery?: string[];
  author?: { username?: string | null; name?: string | null; image?: string | null } | null;
  category?: { name: string; slug: string; color?: string | null } | null;
}

function AccessBadge({ post }: { post: PostCardData }) {
  if (post.access === 'FREE' || post.access === 'LOGIN_REQUIRED') return null;
  if (post.access === 'VIP_ONLY')
    return <span className="chip gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Crown size={11} /> VIP</span>;
  if (post.access === 'POINTS')
    return <span className="chip gap-1 bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"><Coins size={11} /> {fmtCount(post.pricePoints)} điểm</span>;
  return <span className="chip gap-1 bg-accent-500/15 text-accent-600"><Lock size={11} /> {fmtVnd(post.priceAmount)}</span>;
}

function Meta({ post }: { post: PostCardData }) {
  return (
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-2.5 dark:border-ink-800">
      <Link href={`/u/${post.author?.username ?? ''}`} className="flex min-w-0 items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {post.author?.image
          ? <img src={post.author.image} alt="" className="h-6 w-6 rounded-full object-cover" />
          : <span className="grid h-6 w-6 place-items-center rounded-full bg-ink-200 text-[10px] font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200">{(post.author?.name ?? post.author?.username ?? 'U')[0]?.toUpperCase()}</span>}
        <span className="truncate text-xs font-medium text-ink-600 dark:text-ink-300">{post.author?.name ?? post.author?.username ?? 'Ẩn danh'}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-ink-400">
        <span className="flex items-center gap-0.5"><Eye size={12} />{fmtCount(post.viewCount)}</span>
        <span className="flex items-center gap-0.5"><MessageSquare size={12} />{fmtCount(post.commentCount)}</span>
        <span className="flex items-center gap-0.5"><Heart size={12} />{fmtCount(post.likeCount)}</span>
      </div>
    </div>
  );
}

function CategoryChip({ post, overlay }: { post: PostCardData; overlay?: boolean }) {
  if (!post.category) return null;
  return (
    <span className={cn('chip', overlay ? 'bg-black/55 text-white backdrop-blur-sm' : 'text-white')}
      style={overlay ? undefined : { backgroundColor: post.category.color || '#2c7bfe' }}>
      {post.category.name}
    </span>
  );
}

export function PostCard({ post }: { post: PostCardData }) {
  const href = `/posts/${post.slug}`;
  const coverColor = post.category?.color || '#2c7bfe';

  // WIDE — ảnh trái, nội dung phải, chiếm 2 cột
  if (post.cardStyle === 'WIDE') {
    return (
      <article className="post-card group sm:col-span-2 sm:flex-row">
        <Link href={href} className="relative block aspect-[16/9] overflow-hidden sm:aspect-auto sm:w-2/5 sm:shrink-0">
          {post.cover
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={post.cover} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            : <div className="flex h-full min-h-[160px] w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}99)` }}><span className="px-4 text-center text-lg font-bold text-white/95 line-clamp-3">{post.title}</span></div>}
          <div className="absolute left-2 top-2 flex gap-1"><CategoryChip post={post} overlay /></div>
        </Link>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2"><AccessBadge post={post} /></div>
          <Link href={href} className="line-clamp-2 text-base font-bold leading-snug hover:text-brand-600">{post.title}</Link>
          {post.excerpt && <p className="line-clamp-2 text-sm text-ink-500">{post.excerpt}</p>}
          <Meta post={post} />
        </div>
      </article>
    );
  }

  // TEXT_ONLY — không ảnh, nền màu nhạt theo chuyên mục
  if (post.cardStyle === 'TEXT_ONLY') {
    return (
      <article className="post-card group" style={{ background: `${coverColor}0d` }}>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2"><CategoryChip post={post} /><AccessBadge post={post} /></div>
          <Link href={href} className="line-clamp-3 text-lg font-bold leading-snug hover:text-brand-600">{post.title}</Link>
          {post.excerpt && <p className="line-clamp-3 text-sm text-ink-500">{post.excerpt}</p>}
          <Meta post={post} />
        </div>
      </article>
    );
  }

  // GALLERY — lưới ảnh nhỏ
  if (post.cardStyle === 'GALLERY' && post.gallery && post.gallery.length > 0) {
    const imgs = post.gallery.slice(0, 3);
    return (
      <article className="post-card group">
        <div className="grid grid-cols-3 gap-0.5">
          {imgs.map((g, i) => (
            <Link key={i} href={href} className="relative block aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              {i === 2 && post.gallery!.length > 3 && (
                <span className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 text-sm font-semibold text-white"><ImageIcon size={14} />+{post.gallery!.length - 3}</span>
              )}
            </Link>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2"><CategoryChip post={post} /><AccessBadge post={post} /></div>
          <Link href={href} className="line-clamp-2 font-bold leading-snug hover:text-brand-600">{post.title}</Link>
          <Meta post={post} />
        </div>
      </article>
    );
  }

  // STANDARD (mặc định) — ảnh 16:9 trên, nội dung dưới
  return (
    <article className="post-card group">
      <Link href={href} className="relative block aspect-[16/9] overflow-hidden">
        {post.cover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={post.cover} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}99)` }}><span className="px-4 text-center text-lg font-bold text-white/95 line-clamp-3">{post.title}</span></div>}
        <div className="absolute left-2 top-2 flex gap-1"><CategoryChip post={post} overlay /></div>
        <div className="absolute right-2 top-2"><AccessBadge post={post} /></div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={href} className="line-clamp-2 font-bold leading-snug hover:text-brand-600">{post.title}</Link>
        {post.excerpt && <p className="line-clamp-2 text-sm text-ink-500">{post.excerpt}</p>}
        <Meta post={post} />
      </div>
    </article>
  );
}
