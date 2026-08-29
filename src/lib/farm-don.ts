import type { Prisma } from '@prisma/client';
import { db } from './db';
import {
  DON_HE_SO, DON_KHACH, DON_NHAN, DON_SIEU_TOC_HAN_MS, DON_TREN_BANG,
} from './farm-const';

/**
 * Bảng đơn hàng — khách đặt món, mình gom hàng trong kho ra giao.
 *
 * Đơn sinh LƯỜI, không có cron: chính lượt người chơi mở trang là lượt dọn
 * đơn quá hạn và treo đơn mới cho đủ bảng. Cùng cách bầu cua chốt phiên cũ,
 * và cùng lý do — một tiến trình chạy nền cho mỗi người chơi là thứ không
 * nuôi nổi.
 *
 * Đơn thuộc về từng người, không phải bảng chung: bảng chung thì ai vào trước
 * nhận hết, người vào sau mở ra thấy bảng trống mà chẳng hiểu vì sao.
 */

export interface MonTrongDon {
  cropId: string;
  cropKey: number;
  name: string;
  qty: number;
  /** Đang có bao nhiêu trong kho — để biết còn thiếu mấy quả. */
  dangCo: number;
}

export interface DonHang {
  id: string;
  khach: string;
  kind: 'THUONG' | 'DAC_BIET' | 'SIEU_TOC';
  reward: number;
  items: MonTrongDon[];
  /** Mốc hết hạn của đơn siêu tốc, tính bằng mili giây; `null` là không hạn. */
  hetHanLuc: number | null;
  /** Gom đủ hàng chưa. */
  giaoDuoc: boolean;
}

/** Bốc ngẫu nhiên một phần tử. */
function boc<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

/**
 * Dựng nội dung một đơn mới.
 *
 * Ưu tiên món ĐANG CÓ trong kho: đơn toàn thứ người chơi chưa từng trồng thì
 * bảng chỉ là một danh sách để nhìn, mà nông sản trong kho lại không có đường
 * nào ra điểm. Vẫn chừa chỗ cho món lạ để bảng không thành ra chỉ lặp lại
 * đúng thứ đang có.
 */
function nghiDon(
  cay: { id: string; sellPrice: number }[],
  trongKho: Set<string>,
): { items: { cropId: string; qty: number }[]; tien: number } {
  const quen = cay.filter((c) => trongKho.has(c.id));
  const soMon = quen.length >= 2 && Math.random() < 0.5 ? 2 : 1;

  const chon: typeof cay = [];
  for (let i = 0; i < soMon; i++) {
    // Hai phần ba lấy món trong kho, còn lại lấy bất kỳ.
    const nguon = quen.length > 0 && Math.random() < 0.67 ? quen : cay;
    const c = boc(nguon.filter((x) => !chon.some((y) => y.id === x.id)) as typeof cay);
    if (c) chon.push(c);
  }
  if (chon.length === 0) chon.push(boc(cay));

  const items = chon.map((c) => ({ cropId: c.id, qty: 2 + Math.floor(Math.random() * 5) }));
  const tien = items.reduce((t, it) => {
    const c = cay.find((x) => x.id === it.cropId);
    return t + (c ? c.sellPrice * it.qty : 0);
  }, 0);
  return { items, tien };
}

/** Bốc kiểu đơn: phần lớn là đơn thường. */
function bocKieu(): 'THUONG' | 'DAC_BIET' | 'SIEU_TOC' {
  const r = Math.random();
  if (r < 0.12) return 'SIEU_TOC';
  if (r < 0.32) return 'DAC_BIET';
  return 'THUONG';
}

/**
 * Dọn đơn quá hạn và treo đơn mới cho đủ bảng.
 *
 * Đơn siêu tốc quá hạn thì XOÁ hẳn chứ không giữ lại làm đơn thường: hạn giao
 * chính là thứ đổi lấy gấp ba điểm, giữ lại là cho không phần thưởng ấy.
 */
export async function dungBangDon(userId: string): Promise<void> {
  const now = new Date();

  await db.farmOrder.deleteMany({
    where: { userId, deliveredAt: null, expiresAt: { lt: now } },
  });

  const dangTreo = await db.farmOrder.count({ where: { userId, deliveredAt: null } });
  const thieu = DON_TREN_BANG - dangTreo;
  if (thieu <= 0) return;

  const cay = await db.farmCrop.findMany({
    where: { active: true }, take: 40,
    select: { id: true, sellPrice: true },
  });
  if (cay.length === 0) return;

  const kho = await db.farmBarn.findMany({
    where: { userId, qty: { gt: 0 } }, take: 40, select: { cropId: true },
  });
  const trongKho = new Set(kho.map((k) => k.cropId));

  for (let i = 0; i < thieu; i++) {
    const kind = bocKieu();
    const { items, tien } = nghiDon(cay, trongKho);
    await db.farmOrder.create({
      data: {
        userId,
        khach: boc(DON_KHACH),
        kind,
        reward: Math.max(1, Math.round(tien * DON_HE_SO * DON_NHAN[kind])),
        expiresAt: kind === 'SIEU_TOC' ? new Date(now.getTime() + DON_SIEU_TOC_HAN_MS) : null,
        items: { create: items },
      },
      select: { id: true },
    });
  }
}

const donSelect = {
  id: true, khach: true, kind: true, reward: true, expiresAt: true,
  items: {
    take: 4,
    select: { qty: true, crop: { select: { id: true, key: true, name: true } } },
  },
} satisfies Prisma.FarmOrderSelect;

/** Bảng đơn đang treo của một người, kèm việc gom đủ hàng chưa. */
export async function xemBangDon(userId: string): Promise<DonHang[]> {
  const [don, kho] = await Promise.all([
    db.farmOrder.findMany({
      where: { userId, deliveredAt: null },
      orderBy: { createdAt: 'asc' },
      take: DON_TREN_BANG,
      select: donSelect,
    }),
    db.farmBarn.findMany({
      where: { userId, qty: { gt: 0 } }, take: 40,
      select: { cropId: true, qty: true },
    }),
  ]);

  const co = new Map(kho.map((k) => [k.cropId, k.qty]));

  return don.map((d) => {
    const items: MonTrongDon[] = d.items.map((it) => ({
      cropId: it.crop.id,
      cropKey: it.crop.key,
      name: it.crop.name,
      qty: it.qty,
      dangCo: co.get(it.crop.id) ?? 0,
    }));
    return {
      id: d.id,
      khach: d.khach,
      kind: d.kind,
      reward: d.reward,
      items,
      hetHanLuc: d.expiresAt?.getTime() ?? null,
      giaoDuoc: items.every((it) => it.dangCo >= it.qty),
    };
  });
}
