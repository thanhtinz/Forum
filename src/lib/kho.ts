import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/*
 * KHO CỦA CỬA HÀNG — Cloudflare R2, và một lối dự phòng ghi xuống đĩa.
 *
 * Kho này giữ HAI thứ: ảnh (biểu tượng game, ảnh chụp màn hình, ảnh người ta
 * dán vào bài diễn đàn) và TỆP GAME (JAR, APK, EXE…). Đây là trang tải game,
 * nên tệp game mới là món chính; để nó nằm ở máy chủ người khác thì cái nút to
 * nhất trang phụ thuộc vào một người không quen biết.
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

/** Thư mục của lối dự phòng, và địa chỉ phát ảnh ra. */
export const THU_MUC_DIA = join(process.cwd(), 'tai-len');
export const DIA_CHI_DIA = '/api/anh';
/** Tệp game của lối dự phòng đi qua cổng riêng — xem `/api/tep`. */
export const DIA_CHI_TEP = '/api/tep';
/** Thư mục con giữ tệp game trong thùng. */
export const THU_MUC_TEP = 'tep';

/**
 * Ghép một khoá trong kho thành đường dẫn trên đĩa, CHẶN thoát thư mục.
 *
 * Khoá tới thẳng từ địa chỉ nên mang được `..`, mang được chuỗi đã mã hoá.
 * Ghép thẳng là mở cửa cho người ngoài đọc mọi tệp máy chủ đọc được. Chuẩn hoá
 * rồi khẳng định kết quả VẪN nằm trong thư mục tải lên — kiểm đường dẫn cuối
 * cùng chứ không kiểm từng mẩu, vì mẩu nào cũng có cách viết khác để lách.
 */
export function trongKhoDia(khoa: string[]): string | null {
  const duong = normalize(join(THU_MUC_DIA, ...khoa));
  return duong.startsWith(THU_MUC_DIA + '/') ? duong : null;
}

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

/* ──────────────────────────────────────────────────────────────────────────
 * TỆP GAME
 *
 * Khác ảnh ở đúng một chỗ, mà chỗ ấy đổi cả cách viết: tệp game NẶNG. Một bản
 * APK vài trăm megabyte mà đọc hết vào bộ nhớ rồi mới ghi đi thì mỗi lượt tải
 * lên chiếm đúng bấy nhiêu RAM của máy chủ, và hai người cùng bày hàng một lúc
 * là đủ hạ nó. Nên tệp game đi THÀNH DÒNG từ trình duyệt thẳng qua kho, máy
 * chủ chỉ là cái ống.
 *
 * Đi qua ống ấy, ta tiện tay làm luôn hai việc không tốn thêm lượt đọc nào:
 * ĐẾM byte và BĂM sha256. Nhờ vậy dung lượng in trên trang game là dung lượng
 * thật, và mã kiểm tra là mã của đúng tệp đang nằm trong kho — không phải con
 * số người bày hàng gõ tay vào ô nhập.
 * ────────────────────────────────────────────────────────────────────────── */

/** Trần một tệp game. Đủ cho mọi thứ cửa hàng này bán, mà vẫn có trần. */
export const TEP_TOI_DA = 500 * 1024 * 1024;

const KIEU_TEP: Record<string, string> = {
  JAR: 'application/java-archive',
  JAD: 'text/vnd.sun.j2me.app-descriptor',
  APK: 'application/vnd.android.package-archive',
  IPA: 'application/octet-stream',
  ZIP: 'application/zip',
  EXE: 'application/vnd.microsoft.portable-executable',
  DMG: 'application/x-apple-diskimage',
  PKG: 'application/octet-stream',
};

/** Kiểu MIME của một tệp game, để cổng phát tệp khai đúng thứ nó đang đưa. */
export function kieuTep(loai: string): string {
  return KIEU_TEP[loai.toUpperCase()] ?? 'application/octet-stream';
}

