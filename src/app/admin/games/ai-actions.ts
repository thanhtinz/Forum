'use server';

import { revalidatePath } from 'next/cache';
import { assertSuperAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { LoiAiError, ThieuKhoaAiError, coAi } from '@/lib/ai';
import { soanChiTietGame, timUngVienGame, type ChiTietGame, type UngVienGame } from '@/lib/ai-game';
import { AnhKhongHopLeError, taiAnhVeKho } from '@/lib/tai-anh';

/**
 * Trợ lý AI cho trang đăng game.
 *
 * Cả bốn hàm dưới đây là endpoint POST công khai, nên cả bốn đều tự gọi
 * `assertSuperAdmin` — không hàm nào được tin là "trang gọi nó đã kiểm rồi".
 * Riêng ở đây điều đó còn quan trọng hơn chỗ khác: mỗi lượt gọi tốn tiền thật
 * của khoá API, và hàm tải ảnh thì sai một nhịp là biến máy chủ thành công cụ
 * dò mạng nội bộ hộ người lạ.
 */

export interface AiTimState {
  error?: string;
  ten?: string;
  ungVien?: UngVienGame[];
}

export interface AiSoanState {
  error?: string;
  chiTiet?: ChiTietGame;
  ungVien?: UngVienGame;
}

export interface AiAnhState {
  error?: string;
  url?: string;
}

/** Lỗi nào cũng phải ra một câu người đọc hiểu, không ném stack ra giao diện. */
function keLoi(e: unknown): string {
  if (e instanceof ThieuKhoaAiError) return e.message;
  if (e instanceof LoiAiError) return e.message;
  if (e instanceof AnhKhongHopLeError) return e.message;
  console.error('[ai-game]', e);
  return 'Trợ lý AI gặp trục trặc, thử lại nhé.';
}

/** Đã cắm khoá chưa — giao diện hỏi để quyết định có bày nút AI không. */
export async function aiSanSang(): Promise<boolean> {
  await assertSuperAdmin();
  return coAi();
}

/** Bước 1 — nhập tên game, AI đi tra và trả về danh sách ứng viên. */
export async function aiTimGame(_prev: AiTimState, fd: FormData): Promise<AiTimState> {
  await assertSuperAdmin();

  const ten = String(fd.get('ten') ?? '').trim();
  if (!ten) return { error: 'Nhập tên game đã nào.' };
  if (ten.length > 120) return { error: 'Tên game dài quá.' };

  try {
    const { ungVien } = await timUngVienGame(ten);
    if (!ungVien?.length) return { ten, error: 'Không tra được game nào khớp tên này.' };
    return { ten, ungVien: ungVien.slice(0, 6) };
  } catch (e) {
    return { ten, error: keLoi(e) };
  }
}

/** Bước 2 — admin đã chọn đúng bản, AI soạn nội dung đầy đủ. */
export async function aiSoanGame(_prev: AiSoanState, fd: FormData): Promise<AiSoanState> {
  await assertSuperAdmin();

  const tho = String(fd.get('ung_vien') ?? '');
  let v: UngVienGame;
  try {
    v = JSON.parse(tho) as UngVienGame;
  } catch {
    return { error: 'Thiếu thông tin bản game đã chọn.' };
  }
  if (!v?.title) return { error: 'Bản game đã chọn không có tên.' };

  try {
    return { ungVien: v, chiTiet: await soanChiTietGame(v) };
  } catch (e) {
    return { ungVien: v, error: keLoi(e) };
  }
}

/**
 * Bước 3 — admin duyệt một ảnh, MÁY CHỦ tải về kho của mình.
 *
 * Không lưu thẳng địa chỉ ngoài: ảnh nằm trên máy chủ người khác thì họ đổi
 * hay xoá là trang mình vỡ ảnh, mà mỗi lượt xem trang lại là một lượt mình
 * gửi người xem sang chỗ khác.
 */
export async function aiTaiAnh(_prev: AiAnhState, fd: FormData): Promise<AiAnhState> {
  await assertSuperAdmin();

  const dia = String(fd.get('url') ?? '').trim();
  if (!dia) return { error: 'Thiếu địa chỉ ảnh.' };

  try {
    return { url: await taiAnhVeKho(dia) };
  } catch (e) {
    return { error: keLoi(e) };
  }
}

/** Ghi nội dung AI đã soạn (và admin đã duyệt) vào một game có sẵn. */
export async function aiApVaoGame(_prev: { error?: string; ok?: boolean }, fd: FormData) {
  await assertSuperAdmin();

  const id = String(fd.get('id') ?? '').trim();
  if (!id) return { error: 'Thiếu id game.' };

  const chu = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  const so = (k: string) => {
    const v = chu(k);
    if (!v) return null;
    const n = Number(v);
    return Number.isInteger(n) && n > 1900 && n < 2200 ? n : null;
  };

  let controls: { key: string; action: string }[] | null = null;
  const thoControls = chu('controls');
  if (thoControls) {
    try {
      const ds = JSON.parse(thoControls) as unknown;
      // Lọc lại từng dòng chứ không tin nguyên khối: chuỗi này đi qua trình
      // duyệt nên người lạ sửa được, mà nó đổ thẳng vào cột Json.
      if (Array.isArray(ds)) {
        controls = ds
          .filter((d): d is { key: string; action: string } =>
            !!d && typeof d === 'object'
            && typeof (d as { key?: unknown }).key === 'string'
            && typeof (d as { action?: unknown }).action === 'string')
          .slice(0, 40)
          .map((d) => ({ key: d.key.slice(0, 60), action: d.action.slice(0, 200) }));
      }
    } catch {
      return { error: 'Bảng phím không đọc được.' };
    }
  }

  await db.game.update({
    where: { id },
    data: {
      titleVi: chu('titleVi'),
      series: chu('series'),
      developer: chu('developer'),
      publisher: chu('publisher'),
      releaseYear: so('releaseYear'),
      description: chu('description'),
      gameplay: chu('gameplay'),
      compatibilityNote: chu('compatibilityNote'),
      knownIssues: chu('knownIssues'),
      ...(controls ? { controls } : {}),
      ...(chu('icon') ? { icon: chu('icon') } : {}),
      ...(chu('cover') ? { cover: chu('cover') } : {}),
    },
  });

  revalidatePath(`/admin/games/${id}`);
  return { ok: true };
}
