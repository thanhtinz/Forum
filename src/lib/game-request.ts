import { db } from './db';
import {
  REQUEST_PAGE_SIZE, REQUEST_PER_DAY,
  type RequestItem, type RequestStatus,
} from './game-request-const';

export * from './game-request-const';

/** Ban điều hành kho game — chỉ quản trị viên, kho game là hàng của nền tảng. */
export function canHandleRequests(role?: string | null): boolean {
  return role === 'ADMIN';
}

/** Người viết rút yêu cầu của mình khi nó còn đang chờ; quản trị rút lúc nào cũng được. */
export function canRemoveRequest(
  viewer: { id: string | null; role?: string | null },
  req: { userId: string; status: RequestStatus },
): boolean {
  if (!viewer.id) return false;
  if (canHandleRequests(viewer.role)) return true;
  return viewer.id === req.userId && req.status === 'PENDING';
}

export type RequestSort = 'new' | 'top';

/**
 * Lấy một trang bảng yêu cầu.
 *
 * Yêu cầu đã xong xếp xuống dưới khi sắp theo lượt muốn: danh sách này là việc
 * cần làm của người quản kho, thứ đã làm rồi không nên chiếm chỗ đầu bảng.
 */
export async function getGameRequests(opts: {
  viewerId: string | null;
  status?: RequestStatus | 'ALL';
  sort?: RequestSort;
  page?: number;
  role?: string | null;
}): Promise<{ items: RequestItem[]; total: number; totalPages: number }> {
  const { viewerId, status = 'ALL', sort = 'new', role } = opts;
  const page = Math.max(1, opts.page ?? 1);

  const where = status === 'ALL' ? {} : { status };
  const orderBy = sort === 'top'
    ? ([{ voteCount: 'desc' }, { createdAt: 'desc' }] as const)
    : ([{ createdAt: 'desc' }] as const);

  const [total, rows] = await Promise.all([
    db.gameRequest.count({ where }),
    db.gameRequest.findMany({
      where,
      orderBy: [...orderBy],
      skip: (page - 1) * REQUEST_PAGE_SIZE,
      take: REQUEST_PAGE_SIZE,
      select: {
        id: true, title: true, note: true, status: true, adminNote: true,
        voteCount: true, createdAt: true, handledAt: true, userId: true,
        user: { select: { username: true, name: true, level: true, role: true } },
        game: { select: { slug: true, title: true } },
        // Chỉ hỏi phiếu của CHÍNH người đang xem, không kéo cả danh sách người
        // đã bấm về rồi mới tìm trong đó.
        votes: viewerId
          ? { where: { userId: viewerId }, select: { userId: true }, take: 1 }
          : false,
      },
    }),
  ]);

  const viewer = { id: viewerId, role };

  return {
    total,
    totalPages: Math.ceil(total / REQUEST_PAGE_SIZE),
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      note: r.note,
      status: r.status,
      adminNote: r.adminNote,
      voteCount: r.voteCount,
      createdAt: r.createdAt,
      handledAt: r.handledAt,
      user: r.user,
      game: r.game,
      voted: Array.isArray(r.votes) && r.votes.length > 0,
      canRemove: canRemoveRequest(viewer, { userId: r.userId, status: r.status }),
    })),
  };
}

/** Hạn mức gửi yêu cầu — mỗi ngày vài cái, không phải chỗ xả danh sách ước. */
export async function checkRequestQuota(userId: string): Promise<string | null> {
  const today = await db.gameRequest.count({
    where: { userId, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
  });
  if (today >= REQUEST_PER_DAY) {
    return `Bạn đã gửi ${REQUEST_PER_DAY} yêu cầu hôm nay rồi, mai quay lại nhé.`;
  }
  return null;
}
