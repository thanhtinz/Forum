import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/*
 * KHO ẢNH — Cloudflare R2, và một lối dự phòng ghi xuống đĩa.
 *
 * VÌ SAO TỰ TẢI LÊN CHỨ KHÔNG DÁN ĐỊA CHỈ: trước đây mọi ảnh (biểu tượng game,
 * ảnh chụp màn hình) đều là một ô nhập địa chỉ. Ba chỗ hỏng, và cả ba đều xảy
 * ra thật ở mấy kho game cũ: ảnh nằm ở máy chủ người khác nên hôm nào họ xoá
 * là cả trang thủng lỗ; người nhập phải tự đi tìm chỗ đặt ảnh trước đã; và
 * chẳng có gì ngăn một địa chỉ trỏ tới thứ không phải ảnh.
 *
 * HAI LỐI LƯU, CÙNG MỘT GIAO DIỆN:
 *
 *   • R2 khi có đủ biến môi trường. R2 nói giao thức S3 nên dùng thẳng bộ ký
 *     của AWS; chỉ khác cái `endpoint` và `region: 'auto'`.
 *   • Ghi xuống thư mục `tai-len/` khi chưa cấu hình. Nhờ vậy máy của người
 *     phát triển và bộ kiểm chạy qua ĐÚNG luồng ấy — kiểm phần soi ruột tệp,
 *     phần đặt tên, phần xoá — mà không cần tài khoản R2 nào.
 *
 * THƯ MỤC ẤY NẰM NGOÀI `public/`, và tệp phát qua `/api/anh/…`. Lý do đã thử
 * bằng tay rồi mới biết: `next start` chỉ phục vụ những gì có trong `public/`
 * LÚC DỰNG, nên ảnh ghi vào đó sau khi máy chủ chạy đều trả về 404 — lối dự
 * phòng hoá ra không phòng được gì, mà lỗi chỉ lộ ra đúng lúc có người tải ảnh.
 *
 * Lối dự phòng KHÔNG dùng được khi chạy thật trên máy chủ chỉ đọc hoặc nhiều
 * tiến trình; `caiDatKho()` nói rõ đang chạy lối nào để trang quản trị bày ra.
 */

const R2_TAI_KHOAN = process.env.R2_TAI_KHOAN ?? '';
const R2_KHOA = process.env.R2_KHOA ?? '';
const R2_BI_MAT = process.env.R2_BI_MAT ?? '';
const R2_THUNG = process.env.R2_THUNG ?? '';
/** Địa chỉ công khai của thùng, ví dụ `https://anh.sunnystore.vn`. */
const R2_DIA_CHI = (process.env.R2_DIA_CHI ?? '').replace(/\/+$/, '');

export function dungR2(): boolean {
  return !!(R2_TAI_KHOAN && R2_KHOA && R2_BI_MAT && R2_THUNG && R2_DIA_CHI);
}

export function caiDatKho(): { loai: 'r2' | 'dia'; thieu: string[] } {
  const can = { R2_TAI_KHOAN, R2_KHOA, R2_BI_MAT, R2_THUNG, R2_DIA_CHI };
  const thieu = Object.entries(can).filter(([, v]) => !v).map(([k]) => k);
  return { loai: dungR2() ? 'r2' : 'dia', thieu };
}

/** Thư mục của lối dự phòng, và địa chỉ phát tệp ra. */
export const THU_MUC_DIA = join(process.cwd(), 'tai-len');
export const DIA_CHI_DIA = '/api/anh';

