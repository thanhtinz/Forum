import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { otherId } from '@/lib/messages';
import { fmtAgo } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = { title: 'Ảnh đã gửi' };
export const dynamic = 'force-dynamic';

/** Ảnh trong tin lưu dạng ![alt](url) — rút ra để dựng thư viện. */
const IMG = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

/** Chỉ nhận ảnh nội bộ hoặc http(s), giống bộ lọc khi hiển thị tin. */
function safeSrc(url: string): string | null {
  const u = url.trim();
  if (u.startsWith('/uploads/') || u.startsWith('/stickers/')) return u;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

/**
 * Số TIN NHẮN có ảnh lấy mỗi trang.
 *
 * Cắt theo tin chứ không theo tấm ảnh: một tin có thể mang nhiều ảnh, cắt
 * giữa một tin thì mấy tấm cùng lượt gửi bị tách sang hai trang khác nhau.
 * Vậy nên số ảnh mỗi trang có thể chênh nhau đôi chút.
 */
const TIN_MOI_TRANG = 60;

export default async function ConversationMediaPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user?.id;
  if (!me) redirect('/login');

  const convo = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true, userAId: true, userBId: true, nicknameA: true, nicknameB: true,
      userA: { select: { id: true, name: true, username: true } },
      userB: { select: { id: true, name: true, username: true } },
    },
  });
  if (!convo || (convo.userAId !== me && convo.userBId !== me)) notFound();

  const partner = otherId(convo, me) === convo.userA.id ? convo.userA : convo.userB;
  const partnerNick = (partner.id === convo.userAId ? convo.nicknameA : convo.nicknameB) ?? '';
  const partnerName = partnerNick || partner.name || partner.username || 'Thành viên';

  // Trước đây lấy 300 tin rồi thôi: hội thoại gửi ảnh nhiều thì phần cũ hơn
  // không còn đường nào xem lại.
  const locAnh = { conversationId: id, content: { contains: '![' } };
  const tongTin = await db.message.count({ where: locAnh });
  const soTrang = Math.max(1, Math.ceil(tongTin / TIN_MOI_TRANG));
  const trang = Math.min(Math.max(1, Number((await searchParams).page) || 1), soTrang);

  const rows = await db.message.findMany({
    where: locAnh,
    orderBy: { createdAt: 'desc' },
    skip: (trang - 1) * TIN_MOI_TRANG,
    take: TIN_MOI_TRANG,
    select: { id: true, content: true, senderId: true, createdAt: true },
  });

  // Một tin có thể chứa nhiều ảnh, tách hết ra thành từng mục.
  const media: { key: string; src: string; alt: string; mine: boolean; at: Date }[] = [];
  for (const m of rows) {
    IMG.lastIndex = 0;
    let hit: RegExpExecArray | null;
    let i = 0;
    while ((hit = IMG.exec(m.content)) !== null) {
      const src = safeSrc(hit[2]);
      if (src) media.push({ key: `${m.id}-${i++}`, src, alt: hit[1], mine: m.senderId === me, at: m.createdAt });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/user/messages/${id}`} title="Về đoạn chat"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-ink-900 dark:text-white">Ảnh đã gửi</h1>
          <p className="truncate text-sm text-ink-500">Đoạn chat với {partnerName} · {media.length} ảnh</p>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="card p-10 text-center">
          <ImageOff size={28} className="mx-auto mb-2 text-ink-300" />
          <p className="text-sm text-ink-500">Chưa có ảnh nào trong đoạn chat này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {media.map((x) => (
            <a key={x.key} href={x.src} target="_blank" rel="noopener noreferrer"
              title={`${x.mine ? 'Bạn gửi' : `${partnerName} gửi`} · ${fmtAgo(x.at)}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.src} alt={x.alt} loading="lazy"
                className="size-full object-cover transition-transform group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {x.mine ? 'Bạn' : partnerName} · {fmtAgo(x.at)}
              </span>
            </a>
          ))}
        </div>
      )}

      <Pagination page={trang} totalPages={soTrang} basePath={`/user/messages/${id}/media`} />
    </div>
  );
}