/**
 * Ruột tệp có KHỚP với loại người bày hàng chọn không?
 *
 * Vẫn là lẽ của `doanLoaiAnh`: đuôi tệp và nhãn `Content-Type` đều do phía gửi
 * đặt nên bịa được cả hai. Ở đây cái giá của việc tin nhầm còn đắt hơn — người
 * tải sẽ cài thứ ấy lên máy họ.
 *
 * Chỉ soi được những loại có dấu mở đầu cố định:
 *   • JAR, APK, IPA, ZIP đều là kho nén ZIP  → "PK" ở hai byte đầu.
 *   • EXE là tệp thực thi Windows            → "MZ".
 *   • PKG của macOS là kho xar               → "xar!".
 *   • JAD là VĂN BẢN thuần, mỗi dòng một thuộc tính → không byte 0 nào.
 *   • DMG thì KHÔNG soi được: dấu nhận dạng của nó ("koly") nằm ở CUỐI tệp,
 *     mà cuối tệp thì phải nhận hết mới thấy — tới lúc ấy thì đã nhận rồi.
 *     Thà nói thẳng ra đây là chỗ không soi được, còn hơn viết một phép kiểm
 *     giả vờ.
 */
export function hopVoiLoaiTep(byte: Uint8Array, loai: string): boolean {
  const b = byte;
  const co = (...m: number[]) => m.every((x, i) => b[i] === x);

  switch (loai.toUpperCase()) {
    case 'JAR': case 'APK': case 'IPA': case 'ZIP':
      return b.length >= 2 && co(0x50, 0x4b);
    case 'EXE':
      return b.length >= 2 && co(0x4d, 0x5a);
    case 'PKG':
      return b.length >= 4 && co(0x78, 0x61, 0x72, 0x21);
    case 'JAD':
      return b.length > 0 && !b.some((x) => x === 0);
    case 'DMG':
      return true;
    default:
      return false;
  }
}

export interface TepDaLuu {
  /** Địa chỉ công khai để tải về. */
  duongDan: string;
  khoa: string;
  /** Số byte ĐẾM ĐƯỢC khi tệp chảy qua, không phải số phía gửi khai. */
  dungLuong: number;
  /** sha256 của đúng tệp vừa nằm xuống kho. */
  maKiemTra: string;
}

/**
 * Đưa một tệp game vào kho, đếm và băm dọc đường.
 *
 * `dungLuong` là con số trình duyệt khai trong `Content-Length`. Cần nó vì R2
 * đòi biết trước độ dài mới nhận một dòng; nhưng con số ta TRẢ VỀ là con số
 * đếm được, nên khai điêu cũng không ghi được vào cơ sở dữ liệu một dung lượng
 * sai.
 */
export async function luuTepGame(
  dong: ReadableStream<Uint8Array>, duoi: string, dungLuong: number,
): Promise<TepDaLuu> {
  return luuDong(dong, THU_MUC_TEP, duoi.toLowerCase(), kieuTep(duoi), dungLuong, DIA_CHI_TEP);
}

/** Thư mục và địa chỉ của ĐOẠN PHIM XEM TRƯỚC. */
export const THU_MUC_PHIM = 'phim';
export const DIA_CHI_PHIM = '/api/phim';

/**
 * Đưa một đoạn phim xem trước vào kho.
 *
 * Cùng một đường ống với tệp game — đếm byte, băm sha256, chảy thành dòng —
 * chỉ khác thư mục và kiểu MIME. Phim còn nặng hơn tệp game nên chuyện "không
 * gom vào bộ nhớ" ở đây càng đúng.
 */
export async function luuPhim(
  dong: ReadableStream<Uint8Array>, dungLuong: number,
): Promise<TepDaLuu> {
  return luuDong(dong, THU_MUC_PHIM, 'mp4', 'video/mp4', dungLuong, DIA_CHI_PHIM);
}

/**
 * Ruột tệp có phải MP4 không?
 *
 * MP4 không mở đầu bằng một dấu cố định ở byte 0: byte 0-3 là ĐỘ DÀI của khối
 * đầu, rồi mới tới tên khối `ftyp` ở byte 4. Nên phải soi ở byte 4, và đây
 * đúng là chỗ mà một phép kiểm viết vội sẽ trượt.
 */
