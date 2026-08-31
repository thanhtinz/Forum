import { db } from '../helpers.mjs';
import { KHU } from '../../src/lib/pokemon-const.ts';

/**
 * Đường cong sức mạnh và phần thưởng của cả hai mươi khu.
 *
 * Bảng gốc sai bậc ở ba chỗ, tới mức gãy hẳn tiến trình chơi: Lãnh Thổ (bậc 7,
 * mở ở cấp 18) là BẢN SAO NGUYÊN XI bảng Núi Đá (bậc 3, cấp 6) nên lên cấp 18
 * mở được chiến trường thì gặp thú yếu hơn cả khu bậc 4 và trả 2 vàng; Hang
 * Huyền Thoại có thú 25.000 máu mà trả 7 vàng; Hoang Mạc bậc 4 yếu hơn Núi Đá
 * bậc 3.
 *
 * Bài này canh đúng thứ phải luôn đúng sau khi cân bằng lại — không canh từng
 * con số cụ thể, để còn chỉnh tay được mà không phải sửa bài kiểm.
 */
const suc = (t) => t.cong + t.thu + t.mau;
const giua = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export default async function run(check) {
  const hoang = await db.pokeThuHoang.findMany({
    select: { khu: true, cong: true, thu: true, mau: true, exp: true, vang: true, chieu: true },
    take: 1000,
  });
  check('đã nạp đủ bảng thú hoang', hoang.length === 468, `${hoang.length} con`);

  const bacCua = new Map(KHU.map((k) => [k.ma, k.bac]));
  const theoBac = new Map();
  for (const t of hoang) {
    const b = bacCua.get(t.khu);
    if (b == null) continue;
    if (!theoBac.has(b)) theoBac.set(b, []);
    theoBac.get(b).push(t);
  }
  check('mọi khu trong bảng đều có bậc', theoBac.size === 13, `${theoBac.size} bậc`);

  // ── Sức mạnh và phần thưởng tăng đều theo bậc ────────────────────────
  let truocSuc = 0; let truocTran = 0; let truocThuong = 0;
  const lech = [];
  for (const b of [...theoBac.keys()].sort((x, y) => x - y)) {
    const ds = theoBac.get(b);
    const gSuc = giua(ds.map(suc));
    const tran = Math.max(...ds.map(suc));
    const gThuong = giua(ds.map((t) => t.exp + t.vang));
    if (gSuc <= truocSuc) lech.push(`bậc ${b}: trung vị sức mạnh ${gSuc} ≤ bậc dưới ${truocSuc}`);
    if (tran <= truocTran) lech.push(`bậc ${b}: trần sức mạnh ${tran} ≤ bậc dưới ${truocTran}`);
    if (gThuong <= truocThuong) lech.push(`bậc ${b}: trung vị thưởng ${gThuong} ≤ bậc dưới ${truocThuong}`);
    truocSuc = gSuc; truocTran = tran; truocThuong = gThuong;
  }
  check('sức mạnh và phần thưởng đều tăng theo bậc', lech.length === 0, lech.join('; '));

  // Lãnh Thổ (bậc 7) không còn là bản sao của Núi Đá (bậc 3).
  const lanhTho = giua(hoang.filter((t) => t.khu === 'lanhtho').map(suc));
  const nuiDa = giua(hoang.filter((t) => t.khu === 'map3').map(suc));
  check('Lãnh Thổ mạnh hơn hẳn Núi Đá, không còn là bản sao',
    lanhTho > nuiDa * 5, `Lãnh Thổ ${lanhTho} so với Núi Đá ${nuiDa}`);

  // Hang Huyền Thoại trả thưởng xứng với chỗ khó nhất của phần gốc.
  const hth = hoang.filter((t) => t.khu === 'huyenthoai');
  const thuongHth = Math.min(...hth.map((t) => t.exp + t.vang));
  const thuongCo = Math.max(...hoang.filter((t) => t.khu === 'co').map((t) => t.exp + t.vang));
  check('Hang Huyền Thoại trả hơn hẳn khu Cỏ', thuongHth > thuongCo * 3,
    `${thuongHth} so với ${thuongCo}`);

  // Mối nối phần gốc (bậc 8) sang phần mới (bậc 9).
  const tranB8 = Math.max(...(theoBac.get(8) ?? []).map((t) => t.cong));
  const sanB9 = Math.min(...(theoBac.get(9) ?? []).map((t) => t.cong));
  check('công của bậc 9 bắt đầu trên trần của bậc 8', sanB9 > tranB8, `${sanB9} so với ${tranB8}`);

  // ── Ràng buộc cũ vẫn phải giữ ────────────────────────────────────────
  const khoTrongKhuDe = hoang.filter((t) => ['co', 'ao', 'map2'].includes(t.khu) && t.mau > 1000);
  check('ba khu dễ nhất vẫn không có con nào trên 1000 máu', khoTrongKhuDe.length === 0);
  check('khu Cỏ vẫn không có con nào công từ 100 trở lên',
    hoang.filter((t) => t.khu === 'co' && t.cong >= 100).length === 0);
  check('không con nào có chỉ số bằng không',
    hoang.every((t) => t.cong > 0 && t.thu > 0 && t.mau > 0 && t.exp > 0 && t.vang > 0));

  // ── Bộ chiêu của năm khu mới ─────────────────────────────────────────
  // Trước đây cả 150 con bậc 9–13 dùng chung đúng MỘT bộ chiêu.
  const maMoi = KHU.filter((k) => k.bac >= 9).map((k) => k.ma);
  const boMoi = new Set(hoang.filter((t) => maMoi.includes(t.khu)).map((t) => t.chieu.join('|')));
  check('năm khu mới có nhiều bộ chiêu khác nhau, không dùng chung một bộ',
    boMoi.size >= 20, `${boMoi.size} bộ`);
  check('con nào cũng có đủ bốn chiêu', hoang.every((t) => t.chieu.length === 4));
}
