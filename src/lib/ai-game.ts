import 'server-only';
import { hoiCoCauTruc } from './ai';

/**
 * Hai bước tra cứu game bằng AI: TÌM rồi mới SOẠN.
 *
 * Tách hai bước vì giữa chúng có một người thật quyết định. Gộp một bước thì
 * model tự chọn lấy "game nào đó tên na ná" rồi viết một trang mô tả trôi
 * chảy về nhầm game — mà mô tả càng trôi chảy thì càng khó phát hiện. Bắt
 * admin chỉ đúng bản mình muốn trước, rồi mới soạn, thì cái sai lộ ra ở chỗ
 * rẻ nhất: một danh sách ngắn có năm phát hành và nhà phát triển.
 */

export interface UngVienGame {
  title: string;
  series: string | null;
  developer: string | null;
  publisher: string | null;
  releaseYear: number | null;
  platform: string | null;
  tomTat: string;
  nguon: string | null;
}

export interface ChiTietGame {
  titleVi: string | null;
  series: string | null;
  developer: string | null;
  publisher: string | null;
  releaseYear: number | null;
  description: string;
  gameplay: string;
  controls: { key: string; action: string }[];
  compatibilityNote: string | null;
  knownIssues: string | null;
  anhGoiY: { url: string; moTa: string }[];
}

const HE = `Bạn giúp quản trị viên một diễn đàn game Việt Nam nhập dữ liệu game cũ
(NES, SNES, GBA, PS1, game Java điện thoại…).

Luật:
- Chỉ dùng thông tin TRA CỨU ĐƯỢC. Không chắc thì để trống trường đó, tuyệt
  đối không đoán. Một trường trống thì quản trị viên tự điền; một trường bịa
  thì không ai biết mà sửa.
- Viết bằng tiếng Việt, giọng bình thường, không quảng cáo, không "tuyệt vời",
  không "đỉnh cao".
- Không bịa địa chỉ ảnh. Chỉ đưa địa chỉ ảnh bạn thật sự thấy trong kết quả
  tìm kiếm.`;

/** Bước 1: tìm các bản game khớp với tên admin gõ. */
export async function timUngVienGame(ten: string): Promise<{ ungVien: UngVienGame[] }> {
  return hoiCoCauTruc({
    he: HE,
    nhac: `Tìm các game khớp với tên "${ten}". Có thể có nhiều bản trên nhiều
hệ máy, hoặc nhiều game trùng tên — liệt kê tối đa 6 ứng viên khác nhau, bản
nào nổi tiếng nhất để trước. Mỗi ứng viên tóm tắt một câu để phân biệt.`,
    timWeb: true,
    tenCongCu: 'tra_ket_qua',
    moTaCongCu: 'Trả về danh sách game tìm được',
    luocDo: {
      type: 'object',
      properties: {
        ungVien: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Tên chính thức' },
              series: { type: ['string', 'null'] },
              developer: { type: ['string', 'null'] },
              publisher: { type: ['string', 'null'] },
              releaseYear: { type: ['integer', 'null'] },
              platform: { type: ['string', 'null'], description: 'Hệ máy, ví dụ NES, GBA, Java' },
              tomTat: { type: 'string', description: 'Một câu phân biệt bản này với bản khác' },
              nguon: { type: ['string', 'null'], description: 'Địa chỉ trang đã tra' },
            },
            required: ['title', 'tomTat'],
          },
        },
      },
      required: ['ungVien'],
    },
  });
}

/** Bước 2: soạn nội dung đầy đủ cho đúng bản admin đã chọn. */
export async function soanChiTietGame(v: UngVienGame): Promise<ChiTietGame> {
  const nhan = [v.title, v.platform, v.releaseYear].filter(Boolean).join(' · ');
  return hoiCoCauTruc({
    he: HE,
    nhac: `Soạn dữ liệu cho game: ${nhan}.
${v.developer ? `Nhà phát triển: ${v.developer}.` : ''}
${v.tomTat}

Cần:
- description: 2–4 đoạn giới thiệu, mỗi đoạn 2–3 câu.
- gameplay: mô tả lối chơi, 1–2 đoạn.
- controls: bảng phím điều khiển của bản gốc, mỗi dòng một phím và việc nó làm.
  Không tra được thì trả mảng rỗng.
- compatibilityNote: lưu ý khi chạy giả lập, nếu có.
- knownIssues: lỗi đã biết, nếu có.
- anhGoiY: tối đa 4 địa chỉ ảnh (ảnh bìa, ảnh chụp màn hình) THẤY ĐƯỢC trong
  kết quả tìm kiếm, kèm mô tả ngắn mỗi ảnh.`,
    timWeb: true,
    toiDaTu: 6000,
    tenCongCu: 'tra_chi_tiet',
    moTaCongCu: 'Trả về nội dung đã soạn cho game',
    luocDo: {
      type: 'object',
      properties: {
        titleVi: { type: ['string', 'null'] },
        series: { type: ['string', 'null'] },
        developer: { type: ['string', 'null'] },
        publisher: { type: ['string', 'null'] },
        releaseYear: { type: ['integer', 'null'] },
        description: { type: 'string' },
        gameplay: { type: 'string' },
        controls: {
          type: 'array',
          items: {
            type: 'object',
            properties: { key: { type: 'string' }, action: { type: 'string' } },
            required: ['key', 'action'],
          },
        },
        compatibilityNote: { type: ['string', 'null'] },
        knownIssues: { type: ['string', 'null'] },
        anhGoiY: {
          type: 'array',
          items: {
            type: 'object',
            properties: { url: { type: 'string' }, moTa: { type: 'string' } },
            required: ['url', 'moTa'],
          },
        },
      },
      required: ['description', 'gameplay', 'controls', 'anhGoiY'],
    },
  });
}
