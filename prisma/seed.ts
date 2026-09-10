import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient, type HeMay, type LoaiTep } from '@prisma/client';

const db = new PrismaClient();

/*
 * DỮ LIỆU MẪU.
 *
 * Tệp tải là tệp THẬT — một tệp chữ bé xíu nói rõ nó là tệp mẫu — chứ không
 * phải một đường dẫn bịa. Nhờ vậy cả đường tải chạy được từ đầu tới cuối và mã
 * kiểm tra in ra trang là mã băm thật của tệp thật, đối chiếu được. Bịa một
 * đường dẫn chết thì nút tải trông thì có mà bấm vào là hỏng, và mã kiểm tra
 * thành một dãy chữ vô nghĩa.
 */

const THU_MUC_TEP = path.join(process.cwd(), 'public', 'tep-mau');

function dungTepMau(ten: string, moTa: string, coXapXi: number): { duongDan: string; maKiemTra: string; dungLuong: number } {
  mkdirSync(THU_MUC_TEP, { recursive: true });
  const dau =
    `Tệp mẫu của kho Nova\n` +
    `====================\n\n` +
    `${moTa}\n\n` +
    `Đây KHÔNG phải game thật. Tệp này chỉ để phần tải xuống của trang chạy\n` +
    `được từ đầu tới cuối trong lúc dựng kho.\n\n`;
  /*
   * Chèn thêm cho tệp đạt cỡ mong muốn.
   *
   * Cỡ tệp phải KHÁC nhau giữa các bản, vì lịch sử phiên bản có bày ra dung
   * lượng và "bản cũ nhẹ hơn" là một thông tin thật người dùng dựa vào. Nhồi
   * cho đủ cỡ thì con số in ra là cỡ THẬT của tệp thật — thay vì một con số
   * đẹp ghi trong CSDL còn tệp tải về thì vài trăm byte.
   */
  const dong = 'Phần đệm để tệp mẫu đạt đúng cỡ ghi trong kho.\n';
  const con = Math.max(0, coXapXi - Buffer.byteLength(dau, 'utf8'));
  const noiDung = dau + dong.repeat(Math.ceil(con / Buffer.byteLength(dong, 'utf8')));
  const tep = path.join(THU_MUC_TEP, ten);
  writeFileSync(tep, noiDung, 'utf8');
  return {
    duongDan: `/tep-mau/${ten}`,
    maKiemTra: createHash('sha256').update(noiDung).digest('hex'),
    dungLuong: Buffer.byteLength(noiDung, 'utf8'),
  };
}

const THE_LOAI = [
  'Hành động', 'Phiêu lưu', 'Arcade', 'Đua xe', 'Giải đố',
  'Nhập vai', 'Chiến thuật', 'Thể thao', 'Mô phỏng', 'Thường thức',
];

interface BanMau {
  he: HeMay;
  soHieu: string;
  tep: LoaiTep[];
  dungLuong?: number;
  cuaHang?: string;
  doiMoi?: string;
  /**
   * Số bản CŨ cần dựng thêm cho hệ này.
   *
   * Kho game cũ thì bản cũ không phải rác: máy đời 2006 chạy được bản 1.0
   * nhưng treo ở bản 1.2. Nên mỗi hệ phải có một dãy lịch sử thật để phần
   * "lịch sử phiên bản" có cái mà bày, và để bài kiểm có ca thật mà soi.
   */
  soBanCu?: number;
}

interface GameMau {
  ten: string;
  tenViet?: string;
  nhaPhatTrien: string;
  nam: number;
  theLoai: string[];
  gioiThieu: string;
  cachChoi?: string;
  luuY?: string;
  ngonNgu?: string;
  vietHoa?: boolean;
  noiBat?: boolean;
  ban: BanMau[];
}

