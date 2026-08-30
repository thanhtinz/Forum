#!/usr/bin/env node
/**
 * Dữ liệu mẫu cho nông trại — mười một loại cây.
 *
 * Chạy:  node scripts/seed-nong-trai.mjs
 *
 * `key` KHÔNG phải số tuỳ ý: nó chính là tên tệp trong bộ ảnh cũ
 * (`o-dat/{key}.png`, `o-dat/{key}-chin.png`, `nong-san/{key}.png`), nên đổi
 * `key` là đổi luôn cái cây người ta nhìn thấy. Tên tiếng Việt bên dưới đặt
 * theo ĐÚNG hình đã mở ra xem, không đặt theo thứ tự số.
 *
 * Bảng tên này là của bản gốc, không phải tên tôi đoán từ hình: đợt đầu tôi
 * nhìn ảnh rồi đặt bừa nên `1.png` (bó lúa) thành "Chuối", `8.png` (quả xoài)
 * thành "Ớt vàng", `9.png` (thanh long) thành "Hoa mười giờ".
 *
 * Cân đối con số — ba luật tự đặt cho nhau, kiểm lại bằng bảng ở cuối tệp:
 *
 *  1. Rẻ thì nhanh mà lãi mỏng, đắt thì lâu mà lãi dày. Lãi một vụ (bán hết
 *     chỗ thu được, trừ tiền hạt) đi từ 7 điểm ở cà rốt lên 275 điểm ở hướng
 *     dương, tăng đều theo bậc thang chứ không có giống nào "ngon bất thường"
 *     — có một bậc lệch là mọi người chỉ trồng đúng bậc ấy, mười giống kia bỏ
 *     không.
 *  2. Chăm mới có lãi tốt: `yieldMin` (không tưới) so với `yieldMax` (có tưới)
 *     chênh nhau đủ lớn để việc quay lại tưới là đáng, nhưng bỏ quên một vụ
 *     thì vẫn không lỗ vốn — không giống nào có `yieldMin × sellPrice` nhỏ hơn
 *     `seedCost`.
 *  3. Giống rẻ nhất phải trong tầm với của người CHƯA có điểm nào: cà rốt 5
 *     điểm, mà cây khế cho 1–3 điểm mỗi giờ — hái vài lần là đủ vốn.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/** key ứng với tệp ảnh; order là thứ tự bày trong cửa hàng (rẻ trước). */
const CAY = [
  // key, tên,            hạt, phút, thu min–max, giá bán
  { key: 3, name: 'Cà rốt', seedCost: 5, growMinutes: 5, yieldMin: 2, yieldMax: 3, sellPrice: 4 },
  { key: 1, name: 'Lúa', seedCost: 10, growMinutes: 10, yieldMin: 2, yieldMax: 3, sellPrice: 7 },
  { key: 2, name: 'Cà chua', seedCost: 16, growMinutes: 20, yieldMin: 2, yieldMax: 4, sellPrice: 10 },
  { key: 4, name: 'Dứa', seedCost: 25, growMinutes: 30, yieldMin: 3, yieldMax: 4, sellPrice: 13 },
  { key: 8, name: 'Xoài', seedCost: 35, growMinutes: 45, yieldMin: 3, yieldMax: 5, sellPrice: 17 },
  { key: 5, name: 'Dưa hấu', seedCost: 50, growMinutes: 60, yieldMin: 3, yieldMax: 5, sellPrice: 24 },
  { key: 6, name: 'Nho', seedCost: 70, growMinutes: 90, yieldMin: 4, yieldMax: 6, sellPrice: 26 },
  { key: 9, name: 'Thanh long', seedCost: 90, growMinutes: 120, yieldMin: 4, yieldMax: 6, sellPrice: 33 },
  { key: 7, name: 'Hoa hồng', seedCost: 120, growMinutes: 180, yieldMin: 5, yieldMax: 7, sellPrice: 38 },
  { key: 11, name: 'Hoa tulip', seedCost: 160, growMinutes: 240, yieldMin: 6, yieldMax: 8, sellPrice: 45 },
  { key: 10, name: 'Hoa hướng dương', seedCost: 220, growMinutes: 360, yieldMin: 7, yieldMax: 9, sellPrice: 55 },
];

/**
 * Quả khế — nông sản thật nhưng KHÔNG gieo được.
 *
 * Nó rụng từ cây khế ngoài vườn chứ không có hạt bán ở cửa hàng, nên
 * `plantable: false` để cửa hàng giấu đi mà bảng đơn hàng vẫn gọi tên được.
 * `growMinutes`/`seedCost` để 0 vì không có vụ nào cả; `sellPrice` đặt ngang
 * bậc thấp nhất, đúng như trước đây hái một quả được một điểm.
 */
const KHE = {
  key: 0, name: 'Khế', seedCost: 0, growMinutes: 0,
  yieldMin: 0, yieldMax: 0, sellPrice: 4,
};

async function main() {
  for (const [i, c] of CAY.entries()) {
    const data = { ...c, order: i + 1, active: true, plantable: true };
    await db.farmCrop.upsert({
      where: { key: c.key },
      update: data,
      create: data,
    });
  }

  const dataKhe = { ...KHE, order: 0, active: true, plantable: false };
  await db.farmCrop.upsert({ where: { key: KHE.key }, update: dataKhe, create: dataKhe });

  // In bảng cân đối ra màn hình: sửa con số ở trên xong là thấy ngay bậc thang
  // lãi còn tăng đều hay đã có giống nhảy cóc.
  console.log('\n  giống          hạt   vụ      lãi nếu quên tưới → lãi nếu có tưới');
  for (const c of CAY) {
    const it = c.yieldMin * c.sellPrice - c.seedCost;
    const nhieu = c.yieldMax * c.sellPrice - c.seedCost;
    console.log(
      `  ${c.name.padEnd(14)} ${String(c.seedCost).padStart(3)}   ` +
      `${String(c.growMinutes).padStart(3)}′    ` +
      `${String(it).padStart(4)} → ${String(nhieu).padStart(4)}`,
    );
  }
  console.log(`\n✓ Đã nạp ${CAY.length} loại cây cho nông trại, kèm quả khế.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
