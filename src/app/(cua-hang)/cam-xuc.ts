'use server';

import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { conDuocTimGif, ghiLanTimGif } from '@/lib/chan-do-mat-khau';
import { docAnhDong } from '@/lib/cai-dat';
import { GIF_MOI_LAN } from '@/lib/cam-xuc-const';

export interface GoiStickerXem {
  id: string;
  ten: string;
  hinh: { id: string; anh: string }[];
}

export interface AnhDongXem { id: string; anh: string; moTa: string }

/**
 * Đọc mọi gói sticker đang có.
 *
 * KHÔNG nhét sẵn vào mỗi trang có ô soạn bài: bảng sticker có thể nặng vài
 * chục địa chỉ, mà phần lớn người viết bài chẳng bao giờ mở tab ấy ra. Gọi
 * lúc người ta bấm vào tab thì trang nào cũng nhẹ, và bảng luôn mới.
 */
export async function docSticker(): Promise<GoiStickerXem[]> {
  const goi = await db.goiSticker.findMany({
    orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
    select: {
      id: true, ten: true,
      sticker: { orderBy: [{ thuTu: 'asc' }, { id: 'asc' }], select: { id: true, anh: true } },
    },
  });
  // Gói rỗng thì không bày: một cái tab mở ra chỉ có mỗi cái tên gói và khoảng
  // trắng bên dưới trông như hỏng.
  return goi.filter((g) => g.sticker.length > 0)
    .map((g) => ({ id: g.id, ten: g.ten, hinh: g.sticker }));
}

/**
 * Tìm ảnh động qua dịch vụ ngoài.
 *
 * KHOÁ API KHÔNG BAO GIỜ RA TỚI TRÌNH DUYỆT. Hàm này chạy ở máy chủ, đọc khoá
 * từ cấu hình rồi tự đi hỏi; trình duyệt chỉ gửi lên một từ khoá và nhận về
 * mấy địa chỉ ảnh. Để trình duyệt tự gọi thẳng dịch vụ kia thì khoá nằm trong
 * mã trang, ai mở xem nguồn cũng lấy được — và hoá đơn là của cửa hàng.
 *
 * Chưa cấu hình thì NÓI THẲNG ra là chưa cấu hình, không trả danh sách rỗng:
 * rỗng trông y như "không tìm thấy gì", và người quản trị sẽ đi sửa nhầm chỗ.
 */
export async function timGif(tuKhoa: string): Promise<{ loi?: string; anh?: AnhDongXem[] }> {
  /*
   * PHẢI ĐĂNG NHẬP, và có cửa chặn đếm lượt.
   *
   * Khác mọi hàm đọc khác trong tệp này: mỗi lượt gọi ở đây tiêu một lượt
   * trong hạn ngạch của khoá trả tiền mà cửa hàng gắn. Bỏ ngỏ thì đây là hàm
   * tốn tiền nhất cửa hàng có, mà lại là hàm dễ gọi nhất — một địa chỉ POST
   * công khai, không cần tài khoản, gọi bao nhiêu lượt cũng được.
   *
   * Và chỉ người đăng nhập mới gửi được ảnh động đi (ô chat lẫn ô soạn bài đều
   * đòi đăng nhập), nên cửa này không chặn mất ai đang dùng thật.
   */
  const nguoi = await nguoiHienTai();
  if (!nguoi) return { loi: 'Bạn cần đăng nhập để tìm ảnh động.' };

  const cua = await conDuocTimGif(nguoi.id);
  if (cua.chan) {
    return { loi: `Bạn vừa tìm khá nhiều. Thử lại sau ${cua.conPhut} phút.` };
  }

  const cau = await docAnhDong();
  if (!cau.khoaApi) {
    return { loi: 'Cửa hàng chưa gắn khoá dịch vụ ảnh động. Nhờ ban quản trị bật giúp.' };
  }

  const tu = tuKhoa.trim().slice(0, 60);
  const dia = cau.nhaCungCap === 'giphy'
    ? (tu
      ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(cau.khoaApi)}&q=${encodeURIComponent(tu)}&limit=${GIF_MOI_LAN}&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(cau.khoaApi)}&limit=${GIF_MOI_LAN}&rating=pg-13`)
    : (tu
      ? `https://tenor.googleapis.com/v2/search?key=${encodeURIComponent(cau.khoaApi)}&q=${encodeURIComponent(tu)}&limit=${GIF_MOI_LAN}&contentfilter=medium`
      : `https://tenor.googleapis.com/v2/featured?key=${encodeURIComponent(cau.khoaApi)}&limit=${GIF_MOI_LAN}&contentfilter=medium`);

  await ghiLanTimGif(nguoi.id);

  try {
    /*
     * CÓ HẠN GIỜ, và hạn ngắn.
     *
     * Đây là lượt gọi ra một máy chủ của người khác, nằm ngay giữa một cú bấm
     * của người dùng. Không đặt hạn thì một hôm dịch vụ kia chậm là ô tìm ảnh
     * động treo cứng, và mỗi lượt treo giữ một tiến trình của cửa hàng.
     */
    const bo = AbortSignal.timeout(6000);
    const tl = await fetch(dia, { signal: bo, cache: 'no-store' });
    if (!tl.ok) return { loi: 'Dịch vụ ảnh động không trả lời. Thử lại sau nhé.' };
    const du = await tl.json();

    const anh: AnhDongXem[] = cau.nhaCungCap === 'giphy'
      ? (du?.data ?? []).map((x: Record<string, never>) => ({
        id: String(x?.id ?? ''),
        anh: String((x?.images as Record<string, Record<string, string>> | undefined)
          ?.fixed_height?.url ?? ''),
        moTa: String(x?.title ?? 'ảnh động'),
      }))
      : (du?.results ?? []).map((x: Record<string, never>) => ({
        id: String(x?.id ?? ''),
        anh: String((x?.media_formats as Record<string, Record<string, string>> | undefined)
          ?.tinygif?.url ?? ''),
        moTa: String(x?.content_description ?? 'ảnh động'),
      }));

    // Lọc lại ở đây chứ không tin phía kia: thiếu địa chỉ thì thành một ô trống
    // trong lưới, bấm vào gửi đi một câu không có ảnh.
    return { anh: anh.filter((x) => x.id && x.anh.startsWith('https://')) };
  } catch {
    return { loi: 'Không hỏi được dịch vụ ảnh động lúc này.' };
  }
}
