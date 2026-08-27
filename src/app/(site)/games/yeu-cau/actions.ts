'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveBan, banMessage } from '@/lib/ban';
import { notify } from '@/lib/notify';
import {
  canHandleRequests, canRemoveRequest, checkRequestQuota, isRequestStatus,
  REQUEST_TITLE_MAX, REQUEST_NOTE_MAX, REQUEST_ADMIN_NOTE_MAX, REQUEST_LABELS,
} from '@/lib/game-request';

export interface RequestState {
  ok?: boolean;
  error?: string;
}

const PATH = '/games/yeu-cau';

/** Gửi một yêu cầu game mới. */
export async function createGameRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để gửi yêu cầu.' };

  const banned = await getActiveBan(userId, 'POST');
  if (banned) return { error: banMessage(banned, 'gửi yêu cầu game') };

  const quota = await checkRequestQuota(userId);
  if (quota) return { error: quota };

  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 2) return { error: 'Ghi tên game bạn đang tìm.' };
  if (title.length > REQUEST_TITLE_MAX) return { error: `Tên game tối đa ${REQUEST_TITLE_MAX} ký tự.` };

  const note = String(formData.get('note') ?? '').trim();
  if (note.length > REQUEST_NOTE_MAX) return { error: `Mô tả tối đa ${REQUEST_NOTE_MAX} ký tự.` };

  // Đã có người xin đúng game này và còn đang chờ thì cộng phiếu vào yêu cầu
  // sẵn có, hơn là để bảng đầy những dòng trùng nhau.
  const existing = await db.gameRequest.findFirst({
    where: { title: { equals: title, mode: 'insensitive' }, status: { in: ['PENDING', 'ACCEPTED'] } },
    select: { id: true },
  });
  if (existing) {
    // Cộng phiếu chứ không gọi voteGameRequest: hàm đó bật/tắt, nên người đã
    // bấm sẵn sẽ bị gỡ mất phiếu đúng lúc họ vừa nói là mình cũng muốn.
    const voted = await db.gameRequestVote.findUnique({
      where: { userId_requestId: { userId, requestId: existing.id } },
      select: { userId: true },
    });
    if (!voted) {
      await db.$transaction(async (tx) => {
        await tx.gameRequestVote.create({ data: { userId, requestId: existing.id }, select: { userId: true } });
        await tx.gameRequest.update({
          where: { id: existing.id }, data: { voteCount: { increment: 1 } }, select: { id: true },
        });
      });
      revalidatePath(PATH);
    }
    return { error: 'Đã có người xin game này rồi — mình tính bạn là một lượt muốn nữa.' };
  }

  await db.gameRequest.create({
    data: { userId, title, note: note || null },
    select: { id: true },
  });

  revalidatePath(PATH);
  return { ok: true };
}

/** Bấm / bỏ "tôi cũng muốn". */
export async function voteGameRequest(id: string): Promise<RequestState & { voted?: boolean; count?: number }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để bấm.' };

  const req = await db.gameRequest.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!req) return { error: 'Yêu cầu này không còn.' };
  if (req.status === 'DONE' || req.status === 'REJECTED') {
    return { error: 'Yêu cầu này đã xử lý xong.' };
  }

  const had = await db.gameRequestVote.findUnique({
    where: { userId_requestId: { userId, requestId: id } },
    select: { userId: true },
  });

  // Bộ đếm và bảng phiếu phải đi cùng nhau, nếu không con số hiện ra sẽ lệch
  // với số hàng thật ngay lần đầu có lỗi.
  const updated = await db.$transaction(async (tx) => {
    if (had) {
      await tx.gameRequestVote.delete({ where: { userId_requestId: { userId, requestId: id } } });
      return tx.gameRequest.update({
        where: { id }, data: { voteCount: { decrement: 1 } }, select: { voteCount: true },
      });
    }
    await tx.gameRequestVote.create({ data: { userId, requestId: id }, select: { userId: true } });
    return tx.gameRequest.update({
      where: { id }, data: { voteCount: { increment: 1 } }, select: { voteCount: true },
    });
  });

  revalidatePath(PATH);
  return { ok: true, voted: !had, count: updated.voteCount };
}

/** Người viết rút yêu cầu của mình, hoặc quản trị dọn yêu cầu rác. */
export async function removeGameRequest(id: string): Promise<RequestState> {
  const session = await auth();
  const me = session?.user;
  if (!me?.id) return { error: 'Bạn cần đăng nhập.' };

  const req = await db.gameRequest.findUnique({ where: { id }, select: { userId: true, status: true } });
  if (!req) return { ok: true };

  const viewer = { id: me.id, role: (me as { role?: string }).role };
  if (!canRemoveRequest(viewer, req)) {
    return { error: 'Chỉ rút được yêu cầu của mình khi nó còn đang chờ.' };
  }

  await db.gameRequest.delete({ where: { id } });
  revalidatePath(PATH);
  return { ok: true };
}

/**
 * Quản trị đổi trạng thái một yêu cầu.
 *
 * Người xin luôn được báo: xin xong rồi im lặng mãi là thứ khiến mục yêu cầu
 * game của các trang ngày xưa chết dần.
 */
export async function setGameRequestStatus(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const session = await auth();
  const me = session?.user;
  if (!me?.id) return { error: 'Bạn cần đăng nhập.' };
  if (!canHandleRequests((me as { role?: string }).role)) {
    return { error: 'Chỉ quản trị viên xử lý được yêu cầu game.' };
  }

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!isRequestStatus(status)) return { error: 'Trạng thái không hợp lệ.' };

  const adminNote = String(formData.get('adminNote') ?? '').trim();
  if (adminNote.length > REQUEST_ADMIN_NOTE_MAX) {
    return { error: `Lời nhắn tối đa ${REQUEST_ADMIN_NOTE_MAX} ký tự.` };
  }

  const req = await db.gameRequest.findUnique({ where: { id }, select: { userId: true, title: true } });
  if (!req) return { error: 'Yêu cầu này không còn.' };

  // Gắn game: nhận slug cho dễ nhập, nhưng phải là game có thật trên kho.
  const slug = String(formData.get('gameSlug') ?? '').trim();
  let gameId: string | null = null;
  if (slug) {
    const game = await db.game.findUnique({ where: { slug }, select: { id: true } });
    if (!game) return { error: `Không có game nào mang slug “${slug}”.` };
    gameId = game.id;
  }

  await db.$transaction(async (tx) => {
    await tx.gameRequest.update({
      where: { id },
      data: {
        status, adminNote: adminNote || null, gameId,
        handledAt: new Date(), handledById: me.id,
      },
      select: { id: true },
    });

    await notify({
      userId: req.userId,
      type: 'SYSTEM',
      title: `Yêu cầu game “${req.title}”: ${REQUEST_LABELS[status].label}`,
      content: adminNote || null,
      link: '/games/yeu-cau',
      actorId: me.id,
    }, tx);
  });

  revalidatePath(PATH);
  return { ok: true };
}