const GAME: GameMau[] = [
  {
    ten: 'Bounce Tales', nhaPhatTrien: 'Nokia', nam: 2008, noiBat: true,
    theLoai: ['Phiêu lưu', 'Arcade'],
    gioiThieu: 'Quả bóng đỏ lăn qua mười hai màn, nhảy qua gai, đẩy thùng và né dòng nước. Trò cài sẵn trong máy Nokia đời S40 mà gần như ai cầm điện thoại thời ấy cũng từng chơi.',
    cachChoi: 'Trái/phải để lăn, phím giữa để nhảy. Bóng nặng dần khi ăn vật phẩm, nặng thì chìm chậm hơn nhưng nhảy thấp đi.',
    luuY: 'Bản JAR chạy trên máy hỗ trợ MIDP 2.0 trở lên. Màn hình dưới 128×128 sẽ bị cắt mất phần đếm điểm.',
    ban: [{ he: 'JAVA', soHieu: '1.2', tep: ['JAR', 'JAD'], dungLuong: 348_160, soBanCu: 4 }],
  },
  {
    ten: 'Snake Xenzia', tenViet: 'Rắn săn mồi', nhaPhatTrien: 'Nokia', nam: 2005, vietHoa: true, noiBat: true,
    theLoai: ['Arcade', 'Thường thức'], ngonNgu: 'vi',
    gioiThieu: 'Con rắn dài thêm mỗi lần ăn, và chỉ thua khi tự cắn vào mình. Không có màn, không có kết thúc — chỉ có con số dài ra mãi.',
    cachChoi: 'Bốn phím hướng. Rắn không dừng lại được, nên đường đi phải nghĩ trước vài ô.',
    ban: [
      { he: 'JAVA', soHieu: '2.0', tep: ['JAR'], dungLuong: 122_880 },
      { he: 'ANDROID', soHieu: '3.1', tep: ['APK'], dungLuong: 4_194_304, doiMoi: 'Thêm chế độ chơi vô tận và bảng điểm ngoại tuyến.' },
    ],
  },
  {
    ten: 'Asphalt Urban GT', nhaPhatTrien: 'Gameloft', nam: 2004, noiBat: true,
    theLoai: ['Đua xe', 'Hành động'],
    gioiThieu: 'Đua xe đường phố với xe có giấy phép thật, chạy qua các thành phố lớn. Bản đầu tiên của dòng Asphalt, dựng trên máy đồ hoạ giả 3D của điện thoại phổ thông.',
    cachChoi: 'Phím 2 tăng tốc, 8 phanh, 4/6 bẻ lái. Phím 5 dùng nitro khi thanh nitro đầy.',
    luuY: 'Bản JAR khá nặng với máy đời cũ; nếu khung hình giật thì tắt bóng đổ trong phần Cài đặt của game.',
    ban: [
      { he: 'JAVA', soHieu: '1.0.4', tep: ['JAR', 'JAD'], dungLuong: 512_000 },
      { he: 'ANDROID', soHieu: '2.0', tep: ['APK'], dungLuong: 27_262_976 },
      { he: 'IOS', soHieu: '2.0', tep: ['IPA'], dungLuong: 31_457_280 },
    ],
  },
  {
    ten: 'Diamond Rush', tenViet: 'Săn kim cương', nhaPhatTrien: 'Gameloft', nam: 2008, vietHoa: true,
    theLoai: ['Phiêu lưu', 'Giải đố'], ngonNgu: 'vi',
    gioiThieu: 'Ba vùng đất, mỗi vùng một kiểu bẫy: đẩy đá, né gai, canh nhịp con lăn. Đi tới đâu nhặt kim cương tới đó, nhưng nhặt tham một viên là mắc kẹt cả màn.',
    cachChoi: 'Phím hướng để đi và đẩy. Đứng cạnh bẫy rồi bấm phím giữa để gỡ.',
    ban: [{ he: 'JAVA', soHieu: '1.1', tep: ['JAR', 'JAD'], dungLuong: 460_800 }],
  },
  {
    ten: 'Prince of Persia: Harem Adventures', nhaPhatTrien: 'Gameloft', nam: 2003,
    theLoai: ['Hành động', 'Phiêu lưu'],
    gioiThieu: 'Hoàng tử chạy, bám mép tường và đấu kiếm trong mê cung cung điện. Chuyển động vẽ theo lối quay hình người thật, thứ làm nên tên tuổi của dòng game này.',
    ban: [{ he: 'JAVA', soHieu: '1.0', tep: ['JAR'], dungLuong: 286_720 }],
  },
  {
    ten: 'Chess Master', tenViet: 'Cờ vua', nhaPhatTrien: 'Optima', nam: 2006, vietHoa: true,
    theLoai: ['Chiến thuật', 'Giải đố'], ngonNgu: 'vi',
    gioiThieu: 'Cờ vua với máy tính ở tám mức, kèm bộ thế cờ để tự luyện. Ván đang chơi dở được giữ lại khi tắt máy.',
    /*
     * Game bày đủ CẢ NĂM hệ máy — cố ý để mặt tiền, trang game và khung tải
     * đều có một ca thật để kiểm, thay vì mỗi game một hệ rồi không bao giờ
     * biết chỗ chọn hệ máy trông ra sao khi đầy.
     */
    ban: [
      { he: 'JAVA', soHieu: '1.5', tep: ['JAR', 'JAD'], dungLuong: 204_800, soBanCu: 4 },
      { he: 'ANDROID', soHieu: '3.0', tep: ['APK'], dungLuong: 18_874_368, soBanCu: 3 },
      { he: 'IOS', soHieu: '3.0', tep: ['IPA'], dungLuong: 22_020_096, cuaHang: 'https://apps.apple.com/' },
      { he: 'WINDOWS', soHieu: '2.2', tep: ['EXE', 'ZIP'], dungLuong: 12_582_912 },
      { he: 'MAC', soHieu: '2.2', tep: ['DMG'], dungLuong: 15_728_640,
        doiMoi: 'Chạy được trên máy chip Apple mà không cần Rosetta.' },
    ],
  },
  {
    ten: 'Sudoku Classic', tenViet: 'Sudoku cổ điển', nhaPhatTrien: 'Nova Studio', nam: 2019, vietHoa: true,
    theLoai: ['Giải đố', 'Thường thức'], ngonNgu: 'vi',
    gioiThieu: 'Sudoku 9×9 với bốn mức khó và bộ đề sinh ngẫu nhiên. Có gợi ý, có đánh dấu nháp, và đếm giờ nếu bạn muốn tự thi với chính mình.',
    ban: [
      { he: 'ANDROID', soHieu: '4.2', tep: ['APK'], dungLuong: 8_388_608 },
      { he: 'IOS', soHieu: '4.2', tep: ['IPA'], dungLuong: 11_534_336, cuaHang: 'https://apps.apple.com/' },
      { he: 'MAC', soHieu: '4.1', tep: ['DMG'], dungLuong: 9_437_184 },
      { he: 'WINDOWS', soHieu: '4.1', tep: ['EXE'], dungLuong: 7_340_032 },
    ],
  },
  {
    ten: 'Farm Frenzy', tenViet: 'Nông trại vui vẻ', nhaPhatTrien: 'Alawar', nam: 2007, vietHoa: true,
    theLoai: ['Mô phỏng', 'Thường thức'], ngonNgu: 'vi',
    gioiThieu: 'Nuôi gà, vắt sữa, làm bánh rồi đem bán — mỗi màn một mức thời gian phải kịp. Càng về sau càng phải tính trước xem nên nuôi gì trước con gì.',
    ban: [{ he: 'ANDROID', soHieu: '1.9', tep: ['APK'], dungLuong: 33_554_432 }],
  },
  {
    ten: 'Dragon Hunter', tenViet: 'Thợ săn rồng', nhaPhatTrien: 'Nova Studio', nam: 2011, vietHoa: true,
    theLoai: ['Nhập vai', 'Hành động'], ngonNgu: 'vi',
    gioiThieu: 'Game nhập vai theo lượt: nhận việc ở làng, đi hang, đánh rồng, về bán chiến lợi phẩm. Ba lớp nhân vật, mỗi lớp một cây kỹ năng riêng.',
    cachChoi: 'Trong trận, mỗi lượt chọn một trong bốn ô: đánh, kỹ năng, vật phẩm, chạy.',
    ban: [
      { he: 'JAVA', soHieu: '1.3', tep: ['JAR', 'JAD'], dungLuong: 573_440 },
      { he: 'ANDROID', soHieu: '2.4', tep: ['APK'], dungLuong: 46_137_344 },
      { he: 'MAC', soHieu: '2.4', tep: ['DMG'], dungLuong: 52_428_800 },
    ],
  },
  {
    ten: 'Tetris Mania', nhaPhatTrien: 'EA Mobile', nam: 2006,
    theLoai: ['Giải đố', 'Arcade'],
    gioiThieu: 'Bảy khối quen thuộc rơi xuống, xếp kín một hàng thì hàng ấy biến mất. Bản này thêm chế độ Marathon và chế độ chạy đua 40 hàng.',
    ban: [
      { he: 'JAVA', soHieu: '1.0', tep: ['JAR'], dungLuong: 163_840 },
      { he: 'WINDOWS', soHieu: '1.4', tep: ['EXE', 'ZIP'], dungLuong: 5_242_880 },
      { he: 'MAC', soHieu: '1.4', tep: ['DMG'], dungLuong: 6_291_456 },
    ],
  },
  {
    ten: 'Real Football 2009', tenViet: 'Bóng đá 2009', nhaPhatTrien: 'Gameloft', nam: 2008,
    theLoai: ['Thể thao'],
    gioiThieu: 'Bóng đá 11 người với các giải đấu và đội hình cập nhật tới mùa 2008–2009. Có chế độ quản lý đội bóng bên cạnh phần thi đấu.',
    ban: [{ he: 'JAVA', soHieu: '1.2', tep: ['JAR', 'JAD'], dungLuong: 430_080 }],
  },
  {
    ten: 'Block Breaker Deluxe', nhaPhatTrien: 'Gameloft', nam: 2005,
    theLoai: ['Arcade', 'Thường thức'],
    gioiThieu: 'Đập gạch với thanh trượt và quả bóng, thêm vật phẩm rơi xuống làm bóng to ra, chia ba hoặc bắn laser. Tám mươi màn.',
    ban: [{ he: 'JAVA', soHieu: '1.1', tep: ['JAR'], dungLuong: 245_760 }],
  },
];

