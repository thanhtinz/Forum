import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Eye, MessageSquare, Calendar, FolderOpen, Lock, FileText, HelpCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { canAccess, isVipActive, type AccessUser } from '@/lib/access';
import { dailyDownloadLimit, todayDownloadCount } from '@/lib/downloads';
import { cn, fmtCount } from '@/lib/utils';
import { Paywall } from '@/components/Paywall';
import { DownloadBox } from '@/components/DownloadBox';
import { ReadingProgress } from '@/components/post/ReadingProgress';
import { Faq, type FaqItem } from '@/components/post/Faq';
import { Comments } from '@/components/post/Comments';
import { PostActions } from '@/components/post/PostActions';
import { ReportButton } from '@/components/ReportButton';
import { RelatedPosts } from '@/components/post/RelatedPosts';
import { CopyrightNotice } from '@/components/post/CopyrightNotice';
import { PostSidebar } from '@/components/post/PostSidebar';

export type PostSection = 'detail' | 'faq' | 'comments';

const DEFAULT_COPYRIGHT = [
  'Tài nguyên trên Nova chỉ dùng cho mục đích học tập và tham khảo cá nhân.',
  'Nghiêm cấm mua đi bán lại, phát tán lại dưới mọi hình thức khi chưa được phép.',
  'Nova không chịu trách nhiệm với nội dung do thành viên đăng tải.',
];

