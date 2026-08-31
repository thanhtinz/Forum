import { db } from '../helpers.mjs';
import { heCuaChieu, heRaChieu, heSoHe, tinhSatThuong } from '../../src/lib/pokemon-const.ts';

/**
 * Hệ của từng chiêu.
 *
 * Bốn chiêu của thú người chơi LUÔN bằng nhau về sát thương: khởi đầu 10 cả
 * bốn, mỗi viên đá tiến cấp cộng 100 vào cả bốn. Nghĩa là trước đợt này, chọn
 * chiêu nào cũng hệt nhau — bảng chiêu là bốn cái nút giống hệt, và mười bảy
 * hệ chỉ ăn thua ở hệ của CON, thứ người chơi không đổi được.
 *
 * Bài này canh đúng thứ khiến bốn nút khác nhau thật.
 */
export default async function run(check) {
  // ── Tra hệ theo tên chiêu ────────────────────────────────────────────
  check('chiêu hệ Điện tra ra hệ Điện', heCuaChieu('THUNDERBOLT') === 4, String(heCuaChieu('THUNDERBOLT')));
  check('chiêu hệ Nước tra ra hệ Nước', heCuaChieu('WATER GUN') === 3);
  check('chiêu hệ Cỏ tra ra hệ Cỏ', heCuaChieu('RAZOR LEAF') === 5);
  check('chiêu hệ Thường tra ra hệ Thường', heCuaChieu('TACKLE') === 1);

  check('viết thường hay thừa khoảng trắng vẫn tra được',
    heCuaChieu('  water   gun ') === 3, String(heCuaChieu('  water   gun ')));

  // Bản gốc đánh số đuôi để nhét bốn chiêu vào bốn ô: "ROCK THROW 2".
  check('chiêu bị đánh số đuôi vẫn tra ra đúng hệ',
    heCuaChieu('ROCK THROW 2') === 13 && heCuaChieu('VOLT TACKLE 3') === 4,
    `${heCuaChieu('ROCK THROW 2')} / ${heCuaChieu('VOLT TACKLE 3')}`);

  // Bản gốc gõ nhầm mấy tên; sửa ở bảng tra chứ không sửa dữ liệu, vì tên hiện
  // trên màn hình vẫn là tên bản gốc.
  check('mấy tên gõ nhầm của bản gốc vẫn tra ra đúng hệ',
    heCuaChieu('POSONPOWDER') === 8 && heCuaChieu('MEGAHORM') === 12
    && heCuaChieu('SOLARBEAN') === 5 && heCuaChieu('SHOCK UAVE') === 4);

  check('tên vô nghĩa thì trả 0 chứ không đoán bừa',
    heCuaChieu('SFSDF') === 0 && heCuaChieu('PHOTOSHOP STRIKE') === 0 && heCuaChieu('') === 0
    && heCuaChieu(null) === 0);
  check('tra không ra thì lấy hệ của chính con thú',
    heRaChieu('SFSDF', 7) === 7 && heRaChieu('THUNDERBOLT', 7) === 4);

  // ── Sát thương: hệ CHIÊU cho phần gây, hệ CON cho phần chịu ──────────
  // Con hệ Thường (1) đánh con hệ Nước (3): hệ Thường không khắc gì Nước.
  // Nhưng ra chiêu hệ Điện (4) thì Điện khắc Nước ×2.
  const heThuong = heSoHe(1, 3);
  const heDien = heSoHe(4, 3);
  check('bảng khắc hệ: Điện khắc Nước còn Thường thì không',
    heDien[0] === 2 && heThuong[0] === 1, `${heDien[0]} so với ${heThuong[0]}`);

  const thuong = tinhSatThuong(100, 10, 1, 50, 10, 3, 1);
  const dien = tinhSatThuong(100, 10, 1, 50, 10, 3, 4);
  check('cùng con thú, chiêu hệ Điện gây gấp đôi chiêu hệ Thường',
    dien.gay === thuong.gay * 2, `${thuong.gay} → ${dien.gay}`);
  check('đổi chiêu KHÔNG đổi phần phải chịu — đòn của địch nhằm vào con, không nhằm vào chiêu',
    dien.chiu === thuong.chiu, `${thuong.chiu} so với ${dien.chiu}`);

  check('bỏ trống hệ chiêu thì ra đúng kết quả của công thức cũ',
    JSON.stringify(tinhSatThuong(100, 10, 1, 50, 10, 3))
      === JSON.stringify(tinhSatThuong(100, 10, 1, 50, 10, 3, 1)));

  // Hệ số 0 là miễn nhiễm hoàn toàn, không được kéo lên sàn 1.
  const mienNhiem = tinhSatThuong(100, 10, 1, 50, 10, 14, 1);
  check('hệ Thường đánh hệ Ma là vô hiệu, không phải sàn 1 máu',
    mienNhiem.gay === 0, String(mienNhiem.gay));

  // ── Bảng thật: chiêu của thú hoang tra ra được hệ ────────────────────
  const hoang = await db.pokeThuHoang.findMany({ select: { chieu: true }, take: 1000 });
  const moi = hoang.flatMap((t) => t.chieu);
  const traRa = moi.filter((c) => heCuaChieu(c) > 0).length;
  check('phần lớn chiêu trong bảng thật tra ra được hệ',
    traRa / moi.length > 0.9, `${traRa}/${moi.length}`);

  const gym = await db.pokeGym.findMany({ select: { chieu: true }, take: 20 });
  const chieuGym = gym.flatMap((g) => g.chieu);
  check('chiêu của mười bốn Gym tra ra được hết',
    chieuGym.every((c) => heCuaChieu(c) > 0),
    chieuGym.filter((c) => heCuaChieu(c) === 0).join(', '));
}
