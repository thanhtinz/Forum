import { db } from '../helpers.mjs';
import {
  BAC_SAU_HUYEN_THOAI, KHU, SO_GYM, canVaoKhu, capVaoKhu,
} from '../../src/lib/pokemon-const.ts';

/**
 * Năm khu mở sau Hang Huyền Thoại.
 *
 * Bản gốc dừng ở bậc 8: hạ xong ba con trong hang là hết đường đi, mà exp với
 * vàng thì suốt từ Khu Cỏ tới đó vẫn quanh quẩn hai chữ số. Năm khu bậc 9–13
 * nối tiếp cả sức mạnh lẫn phần thưởng. Bài này canh hai chỗ dễ hỏng nhất:
 * cửa vào phải đòi ĐỦ CẢ huy chương lẫn cấp, và bảng thú phải thật sự mạnh dần.
 */
export default async function run(check) {
  const moi = KHU.filter((k) => k.bac >= BAC_SAU_HUYEN_THOAI);
  check('có đúng năm khu mới', moi.length === 5, `${moi.length} khu`);

  // ── Cửa vào ──────────────────────────────────────────────────────────
  for (const k of moi) {
    const can = capVaoKhu(k.bac);
    // Đủ cấp nhưng thiếu huy chương: phải chặn. Không chặn thì đi vòng qua
    // Hang Huyền Thoại là vào thẳng được chỗ còn mạnh hơn cả hang.
    check(`${k.ten}: đủ cấp mà thiếu huy chương vẫn bị chặn`,
      canVaoKhu(k.bac, k.ma, can, SO_GYM - 1) !== null);
    // Đủ huy chương nhưng thiếu cấp: cũng phải chặn.
    check(`${k.ten}: đủ huy chương mà thiếu cấp vẫn bị chặn`,
      canVaoKhu(k.bac, k.ma, can - 1, SO_GYM) !== null);
    check(`${k.ten}: đủ cả hai thì vào được`,
      canVaoKhu(k.bac, k.ma, can, SO_GYM) === null);
  }

  // ── Bảng thú ─────────────────────────────────────────────────────────
  const soHoang = await db.pokeThuHoang.count();
  check('tổng thú hoang đã lên 468', soHoang === 468, `${soHoang} con`);

  let truoc = 0;
  for (const k of moi) {
    const ds = await db.pokeThuHoang.findMany({
      where: { khu: k.ma }, select: { cong: true, mau: true, exp: true, vang: true, he: true },
      take: 100,
    });
    check(`${k.ten} có 30 loài`, ds.length === 30, `${ds.length} loài`);
    check(`${k.ten}: hệ nào cũng nằm trong 1–17`,
      ds.every((t) => t.he >= 1 && t.he <= 17));
    check(`${k.ten}: con nào cũng có công, máu và thưởng dương`,
      ds.every((t) => t.cong > 0 && t.mau > 0 && t.exp > 0 && t.vang > 0));
    // Mạnh dần theo bậc: con yếu nhất khu sau phải hơn con yếu nhất khu trước.
    const yeuNhat = Math.min(...ds.map((t) => t.cong));
    check(`${k.ten} mạnh hơn khu bậc trước`, yeuNhat > truoc, `${yeuNhat} ≤ ${truoc}`);
    truoc = yeuNhat;
  }

  // Phần thưởng phải tăng theo, đây chính là chỗ bản gốc đứng yên.
  const cuoi = await db.pokeThuHoang.aggregate({
    where: { khu: 'rong' }, _max: { exp: true },
  });
  const goc = await db.pokeThuHoang.aggregate({
    where: { khu: 'co' }, _max: { exp: true },
  });
  check('khu cuối thưởng kinh nghiệm hơn hẳn khu đầu',
    cuoi._max.exp > goc._max.exp * 10, `${cuoi._max.exp} so với ${goc._max.exp}`);

  // ── Ảnh của thú mới ──────────────────────────────────────────────────
  const thieuAnh = await db.pokeThuHoang.count({
    where: { khu: { in: moi.map((k) => k.ma) }, nguon: { lt: 20001 } },
  });
  check('thú mới đều dùng dải mã ảnh riêng, không đè lên bộ ảnh cũ',
    thieuAnh === 0, `${thieuAnh} con lấn mã cũ`);
}
