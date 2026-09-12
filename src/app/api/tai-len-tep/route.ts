import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { locGameCuaToi } from '@/lib/quyen-game';
import { TEP_TOI_DA, hopVoiLoaiTep, luuTepGame, xoaTepGame } from '@/lib/kho';
import { tinhLaiDungLuongBan } from '@/lib/ban-tai';
import { MO_TA_HE, laLoaiTep, type MaHeMay } from '@/lib/he-may';
import { gonDungLuong } from '@/lib/tien-ich';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * POST /api/tai-len-tep?banId=…&loai=APK — nhận một tệp game, gắn thẳng vào bản.
 *
 * KHÔNG DÙNG `FormData`, và đấy là điểm khác hẳn cổng tải ảnh.
 * `req.formData()` gom cả tệp vào bộ nhớ trước khi trả về; với một tấm ảnh ba
 * megabyte thì chẳng sao, với một bản APK ba trăm megabyte thì mỗi lượt bày
 * hàng ngốn đúng bấy nhiêu RAM. Ở đây thân yêu cầu CHÍNH LÀ tệp, chảy thẳng
 * từ trình duyệt qua máy chủ sang kho; mấy thứ đi kèm nằm trên địa chỉ.
 *
 * Đổi lại, trình duyệt gửi bằng `XMLHttpRequest` để còn nghe được tiến độ —
 * `fetch` tới nay vẫn không báo được đã gửi lên tới đâu.
 *
 * Cổng này làm trọn việc: cất tệp, tạo hàng `TepTai`, cộng lại dung lượng bản.
 * Tách làm hai bước (cất xong rồi bảo trình duyệt gọi tiếp một hành động để
 * ghi) thì mỗi lượt mạng đứt giữa chừng là một tệp mồ côi nằm lại trong kho.
 */
