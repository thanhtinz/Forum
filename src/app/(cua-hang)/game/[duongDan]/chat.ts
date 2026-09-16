'use server';

import { db } from '@/lib/db';
import { batBuocDangNhap, nguoiHienTai } from '@/lib/xac-thuc';
import { LAY_MOI_LAN, NGHI_GIAY, TIN_TOI_DA } from '@/lib/chat-const';
import { DIA_CHI_TOI_DA, laDiaChiHopLe } from '@/lib/dia-chi-an-toan';

export interface CauChat {
  id: string;
  noiDung: string;
  anh: string | null;
  taoLuc: string;
  nguoi: { tenDangNhap: string; tenHienThi: string; anh: string | null };
}

export interface KetQuaChat { loi?: string; cau?: CauChat[] }

/*
 * PHÒNG CHAT CHẠY BẰNG CÁCH HỎI LẠI, không có đường truyền hai chiều.
 *
 * Dự án không có máy chủ ổ cắm (websocket) nào cả, và dựng một cái chỉ để
 * chạy phòng chat thì đổi cả hình dạng bản triển khai — trong khi chỗ này gõ
 * vài câu một phút là cùng. Nên trình duyệt tự hỏi lại theo nhịp; xem
 * `NHIP_MS` trong `chat-const.ts` để biết vì sao là tám giây và vì sao chỉ hỏi
 * khi tab đang mở.
 */

/**
 * Đọc mấy câu mới nhất của phòng.
 *
 * KHÔNG cần đăng nhập: phòng chat nằm ngay trong trang game, mà trang game thì
 * ai cũng mở được — giấu nội dung sau cửa đăng nhập là bắt người mới phải đăng
 * ký trước khi biết chỗ này có gì. Gửi thì mới cần đăng nhập.
 */
export async function docChat(gameId: string): Promise<KetQuaChat> {
  const game = await db.game.findFirst({
    where: { id: gameId, trangThai: 'DANG_HIEN' }, select: { id: true },
  });
  if (!game) return { loi: 'Không tìm thấy phòng này.' };

  const cau = await db.tinNhanChat.findMany({
    where: { gameId },
    /*
     * Lấy mới nhất trước rồi ĐẢO LẠI ở đây, chứ không xếp xuôi rồi cắt.
     *
     * Xếp xuôi thì `take` cắt mất đúng phần vừa nói — tức là phần duy nhất
     * người ta mở phòng chat ra để đọc.
     */
    orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
    take: LAY_MOI_LAN,
    select: {
      id: true, noiDung: true, anh: true, taoLuc: true,
      nguoi: { select: { tenDangNhap: true, tenHienThi: true, anh: true } },
    },
  });

  return {
    cau: cau.reverse().map((c) => ({
      id: c.id,
      noiDung: c.noiDung,
      anh: c.anh,
      // Ngày tháng đi qua ranh giới máy chủ — trình duyệt tự dựng lại.
      taoLuc: c.taoLuc.toISOString(),
      nguoi: c.nguoi,
    })),
  };
}

/**
 * Gửi một câu vào phòng chat của game.
 *
 * `anh` là ảnh tự tải lên, một cái sticker, hay một ảnh động — cả ba đều là
 * một địa chỉ. Có ảnh thì `noiDung` được phép rỗng: gửi mỗi cái sticker là
 * chuyện thường nhất trong một phòng chat.
 */
export async function guiChat(
  gameId: string, noiDung: string, anh?: string,
): Promise<KetQuaChat> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để nói chuyện.' }; }

  const chu = noiDung.trim();
  const tam = (anh ?? '').trim();

  /*
   * Ảnh đi THẲNG vào thuộc tính `src` lúc bày, nên nó phải qua đúng bộ kiểm
   * địa chỉ của dự án — không tự so đầu chuỗi.
   *
   * `startsWith('/')` là cái bẫy `dia-chi-an-toan.ts` sinh ra để giết:
   * `//may-chu-la/x.png` và `/\may-chu-la/x.png` đều bắt đầu bằng `/`, mà
   * trình duyệt đọc chúng thành "cùng giao thức, KHÁC MÁY CHỦ". Lọt là cửa
   * hàng bày ảnh của người lạ dưới tên mình, và mỗi lượt xem là một lượt gửi
   * địa chỉ IP người xem sang máy chủ ấy.
   */
  if (tam && (tam.length > DIA_CHI_TOI_DA || !laDiaChiHopLe(tam))) {
    return { loi: 'Ảnh không hợp lệ.' };
  }
  if (!chu && !tam) return { loi: 'Chưa gõ gì cả.' };
  if (chu.length > TIN_TOI_DA) return { loi: `Mỗi câu tối đa ${TIN_TOI_DA} ký tự.` };

  // Điều kiện "game đang hiện" nằm trong truy vấn, không lọc sau: hàm này là
  // một địa chỉ POST công khai, gọi thẳng vào được mà không qua trang nào.
  const game = await db.game.findFirst({
    where: { id: gameId, trangThai: 'DANG_HIEN' }, select: { id: true },
  });
  if (!game) return { loi: 'Không tìm thấy phòng này.' };

  /*
   * NHỊP NGHỈ đo trên hàng CUỐI CÙNG của chính người này, không đếm trong một
   * khoảng — đếm thì phải quét, mà tra hàng cuối là một lượt chạm chỉ mục.
   *
   * Đếm theo NGƯỜI, không theo cặp (phòng, người). Kèm `gameId` vào đây thì
   * mỗi phòng có một hạn ngạch riêng, mà cửa hàng có hàng trăm game — xoay
   * vòng qua chúng là gửi được hàng trăm câu trong ba giây, đúng thứ nhịp nghỉ
   * sinh ra để chặn. Chỉ mục `[nguoiId, taoLuc]` trong lược đồ có mặt cho đúng
   * lượt tra này.
   *
   * Người bị chặn vẫn nhận câu trả lời tử tế chứ không im lặng: im lặng thì họ
   * bấm gửi thêm năm lần nữa, đúng thứ nhịp nghỉ sinh ra để tránh.
   */
  const cuoi = await db.tinNhanChat.findFirst({
    where: { nguoiId: nguoi.id },
    orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
    select: { taoLuc: true },
  });
  if (cuoi && Date.now() - cuoi.taoLuc.getTime() < NGHI_GIAY * 1000) {
    return { loi: `Chậm thôi — mỗi câu cách nhau ${NGHI_GIAY} giây.` };
  }

  await db.tinNhanChat.create({
    data: { gameId, nguoiId: nguoi.id, noiDung: chu, anh: tam || null },
    select: { id: true },
  });

  // Trả luôn danh sách mới cho người vừa gửi: đỡ một lượt hỏi lại, và câu vừa
  // gõ hiện ra ngay thay vì đợi hết nhịp tám giây.
  return docChat(gameId);
}

/**
 * Gỡ một câu.
 *
 * Quản trị gỡ được câu của bất kỳ ai; người thường chỉ gỡ được câu của CHÍNH
 * MÌNH — và cả hai điều kiện ấy nằm trong `where` của `deleteMany`, không phải
 * trong một câu `if` sau khi đã đọc hàng ra.
 */
export async function xoaChat(id: string): Promise<KetQuaChat> {
  const nguoi = await nguoiHienTai();
  if (!nguoi) return { loi: 'Bạn cần đăng nhập.' };

  const kq = await db.tinNhanChat.deleteMany({
    where: { id, ...(nguoi.vaiTro === 'QUAN_TRI' ? {} : { nguoiId: nguoi.id }) },
  });
  if (kq.count === 0) return { loi: 'Không gỡ được câu này.' };
  return {};
}