/**
 * Ghi chú "có gì mới" cho các bản cũ.
 *
 * Xoay vòng theo thứ tự bản chứ không bốc ngẫu nhiên: chạy seed hai lần phải
 * ra cùng một kết quả, không thì mỗi lần chạy lại là lịch sử phiên bản đổi
 * khác và không bài kiểm nào bám vào đâu được.
 */
const DOI_MOI_CU = [
  'Sửa lỗi treo máy khi thoát giữa chừng.',
  'Giảm dung lượng, chạy nhẹ hơn trên máy đời cũ.',
  'Thêm màn chơi mới và sửa vài lỗi hiển thị.',
  'Sửa lỗi mất điểm sau khi tắt máy.',
  'Chỉnh lại độ khó ở mấy màn cuối.',
  'Bản phát hành đầu tiên.',
];

/** "1.2" → "1.1" → "1.0". Hết số thì lùi số chính. */
function banTruoc(soHieu: string): string {
  const phan = soHieu.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = phan.length - 1; i >= 0; i--) {
    if (phan[i] > 0) { phan[i] -= 1; return phan.join('.'); }
    phan[i] = 9;
  }
  return soHieu;
}

const BINH_LUAN_MAU = [
  'Chơi lại thấy y như hồi cầm cái điện thoại cũ. Tải một phát chạy luôn, không lỗi gì.',
  'Máy mình đời cũ mà vẫn mượt. Có điều màn hình bé nên chữ hơi khó đọc.',
  'Bản Việt hoá dịch khá tử tế, không bị lỗi phông như mấy bản trôi nổi ngoài kia.',
  'Game hay nhưng mấy màn cuối khó quá, ngồi cả buổi chưa qua nổi.',
  'Đúng thứ mình đang tìm mấy năm nay. Cảm ơn kho đã giữ lại.',
];

