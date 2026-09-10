import { chiaHomNay } from '../src/lib/hom-nay-const';

/*
 * Duyệt lịch chia game của tab "Hôm nay" qua nhiều ngày liền.
 *
 * Chạy: npx tsx scripts/soat-vong-hom-nay.ts [số game] [mỗi ngày] [số ngày]
 *
 * In ra JSON để bài kiểm đọc, và in bảng cho người xem. Đây là cách kiểm thứ
 * "không trùng trong một vòng" mà không phải dựng máy chủ rồi chờ qua đêm.
 */
const soGame = Number(process.argv[2] ?? 12);
const moiNgay = Number(process.argv[3] ?? 4);
const soNgayDuyet = Number(process.argv[4] ?? 60);

const kho = Array.from({ length: soGame }, (_, i) => `game-${String(i).padStart(3, '0')}`);

const lich: { ngay: number; vong: number; chon: string[] }[] = [];
for (let n = 0; n < soNgayDuyet; n++) {
  const { chon, vong } = chiaHomNay(kho, moiNgay, n);
  lich.push({ ngay: n, vong, chon });
}

// Trong MỘT vòng, mỗi game phải xuất hiện đúng một lần.
const theoVong = new Map<number, string[]>();
for (const d of lich) theoVong.set(d.vong, [...(theoVong.get(d.vong) ?? []), ...d.chon]);

let trungTrongVong = 0;
let thieuTrongVong = 0;
for (const [vong, ds] of theoVong) {
  const daDu = ds.length === kho.length;   // vòng chạy hết, không bị cắt ngang
  if (new Set(ds).size !== ds.length) trungTrongVong++;
  if (daDu && new Set(ds).size !== kho.length) thieuTrongVong++;
  void vong;
}

// Hai ngày LIỀN NHAU không được giống nhau.
let ngayLienTrung = 0;
for (let i = 1; i < lich.length; i++) {
  if (lich[i].chon.join() === lich[i - 1].chon.join()) ngayLienTrung++;
}

const ketQua = {
  soGame, moiNgay, soNgayDuyet,
  soNgayMotVong: Math.ceil(soGame / moiNgay),
  trungTrongVong, thieuTrongVong, ngayLienTrung,
  // Cùng một ngày gọi hai lần phải ra y hệt.
  onDinh: chiaHomNay(kho, moiNgay, 7).chon.join() === chiaHomNay(kho, moiNgay, 7).chon.join(),
};

if (process.env.JSON === '1') {
  console.log(JSON.stringify(ketQua));
} else {
  console.log(`Kho ${soGame} game, mỗi ngày ${moiNgay} → một vòng ${ketQua.soNgayMotVong} ngày\n`);
  for (const d of lich.slice(0, 12)) {
    console.log(`  ngày ${String(d.ngay).padStart(3)} · vòng ${d.vong}  ${d.chon.join(' ')}`);
  }
  console.log(`\n  trùng trong một vòng : ${trungTrongVong}`);
  console.log(`  sót game trong vòng  : ${thieuTrongVong}`);
  console.log(`  hai ngày liền giống  : ${ngayLienTrung}`);
  console.log(`  gọi lại vẫn y hệt    : ${ketQua.onDinh}`);
}