export async function POST(req: Request) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) {
    return NextResponse.json({ loi: 'Bạn cần đăng nhập để tải tệp lên.' }, { status: 401 });
  }

  const dc = new URL(req.url);
  const banId = dc.searchParams.get('banId') ?? '';
  const loai = (dc.searchParams.get('loai') ?? '').toUpperCase();
  const tenGoc = (dc.searchParams.get('ten') ?? '').slice(0, 200);

  if (!laLoaiTep(loai)) {
    return NextResponse.json({ loi: 'Loại tệp không hợp lệ.' }, { status: 400 });
  }

  /*
   * Quyền nằm TRONG câu truy vấn, không lọc sau.
   *
   * `locGameCuaToi` trả về mảnh `where`: quản trị thì rỗng (thấy hết), tác giả
   * thì buộc `tacGiaId` là chính họ. Quên ghép vào thì câu truy vấn không khớp
   * gì cả — hỏng về phía an toàn, đúng thứ ta muốn ở một cổng công khai.
   */
  const ban = await db.banTai.findFirst({
    where: { id: banId, game: locGameCuaToi(nguoi) },
    select: { id: true, heMay: true, gameId: true, game: { select: { duongDan: true } } },
  });
  if (!ban) {
    return NextResponse.json({ loi: 'Không tìm thấy bản tải này, hoặc nó không phải của bạn.' }, { status: 404 });
  }

  // Loại tệp phải HỢP VỚI HỆ MÁY của bản: gắn một tệp JAR vào bản Windows thì
  // lỗi chỉ lộ ra lúc có người tải về và bấm hai lần không thấy gì xảy ra.
  const loaiHopLe = MO_TA_HE[ban.heMay as MaHeMay]?.loaiTep ?? [];
  if (!loaiHopLe.includes(loai as never)) {
    return NextResponse.json(
      { loi: `Hệ ${MO_TA_HE[ban.heMay as MaHeMay]?.ten ?? ban.heMay} không nhận tệp ${loai}.` },
      { status: 400 },
    );
  }

  /*
   * Xét cỡ TRƯỚC khi nhận một byte nào.
   *
   * `Content-Length` là con số phía gửi khai nên bịa được — nhưng bịa nhỏ đi
   * thì R2 không nhận (nó đòi đủ số byte đã khai), còn bịa to lên thì bị chặn
   * ngay ở đây. Và dung lượng ta GHI VÀO cơ sở dữ liệu là số đếm được khi tệp
   * chảy qua, không phải con số này.
   */
  const khai = Number(req.headers.get('content-length') ?? '');
  if (!Number.isFinite(khai) || khai <= 0) {
    return NextResponse.json({ loi: 'Không đọc được cỡ tệp gửi lên.' }, { status: 411 });
  }
  if (khai > TEP_TOI_DA) {
    return NextResponse.json(
      { loi: `Tệp nặng quá ${gonDungLuong(TEP_TOI_DA)}.` },
      { status: 413 },
    );
  }
  if (!req.body) return NextResponse.json({ loi: 'Không có tệp nào gửi lên.' }, { status: 400 });

  /*
   * SOI MẤY BYTE ĐẦU rồi mới cho chảy tiếp.
   *
   * Đọc trước một khúc, xét dấu mở đầu, rồi ghép khúc ấy lại vào đầu dòng để
   * phần cất giữ không hề biết là nó đã bị hé xem. Kiểu này chặn được tệp sai
   * loại từ trước khi nó chiếm chỗ trong kho — chứ không phải cất xong rồi mới
   * phát hiện và phải đi xoá.
   */
  const doc = req.body.getReader();
  const dau: Uint8Array[] = [];
  let coDau = 0;
  let het = false;
  while (coDau < 16 && !het) {
    const mau = await doc.read();
    if (mau.done) { het = true; break; }
    dau.push(mau.value);
    coDau += mau.value.length;
  }
  const khucDau = new Uint8Array(coDau);
  { let i = 0; for (const m of dau) { khucDau.set(m, i); i += m.length; } }

  if (coDau === 0) return NextResponse.json({ loi: 'Tệp rỗng.' }, { status: 400 });
  if (!hopVoiLoaiTep(khucDau, loai)) {
    await doc.cancel().catch(() => {});
    return NextResponse.json({ loi: `Ruột tệp này không giống một tệp ${loai}.` }, { status: 415 });
  }

  const dong = new ReadableStream<Uint8Array>({
    start(o) {
      for (const m of dau) o.enqueue(m);
      if (het) o.close();
    },
    async pull(o) {
      if (het) return;
      const mau = await doc.read();
      if (mau.done) { het = true; o.close(); return; }
      o.enqueue(mau.value);
    },
    cancel(vi) { void doc.cancel(vi); },
  });

  let daLuu;
  try {
    daLuu = await luuTepGame(dong, loai, khai);
  } catch {
    return NextResponse.json({ loi: 'Không cất được tệp. Kho đang có vấn đề.' }, { status: 502 });
  }

  try {
    const tep = await db.$transaction(async (tx) => {
      const moi = await tx.tepTai.create({
        data: {
          banId: ban.id, loai, duongDan: daLuu.duongDan,
          dungLuong: BigInt(daLuu.dungLuong),
          tenTep: tenGoc || null,
          // Mã băm do MÁY CHỦ tính lúc tệp chảy qua, nên nó luôn là mã của
          // đúng tệp đang nằm trong kho — người bày hàng không gõ vào được.
          maKiemTra: daLuu.maKiemTra,
        },
        select: { id: true },
      });
      await tinhLaiDungLuongBan(tx as typeof db, ban.id);
      return moi;
    });

    return NextResponse.json({
      id: tep.id, duongDan: daLuu.duongDan,
      dungLuong: daLuu.dungLuong, maKiemTra: daLuu.maKiemTra,
    });
  } catch {
    // Cất được mà ghi sổ hỏng thì dọn luôn tệp vừa cất: để lại là một tệp
    // không ai trỏ tới, nằm tính tiền trong thùng cho tới ngày có người dọn.
    await xoaTepGame(daLuu.duongDan);
    return NextResponse.json({ loi: 'Không ghi được tệp vào bản tải.' }, { status: 500 });
  }
}