async function main() {
  // ── Thể loại ────────────────────────────────────────────────────────
  const theLoaiId: Record<string, string> = {};
  for (const [i, ten] of THE_LOAI.entries()) {
    const duongDan = ten.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const t = await db.theLoai.upsert({
      where: { duongDan }, update: { ten, thuTu: i }, create: { duongDan, ten, thuTu: i },
      select: { id: true },
    });
    theLoaiId[ten] = t.id;
  }

  // ── Người dùng ──────────────────────────────────────────────────────
  const matKhauQuanTri = await bcrypt.hash('admin123', 10);
  const matKhauThuong = await bcrypt.hash('thanhvien123', 10);

  const quanTri = await db.nguoiDung.upsert({
    where: { email: 'admin@nova.local' },
    update: { vaiTro: 'QUAN_TRI' },
    create: {
      email: 'admin@nova.local', tenDangNhap: 'admin', tenHienThi: 'Ban quản kho',
      matKhauBam: matKhauQuanTri, vaiTro: 'QUAN_TRI',
    },
    select: { id: true },
  });

  const thanhVien: string[] = [];
  for (const [ten, hien] of [['minhdev', 'Minh'], ['lanpham', 'Lan Phạm'], ['huytran', 'Huy Trần'], ['anhthu', 'Anh Thư']]) {
    const u = await db.nguoiDung.upsert({
      where: { email: `${ten}@nova.local` },
      update: {},
      create: { email: `${ten}@nova.local`, tenDangNhap: ten, tenHienThi: hien, matKhauBam: matKhauThuong },
      select: { id: true },
    });
    thanhVien.push(u.id);
  }

  // ── Game ────────────────────────────────────────────────────────────
  for (const [i, g] of GAME.entries()) {
    const duongDan = g.ten.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const game = await db.game.upsert({
      where: { duongDan },
      update: {},
      create: {
        duongDan,
        ten: g.ten,
        tenViet: g.tenViet ?? null,
        nhaPhatTrien: g.nhaPhatTrien,
        namPhatHanh: g.nam,
        gioiThieu: g.gioiThieu,
        cachChoi: g.cachChoi ?? null,
        luuY: g.luuY ?? null,
        ngonNgu: g.ngonNgu ?? 'en',
        vietHoa: g.vietHoa ?? false,
        noiBat: g.noiBat ?? false,
        trangThai: 'DANG_HIEN',
        // Giãn ngày đăng ra để kệ "Mới lên kho" có thứ tự thật chứ không phải
        // mười hai game cùng một mốc rồi sắp bừa.
        dangLuc: new Date(Date.now() - i * 36 * 3600 * 1000),
        soLuotTai: 400 + ((i * 977) % 21_000),
        soLuotXem: 1_500 + ((i * 2131) % 60_000),
      },
      select: { id: true },
    });

    for (const ten of g.theLoai) {
      await db.theLoaiTrenGame.upsert({
        where: { gameId_theLoaiId: { gameId: game.id, theLoaiId: theLoaiId[ten] } },
        update: {}, create: { gameId: game.id, theLoaiId: theLoaiId[ten] },
      });
    }

    /*
     * Dựng lại bản tải từ đầu thay vì `upsert` rồi bỏ qua.
     *
     * `upsert` với `update: {}` giữ nguyên hàng cũ, nên sửa dữ liệu mẫu rồi
     * chạy lại seed thì chẳng có gì đổi — mất cả buổi tưởng mã hỏng trong khi
     * chỉ là hàng cũ còn nằm đó.
     */
    await db.banTai.deleteMany({ where: { gameId: game.id } });

    for (const b of g.ban) {
      // Dãy số hiệu: bản mới nhất đứng đầu, rồi lùi dần về bản đầu tiên.
      const day = [b.soHieu];
      for (let k = 0; k < (b.soBanCu ?? 2); k++) day.push(banTruoc(day[day.length - 1]));

      for (const [thu, soHieu] of day.entries()) {
        const moiNhat = thu === 0;
        /*
         * Cỡ tệp mẫu: bản càng cũ càng nhẹ, để lịch sử phiên bản đọc ra hợp lẽ.
         *
         * Chia nhỏ hẳn so với cỡ thật của game (một tệp APK 18 MB nhân với 83
         * bản là gần hai gigabyte rác trên đĩa), nhưng vẫn là cỡ THẬT của tệp
         * thật — con số in ra trang và tệp tải về luôn khớp nhau.
         */
        const co = Math.max(2_048, Math.round(((b.dungLuong ?? 200_000) / 40) * (1 - thu * 0.08)));

        const ban = await db.banTai.create({
          data: {
            gameId: game.id, heMay: b.he, soHieu, moiNhat,
            // Điền sau, bằng TỔNG cỡ thật của các tệp vừa dựng — xem bên dưới.
            dungLuong: null,
            // Bản đầu tiên của dãy luôn mang đúng một câu; các bản giữa xoay
            // vòng theo thứ tự, để chạy seed hai lần vẫn ra cùng lịch sử.
            doiMoi: thu === day.length - 1
              ? 'Bản phát hành đầu tiên.'
              : moiNhat
                ? (b.doiMoi ?? DOI_MOI_CU[i % (DOI_MOI_CU.length - 1)])
                : DOI_MOI_CU[(i + thu) % (DOI_MOI_CU.length - 1)],
            // Chỉ bản mới nhất dẫn sang cửa hàng ngoài: cửa hàng chính chủ
            // không giữ bản cũ, trỏ sang đó là trỏ vào bản khác hẳn.
            duongDanCuaHang: moiNhat ? (b.cuaHang ?? null) : null,
            /*
             * Bản càng cũ, ngày càng LÙI VỀ TRƯỚC — mỗi bậc lùi năm tháng.
             * Tính bằng cách trừ thẳng vào số tháng rồi để `Date.UTC` tự mượn
             * năm: tự xoay vòng tháng bằng `% 12` là kiểu gì cũng có ngày ra
             * một dãy lịch sử mà bản cũ lại đứng sau bản mới.
             */
            ngayRa: new Date(Date.UTC(g.nam, 10 - thu * 5, 1 + (i % 27))),
          },
          select: { id: true },
        });

        let tongCo = 0;
        for (const [thuTep, loai] of b.tep.entries()) {
          const tenTep = `${duongDan}-${soHieu}.${loai.toLowerCase()}`;
          // Tệp đi kèm (JAD) bé hơn hẳn tệp chính — đúng như ngoài đời.
          const mau = dungTepMau(tenTep, `${g.ten} — bản ${soHieu} cho ${b.he}.`,
            thuTep === 0 ? co : Math.round(co / 200));
          tongCo += mau.dungLuong;
          await db.tepTai.create({
            data: {
              banId: ban.id, loai, duongDan: mau.duongDan, tenTep,
              dungLuong: BigInt(mau.dungLuong), maKiemTra: mau.maKiemTra,
            },
            select: { id: true },
          });
        }

        /*
         * Dung lượng của BẢN = tổng cỡ các tệp của nó.
         *
         * Trước đây cột này là một con số quản trị tự gõ, nên trang in ra
         * "200 KB" ở hàng phiên bản trong khi nút tải ghi "240 B" — hai con số
         * cho cùng một thứ, và người đọc không biết tin cái nào. Nay chỉ còn
         * một nguồn sự thật: tệp.
         */
        if (tongCo > 0) {
          await db.banTai.update({
            where: { id: ban.id }, data: { dungLuong: BigInt(tongCo) }, select: { id: true },
          });
        }
      }
    }

    // ── Đánh giá ──────────────────────────────────────────────────────
    const soDanhGia = 2 + (i % 3);
    let tong = 0;
    for (let k = 0; k < soDanhGia; k++) {
      const nguoiId = thanhVien[(i + k) % thanhVien.length];
      const sao = 3 + ((i + k) % 3); // 3..5
      tong += sao;
      await db.danhGia.upsert({
        where: { gameId_nguoiId: { gameId: game.id, nguoiId } },
        update: {},
        create: { gameId: game.id, nguoiId, sao, noiDung: BINH_LUAN_MAU[(i + k) % BINH_LUAN_MAU.length] },
        select: { id: true },
      });
    }
    await db.game.update({
      where: { id: game.id },
      data: { tongSao: tong, soLuotDanhGia: soDanhGia },
      select: { id: true },
    });

    // ── Một chủ đề thảo luận cho vài game đầu ─────────────────────────
    if (i < 5) {
      const daCo = await db.chuDe.findFirst({ where: { gameId: game.id }, select: { id: true } });
      if (!daCo) {
        const cd = await db.chuDe.create({
          data: {
            gameId: game.id, nguoiId: thanhVien[i % thanhVien.length],
            tieuDe: `Ai qua được màn cuối ${g.ten} chưa?`,
            noiDung: 'Mình mắc ở đoạn gần cuối mãi không qua nổi. Ai đi hết rồi chỉ mình với, cảm ơn cả nhà.',
            soTraLoi: 1,
          },
          select: { id: true },
        });
        await db.traLoi.create({
          data: {
            chuDeId: cd.id, nguoiId: quanTri.id,
            noiDung: 'Đoạn đó phải đi vòng bên trái rồi mới lên được. Cứ đi thẳng là kẹt.',
          },
          select: { id: true },
        });
      }
    }
  }

  const tong = await db.game.count();
  console.log(`✅ Xong. ${tong} game, ${THE_LOAI.length} thể loại.`);
  console.log('   Quản trị: admin@nova.local / admin123');
  console.log('   Thành viên: minhdev / thanhvien123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