export function laMP4(byte: Uint8Array): boolean {
  return byte.length >= 12
    && byte[4] === 0x66 && byte[5] === 0x74 && byte[6] === 0x79 && byte[7] === 0x70;
}

/** Ruột chung của mọi phép cất theo DÒNG. Xem `luuTepGame` và `luuPhim`. */
async function luuDong(
  dong: ReadableStream<Uint8Array>,
  thuMuc: string,
  duoi: string,
  kieu: string,
  dungLuong: number,
  diaChiDia: string,
): Promise<TepDaLuu> {
  const ten = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${duoi}`;
  const khoa = `${thuMuc}/${ten}`;

  const bam = createHash('sha256');
  let dem = 0;
  const doDong = new Transform({
    transform(mau, _ma, xong) {
      bam.update(mau);
      dem += mau.length;
      xong(null, mau);
    },
  });

  const nguon = Readable.fromWeb(dong as never).pipe(doDong);

  if (dungR2()) {
    await mayR2().send(new PutObjectCommand({
      Bucket: R2_THUNG,
      Key: khoa,
      Body: nguon,
      ContentLength: dungLuong,
      ContentType: kieu,
      // Tên mang mã ngẫu nhiên nên ruột không bao giờ đổi.
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return { duongDan: `${R2_DIA_CHI}/${khoa}`, khoa, dungLuong: dem, maKiemTra: bam.digest('hex') };
  }

  const goc = join(THU_MUC_DIA, thuMuc);
  await mkdir(goc, { recursive: true });
  await pipeline(nguon, createWriteStream(join(goc, ten)));
  return { duongDan: `${diaChiDia}/${khoa}`, khoa, dungLuong: dem, maKiemTra: bam.digest('hex') };
}

/**
 * Xoá một tệp game theo địa chỉ đang lưu.
 *
 * Nuốt lỗi y như `xoaAnh`, và vì cùng một lẽ: nơi gọi đang gỡ một bản tải, mà
 * một tệp mồ côi nằm lại trong kho thì tiếc chứ không đáng để kéo đổ cả lượt
 * gỡ. Tệp dán địa chỉ ngoài từ thời trước thì không phải của ta, bỏ qua.
 */
export async function xoaTepGame(duongDan: string | null | undefined): Promise<void> {
  const d = (duongDan ?? '').trim();
  if (!d) return;

  try {
    if (dungR2() && d.startsWith(`${R2_DIA_CHI}/`)) {
      await mayR2().send(new DeleteObjectCommand({
        Bucket: R2_THUNG, Key: d.slice(R2_DIA_CHI.length + 1),
      }));
      return;
    }
    if (d.startsWith(`${DIA_CHI_TEP}/`)) {
      const duong = trongKhoDia(d.slice(DIA_CHI_TEP.length + 1).split('/'));
      if (duong) await unlink(duong);
    }
  } catch {
    // Cố ý im lặng — xem chú thích ở trên.
  }
}

/** Gỡ một đoạn phim khỏi kho. Nuốt lỗi y như `xoaTepGame`, cùng một lẽ. */
export async function xoaPhim(duongDan: string | null | undefined): Promise<void> {
  const d = (duongDan ?? '').trim();
  if (!d) return;
  try {
    if (dungR2() && d.startsWith(`${R2_DIA_CHI}/`)) {
      await mayR2().send(new DeleteObjectCommand({
        Bucket: R2_THUNG, Key: d.slice(R2_DIA_CHI.length + 1),
      }));
      return;
    }
    if (d.startsWith(`${DIA_CHI_PHIM}/`)) {
      const duong = trongKhoDia(d.slice(DIA_CHI_PHIM.length + 1).split('/'));
      if (duong) await unlink(duong);
    }
  } catch {
    // Cố ý im lặng — xem chú thích ở `xoaTepGame`.
  }
}

/** Địa chỉ này có trỏ vào kho của chính cửa hàng không? */
export function cuaKhoNha(duongDan: string): boolean {
  const d = duongDan.trim();
  return d.startsWith(`${DIA_CHI_TEP}/`) || d.startsWith(`${DIA_CHI_DIA}/`)
    || (dungR2() && d.startsWith(`${R2_DIA_CHI}/`));
}