let may: S3Client | null = null;
function mayR2(): S3Client {
  may ??= new S3Client({
    region: 'auto',
    endpoint: `https://${R2_TAI_KHOAN}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_KHOA, secretAccessKey: R2_BI_MAT },
  });
  return may;
}

/* ──────────────────────────────────────────────────────────────────────────
 * KIỂM TỆP — NHÌN VÀO RUỘT, KHÔNG TIN CÁI NHÃN
 *
 * `Content-Type` và đuôi tệp đều do phía gửi đặt, nên cả hai đều bịa được.
 * Cách duy nhất chắc chắn là đọc mấy byte đầu: mỗi định dạng ảnh có một dãy
 * byte mở đầu cố định. Một tệp `.png` thật ra là kịch bản shell sẽ trượt ngay
 * ở đây, dù nhãn của nó ghi `image/png`.
 * ────────────────────────────────────────────────────────────────────────── */

export type LoaiAnh = 'png' | 'jpg' | 'gif' | 'webp';

const KIEU_MIME: Record<LoaiAnh, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

/** Đọc dãy byte mở đầu, trả về loại ảnh — `null` nếu không phải ảnh nào cả. */
export function doanLoaiAnh(byte: Uint8Array): LoaiAnh | null {
  const b = byte;
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
  // WebP: "RIFF" ở byte 0-3 và "WEBP" ở byte 8-11.
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return null;
}

export interface AnhDaLuu {
  /** Địa chỉ công khai để đặt vào thẻ `<img>`. */
  duongDan: string;
  /** Khoá trong kho — giữ lại để còn xoá được. */
  khoa: string;
}

/**
 * Lưu một ảnh và trả về địa chỉ công khai.
 *
 * TÊN TỆP DO TA ĐẶT, không lấy tên người gửi: tên người gửi mang được dấu
 * chấm, dấu gạch chéo, ký tự lạ, và trùng nhau — đủ cả bốn đường để ghi đè lên
 * ảnh của người khác hoặc thoát ra khỏi thư mục.
 */
export async function luuAnh(ruot: Uint8Array, thuMuc: string, loai: LoaiAnh): Promise<AnhDaLuu> {
  const ten = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${loai}`;
  const khoa = `${thuMuc}/${ten}`;

  if (dungR2()) {
    await mayR2().send(new PutObjectCommand({
      Bucket: R2_THUNG,
      Key: khoa,
      Body: ruot,
      ContentType: KIEU_MIME[loai],
      // Ảnh không bao giờ đổi ruột (tên tệp mang mã ngẫu nhiên), nên cho phép
      // giữ bản sao rất lâu — đỡ hẳn một lượt gọi mạng cho người xem lại trang.
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return { duongDan: `${R2_DIA_CHI}/${khoa}`, khoa };
  }

  const goc = join(THU_MUC_DIA, thuMuc);
  await mkdir(goc, { recursive: true });
  await writeFile(join(goc, ten), ruot);
  return { duongDan: `${DIA_CHI_DIA}/${khoa}`, khoa };
}

/**
 * Xoá một ảnh theo ĐỊA CHỈ đang lưu trong CSDL.
 *
 * Nuốt mọi lỗi: nơi gọi đang xoá một game hoặc một ảnh chụp, và mất một tệp
 * mồ côi trong kho thì tiếc chứ để nó kéo đổ cả lượt xoá thì tệ hơn. Ảnh
 * không phải của kho ta (địa chỉ ngoài, lưu từ hồi còn dán link) thì bỏ qua.
 */
export async function xoaAnh(duongDan: string | null | undefined): Promise<void> {
  const d = (duongDan ?? '').trim();
  if (!d) return;

  try {
    if (dungR2() && d.startsWith(`${R2_DIA_CHI}/`)) {
      await mayR2().send(new DeleteObjectCommand({
        Bucket: R2_THUNG, Key: d.slice(R2_DIA_CHI.length + 1),
      }));
      return;
    }
    if (d.startsWith(`${DIA_CHI_DIA}/`)) {
      // Chặn `..` trước khi ghép đường dẫn: một hàng trong CSDL có thể tới từ
      // nơi khác, và ghép thẳng thì xoá được tệp ngoài thư mục tải lên.
      const khoa = d.slice(DIA_CHI_DIA.length + 1);
      if (khoa.includes('..')) return;
      await unlink(join(THU_MUC_DIA, khoa));
    }
  } catch {
    // Cố ý im lặng — xem chú thích ở trên.
  }
}