export async function getPostForView(slug: string) {
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

export async function PostShell({ slug, section, dl }: { slug: string; section: PostSection; dl?: string }) {
  const post = await getPostForView(slug);
  if (!post) notFound();

  const session = await auth();
  const su = session?.user;
  const accessUser: AccessUser | null = su?.id
    ? { id: su.id, vipTier: su.vipTier ?? null, vipExpiresAt: su.vipExpiresAt ?? null, vipPermanent: su.vipPermanent ?? false }
    : null;
  const isAuthor = !!accessUser && post.authorId === accessUser.id;

  let vipFreeContent = false;
  if (accessUser && accessUser.vipTier != null && isVipActive(accessUser)) {
    const plan = await db.vipPlan.findUnique({ where: { tier: accessUser.vipTier }, select: { freeContent: true } });
    vipFreeContent = !!plan?.freeContent;
  }
  const access = await canAccess(accessUser, post, { isAuthor, vipFreeContent });

  const faqItems = (Array.isArray(post.faq) ? post.faq : []) as unknown as FaqItem[];
  const published = post.publishedAt ?? post.createdAt;

  // Đếm view một lần cho mỗi lượt mở trang chi tiết
  if (section === 'detail') {
    await db.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  const NAV: { key: PostSection; label: string; href: string; icon: typeof FileText; badge?: number }[] = [
    { key: 'detail', label: 'Chi tiết giới thiệu', href: `/posts/${slug}`, icon: FileText },
    { key: 'faq', label: 'Câu hỏi thường gặp', href: `/posts/${slug}/faq`, icon: HelpCircle, badge: faqItems.length || undefined },
    { key: 'comments', label: 'Bình luận', href: `/posts/${slug}/binh-luan`, icon: MessageSquare, badge: post.commentCount || undefined },
  ];

  return (
    <article>
      <ReadingProgress />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* Hero tiêu đề */}
          <header className="relative overflow-hidden rounded-2xl bg-ink-800 text-white shadow-card">
            {post.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-[2px]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
            <div className="relative px-6 py-12 text-center sm:py-16">
              <nav className="mb-3 flex items-center justify-center gap-1.5 text-sm text-white/80">
                {post.category && <Link href={`/category/${post.category.slug}`} className="hover:text-white">{post.category.name}</Link>}
              </nav>
              <h1 className="mx-auto max-w-2xl text-2xl font-black leading-tight drop-shadow sm:text-4xl">{post.title}</h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/85">
                <span className="flex items-center gap-1.5"><Calendar size={15} />{format(published, 'yyyy-MM-dd')}</span>
                {post.category && <span className="flex items-center gap-1.5"><FolderOpen size={15} />{post.category.name}</span>}
                <span className="flex items-center gap-1.5"><Eye size={15} />{fmtCount(post.viewCount)}</span>
                <span className="flex items-center gap-1.5"><MessageSquare size={15} />{fmtCount(post.commentCount)}</span>
              </div>
            </div>
          </header>

          {/* Điều hướng phần — LIÊN KẾT trang riêng, không phải tab */}
          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-ink-200 dark:border-ink-800">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = n.key === section;
              return (
                <Link key={n.key} href={n.href} scroll={false}
                  className={cn('relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
                    active ? 'text-brand-600' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200')}>
                  <Icon size={16} />
                  <span className="whitespace-nowrap">{n.label}</span>
                  {n.badge != null && <span className="rounded-full bg-ink-100 px-1.5 text-xs font-bold text-ink-500 dark:bg-ink-800">{n.badge}</span>}
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
                </Link>
              );
            })}
          </div>

          {/* Nội dung phần đang chọn */}
          <div className="card mt-4 p-5 sm:p-6">
            {section === 'detail' && <DetailSection post={post} access={access} accessUser={accessUser} isAuthor={isAuthor} dl={dl} />}
            {section === 'faq' && (
              faqItems.length > 0
                ? <Faq items={faqItems} />
                : <p className="py-10 text-center text-sm text-ink-400">Bài viết này chưa có câu hỏi thường gặp.</p>
            )}
            {section === 'comments' && <Comments postId={post.id} slug={post.slug} loggedIn={!!accessUser} />}
          </div>

          {section === 'detail' && <RelatedPosts postId={post.id} categoryId={post.categoryId} />}
        </div>

        <div className="mt-6 lg:mt-0">
          <PostSidebar authorId={post.authorId} viewerId={accessUser?.id} />
        </div>
      </div>
    </article>
  );
}

// ─── Phần "Chi tiết giới thiệu": nội dung + bản quyền + khung mua + cuối bài ───
async function DetailSection({ post, access, accessUser, isAuthor, dl }: {
  post: NonNullable<Awaited<ReturnType<typeof getPostForView>>>;
  access: Awaited<ReturnType<typeof canAccess>>;
  accessUser: AccessUser | null;
  isAuthor: boolean;
  dl?: string;
}) {
  const [plans, saveCount, liked, saved, copyrightSetting] = await Promise.all([
    post.downloads.length > 0
      ? db.vipPlan.findMany({ where: { active: true }, orderBy: { tier: 'asc' }, select: { tier: true, name: true, discountPercent: true, freeContent: true } })
      : Promise.resolve([]),
    db.favorite.count({ where: { postId: post.id } }),
    accessUser ? db.reaction.findFirst({ where: { userId: accessUser.id, postId: post.id, type: 'LIKE' }, select: { id: true } }) : Promise.resolve(null),
    accessUser ? db.favorite.findFirst({ where: { userId: accessUser.id, postId: post.id }, select: { id: true } }) : Promise.resolve(null),
    db.siteSetting.findUnique({ where: { key: 'copyright_notice' } }),
  ]);
  const copyrightLines = Array.isArray(copyrightSetting?.value) ? (copyrightSetting!.value as string[]) : DEFAULT_COPYRIGHT;

  const hiddenBlock = post.hiddenContent ? (
    <div className="mt-2 rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-950/20">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600"><Lock size={13} /> Nội dung mở khoá</div>
      <div className="prose prose-ink max-w-none dark:prose-invert prose-a:text-brand-600" dangerouslySetInnerHTML={{ __html: post.hiddenContent }} />
    </div>
  ) : null;

  let quota: { used: number; limit: number } | undefined;
  if (access.allowed && post.downloads.length > 0 && accessUser && !isAuthor) {
    const qUser = await db.user.findUnique({ where: { id: accessUser.id }, select: { level: true, vipTier: true, vipExpiresAt: true, vipPermanent: true } });
    if (qUser) {
      const limit = dailyDownloadLimit(qUser);
      quota = { used: await todayDownloadCount(accessUser.id), limit: Number.isFinite(limit) ? limit : -1 };
    }
  }

  const purchaseBox = post.downloads.length > 0 ? (
    <>
      {access.allowed && hiddenBlock}
      <DownloadBox
        postId={post.id} slug={post.slug} allowed={access.allowed} reason={access.reason} access={post.access}
        pricePoints={post.pricePoints} priceAmount={post.priceAmount}
        downloads={post.downloads.map((d) => ({ id: d.id, label: d.label, provider: d.provider, version: d.version, password: d.password, extractCode: d.extractCode, sizeBytes: d.sizeBytes == null ? null : Number(d.sizeBytes) }))}
        plans={plans} updatedAt={format(post.updatedAt, 'yyyy-MM-dd')} callbackUrl={`/posts/${post.slug}`}
        quota={quota} notice={dl}
      />
    </>
  ) : access.allowed ? hiddenBlock : (
    <Paywall postId={post.id} slug={post.slug} reason={access.reason} pricePoints={post.pricePoints} priceAmount={post.priceAmount} vipTierFree={post.vipTierFree} callbackUrl={`/posts/${post.slug}`} />
  );

  return (
    <div>
      <div className="prose prose-ink max-w-none dark:prose-invert prose-a:text-brand-600" dangerouslySetInnerHTML={{ __html: post.content }} />
      {(post.access !== 'FREE' && post.access !== 'LOGIN_REQUIRED') && <CopyrightNotice lines={copyrightLines} />}
      {purchaseBox}

      {/* Cuối bài — THE END + thẻ + thích/chia sẻ/lưu */}
      <div className="mt-8 border-t border-ink-100 pt-6 dark:border-ink-800">
        <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-ink-300">
          <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" /> THE END <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.category && (
            <Link href={`/category/${post.category.slug}`} className="chip gap-1 bg-brand-50 text-brand-600 dark:bg-brand-950/40">
              <FolderOpen size={13} /> {post.category.name}
            </Link>
          )}
          {post.tags.map(({ tag }) => (
            <Link key={tag.slug} href={`/tag/${tag.slug}`} className="chip bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300">#{tag.name}</Link>
          ))}
        </div>
        <PostActions postId={post.id} initialLiked={!!liked} initialLikeCount={post.likeCount} initialSaved={!!saved} initialSaveCount={saveCount} />
        {accessUser && !isAuthor && (
          <div className="mt-3 flex justify-center border-t border-ink-100 pt-3 dark:border-ink-800">
            <ReportButton target="post" targetId={post.id} />
          </div>
        )}
      </div>
    </div>
  );
}
