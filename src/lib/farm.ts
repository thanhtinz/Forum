import { db } from './db';
import {
  KHE_CHU_KY_MS, O_DAT_BAN_DAU, O_DAT_TOI_DA, giaMoODat, laBanNgay,
} from './farm-const';

/**
 * Nông trại — mọi thứ để DỰNG trang. Phần thay đổi dữ liệu nằm ở
 * `src/app/(site)/nong-trai/actions.ts`.
 *
 * Ô đất không đếm ngược mà lưu MỐC CHÍN (`readyAt`). Đếm ngược thì phải có ai
 * đó chạy nền trừ dần từng phút cho từng ô của từng người; còn mốc thời gian
 * thì hỏi lúc nào cũng tính ra được, tưới nước chỉ là kéo cái mốc ấy gần lại,
 * và người chơi đóng trình duyệt cả đêm thì sáng ra cây vẫn chín đúng giờ.
 */

export interface CayGiong {
  id: string;
  key: number;
  name: string;
  seedCost: number;
  growMinutes: number;
  yieldMin: number;
  yieldMax: number;
  sellPrice: number;
}

export interface ODat {
  index: number;
  cropKey: number | null;
  cropName: string | null;
  /** Mốc gieo và mốc chín, tính bằng mili giây — số để gửi thẳng xuống trình duyệt. */
  plantedAt: number | null;
  readyAt: number | null;
  watered: boolean;
}

export interface MonTrongKho {
  cropId: string;
  cropKey: number;
  name: string;
  qty: number;
  sellPrice: number;
}

export interface NongTrai {
  diem: number;
  oDat: ODat[];
  kho: MonTrongKho[];
  cayGiong: CayGiong[];
  /** Giá mở ô tiếp theo; `null` nghĩa là đã kịch trần. */
  giaMoO: number | null;
  soODaMo: number;
  banNgay: boolean;
  /** Mốc hái được cây khế lần tới, tính bằng mili giây. */
  kheSanSangLuc: number;
  /** Đồng hồ máy chủ lúc dựng trang — giao diện lấy làm gốc rồi tự chạy tiếp. */
  now: number;
}

/**
 * Đảm bảo người này đã có mảnh đất khởi điểm.
 *
 * Tạo lười lúc ghé trang đầu tiên chứ không tạo lúc đăng ký: phần lớn thành
 * viên không bao giờ vào nông trại, dựng sẵn bốn hàng cho mỗi người là bơm rác
 * vào bảng. `skipDuplicates` lo trường hợp mở hai tab cùng lúc.
 */
async function moDatKhoiDiem(userId: string): Promise<void> {
  const daCo = await db.farmPlot.count({ where: { userId } });
  if (daCo > 0) return;
  await db.farmPlot.createMany({
    data: Array.from({ length: O_DAT_BAN_DAU }, (_, index) => ({ userId, index })),
    skipDuplicates: true,
  });
}

/** Danh sách cây đang bán, sắp theo thứ tự bày trong cửa hàng. */
export async function danhSachCay(): Promise<CayGiong[]> {
  return db.farmCrop.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { key: 'asc' }],
    take: 40,
    select: {
      id: true, key: true, name: true, seedCost: true,
      growMinutes: true, yieldMin: true, yieldMax: true, sellPrice: true,
    },
  });
}

/** Toàn cảnh nông trại của một người, đủ để dựng trang trong một lần đọc. */
export async function xemNongTrai(userId: string): Promise<NongTrai> {
  await moDatKhoiDiem(userId);
  const now = Date.now();

  const [nguoi, plots, kho, cayGiong] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { points: true, lastTreeAt: true } }),
    db.farmPlot.findMany({
      where: { userId },
      orderBy: { index: 'asc' },
      take: O_DAT_TOI_DA,
      select: {
        index: true, plantedAt: true, readyAt: true, watered: true,
        crop: { select: { key: true, name: true } },
      },
    }),
    db.farmBarn.findMany({
      where: { userId, qty: { gt: 0 } },
      orderBy: { crop: { order: 'asc' } },
      take: 40,
      select: {
        qty: true,
        crop: { select: { id: true, key: true, name: true, sellPrice: true } },
      },
    }),
    danhSachCay(),
  ]);

  const soODaMo = plots.length;
  const khe = nguoi?.lastTreeAt?.getTime() ?? 0;

  return {
    diem: nguoi?.points ?? 0,
    oDat: plots.map((p) => ({
      index: p.index,
      cropKey: p.crop?.key ?? null,
      cropName: p.crop?.name ?? null,
      plantedAt: p.plantedAt?.getTime() ?? null,
      readyAt: p.readyAt?.getTime() ?? null,
      watered: p.watered,
    })),
    kho: kho.map((b) => ({
      cropId: b.crop.id,
      cropKey: b.crop.key,
      name: b.crop.name,
      qty: b.qty,
      sellPrice: b.crop.sellPrice,
    })),
    cayGiong,
    giaMoO: soODaMo >= O_DAT_TOI_DA ? null : giaMoODat(soODaMo),
    soODaMo,
    banNgay: laBanNgay(new Date(now)),
    kheSanSangLuc: khe + KHE_CHU_KY_MS,
    now,
  };
}
