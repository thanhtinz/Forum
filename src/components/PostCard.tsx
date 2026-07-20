import Link from 'next/link';
import { Eye, MessageSquare, Heart, Lock, Coins, Crown, ImageIcon, FolderOpen } from 'lucide-react';
import type { AccessLevel, CardStyle } from '@prisma/client';
import { fmtCount, fmtVnd } from '@/lib/utils';

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
  categories?: { name: string; slug: string; color?: string | null }[];
  tags?: { name: string; slug: string }[];
}

function AccessBadge({ post }: { post: PostCardData }) {
  if (post.access === 'FREE' || post.access === 'LOGIN_REQUIRED') return null;
  if (post.access === 'VIP_ONLY')
    return <span className="chip shrink-0 gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Crown size={11} /> VIP</span>;
  if (post.access === 'POINTS')
    return <span className="chip shrink-0 gap-1 bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"><Coins size={11} /> {fmtCount(post.pricePoints)} điểm</span>;
  return <span className="chip shrink-0 gap-1 bg-accent-500/15 text-accent-600"><Lock size={11} /> {fmtVnd(post.priceAmount)}</span>;
}

/** Badge row kiểu zibll: giá + chuyên mục (nhiều, icon thư mục) + tag (#). */
function Badges({ post }: { post: PostCardData }) {
  const cats = post.categories && post.categories.length > 0 ? post.categories : post.category ? [post.category] : [];
  const hasAny = post.access === 'POINTS' || post.access === 'PAID' || post.access === 'VIP_ONLY' || cats.length > 0 || (post.tags && post.tags.length > 0);
  if (!hasAny) return null;
  return (
    // Mobile: cuộn ngang (kéo qua); PC: xuống dòng hiện nhiều
    <div className="mb-2 flex flex-nowrap gap-1 overflow-x-auto no-scrollbar sm:flex-wrap">
      <AccessBadge post={post} />
      {cats.map((c) => {
        const color = c.color || '#2c7bfe';
        return (
          <Link key={c.slug} href={`/category/${c.slug}`}
            className="chip shrink-0 gap-1 font-medium" style={{ backgroundColor: `${color}1f`, color }}>
            <FolderOpen size={11} /> {c.name}
          </Link>
        );
      })}
      {post.tags?.map((t) => (
        <Link key={t.slug} href={`/tag/${t.slug}`}
          className="chip shrink-0 bg-ink-100 text-ink-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">#{t.name}</Link>
      ))}
    </div>
  );
}

function Meta({ post }: { post: PostCardData }) {
  return (
    <div className="mt-auto">
      <Badges post={post} />
      <div className="flex items-center gap-3 border-t border-ink-100 pt-2 text-[11px] text-ink-400 dark:border-ink-800">
        <span className="flex items-center gap-0.5"><Eye size={12} />{fmtCount(post.viewCount)}</span>
        <span className="flex items-center gap-0.5"><MessageSquare size={12} />{fmtCount(post.commentCount)}</span>
        <span className="flex items-center gap-0.5"><Heart size={12} />{fmtCount(post.likeCount)}</span>
      </div>
    </div>
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
            : <div className="flex h-full min-h-[160px] w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}99)` }}><ImageIcon size={30} className="text-white/45" /></div>}
        </Link>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5">
          <Link href={href} className="line-clamp-2 text-base font-bold leading-snug hover:text-brand-600">{post.title}</Link>
          {post.excerpt && <p className="line-clamp-2 text-xs text-ink-500">{post.excerpt}</p>}
          <Meta post={post} />
        </div>
      </article>
    );
  }

  // TEXT_ONLY — không ảnh, nền màu nhạt theo chuyên mục
  if (post.cardStyle === 'TEXT_ONLY') {
    return (
      <article className="post-card group" style={{ background: `${coverColor}0d` }}>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5">
          <Link href={href} className="line-clamp-3 text-base font-bold leading-snug hover:text-brand-600">{post.title}</Link>
          {post.excerpt && <p className="line-clamp-3 text-xs text-ink-500">{post.excerpt}</p>}
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
        <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5">
          <Link href={href} className="line-clamp-2 min-h-[2.6em] text-sm font-bold leading-snug hover:text-brand-600">{post.title}</Link>
          <Meta post={post} />
        </div>
      </article>
    );
  }

  // STANDARD (mặc định) — ảnh 16:9 trên, nội dung dưới
  return (
    <article className="post-card group">
      <Link href={href} className="relative block aspect-[10/7] overflow-hidden">
        {post.cover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={post.cover} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}99)` }}><ImageIcon size={30} className="text-white/45" /></div>}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5">
        <Link href={href} className="line-clamp-2 min-h-[2.6em] text-sm font-bold leading-snug hover:text-brand-600">{post.title}</Link>
        {post.excerpt && <p className="line-clamp-2 text-xs text-ink-500">{post.excerpt}</p>}
        <Meta post={post} />
      </div>
    </article>
  );
}
