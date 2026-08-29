'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { logAdmin } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { toSlug } from '@/lib/slug';
import { loiTheLoai } from '@/lib/quiz-const';

export interface DuyetState { ok?: boolean; error?: string }

/** Kết quả một lượt lập/sửa thể loại. */
export interface TheLoaiState { ok?: boolean; error?: string }

/**
 * Duyệt hoặc từ chối một câu hỏi trắc nghiệm.
 *
 * Chỉ đổi được trạng thái của câu ĐANG CHỜ: dùng `updateMany` có điều kiện
 * `status: 'PENDING'` chứ không đọc rồi mới ghi — hai quản trị viên mở cùng
 * một hàng chờ là chuyện thường, người bấm sau phải biết mình bấm hụt.
 *
 * KHÔNG hoàn cọc khi từ chối: cọc trừ ngay lúc đăng chính là thứ khiến người
 * ta không thả câu rác. Hoàn lại là mất sạch tác dụng.
 */
async function xetDuyet(id: string, duyet: boolean, ghiChu: string): Promise<DuyetState> {
  const admin = await assertAdmin();

  const cau = await db.quizQuestion.findUnique({
    where: { id },
    select: { id: true, authorId: true, content: true, status: true },
  });
  if (!cau) return { error: 'Không tìm thấy câu hỏi.' };

  const res = await db.quizQuestion.updateMany({
    where: { id, status: 'PENDING' },
    data: {
      status: duyet ? 'APPROVED' : 'REJECTED',
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: duyet ? null : (ghiChu.slice(0, 300) || null),
    },
  });
  if (res.count === 0) return { error: 'Câu này đã được người khác xét duyệt rồi.' };

  await notify({
    userId: cau.authorId,
    type: 'SYSTEM',
    title: duyet ? 'Câu hỏi trắc nghiệm đã được duyệt' : 'Câu hỏi trắc nghiệm bị từ chối',
    content: duyet
      ? cau.content.slice(0, 120)
      : `${cau.content.slice(0, 100)}${ghiChu ? ` — ${ghiChu.slice(0, 150)}` : ''}`,
    // Duyệt rồi thì đi thẳng tới câu hỏi được, đúng như thư "Đi đến câu hỏi"
    // của bản gốc; bị từ chối thì câu chưa có trang nào, về "Câu hỏi của bạn".
    link: duyet ? `/giai-tri/trac-nghiem/cau-hoi/${id}` : '/giai-tri/trac-nghiem/cua-toi',
  });

  await logAdmin({
    actor: admin,
    action: duyet ? 'quiz.approve' : 'quiz.reject',
    targetType: 'quiz',
    targetId: id,
    summary: `${duyet ? 'Duyệt' : 'Từ chối'} câu hỏi trắc nghiệm: ${cau.content.slice(0, 80)}`,
    meta: ghiChu ? { note: ghiChu } : undefined,
  });

  revalidatePath('/admin/quiz');
  revalidatePath('/giai-tri/trac-nghiem');
  revalidatePath(`/giai-tri/trac-nghiem/cau-hoi/${id}`);
  return { ok: true };
}

/** Duyệt câu hỏi — từ lúc này người khác trả lời được. */
export async function duyetCauHoi(id: string): Promise<DuyetState> {
  return xetDuyet(id, true, '');
}

/** Từ chối câu hỏi, kèm lý do để người đăng biết đường sửa lần sau. */
export async function tuChoiCauHoi(id: string, ghiChu: string): Promise<DuyetState> {
  return xetDuyet(id, false, String(ghiChu ?? '').trim());
}

// ─────────────────────────── Thể loại ───────────────────────────

const DUONG_DAN_TL = '/admin/quiz/the-loai';

/**
 * Lập một thể loại mới — bản gốc là `quiz.php?act=add` không kèm id, chỉ Admin
 * tối cao làm được. Ở đây điều hành viên cũng làm được vì họ mới là người trực
 * hàng chờ và biết câu hỏi đang thiếu chỗ nào để xếp.
 *
 * `slug` sinh từ tên nhưng phải DUY NHẤT, nên đụng tên là nối thêm số. Không
 * để lỗi ràng buộc đập vào mặt người dùng chỉ vì hai thể loại tên gần giống.
 */
export async function taoTheLoai(_prev: TheLoaiState, formData: FormData): Promise<TheLoaiState> {
  const admin = await assertAdmin();

  const ten = String(formData.get('ten') ?? '').trim();
  const moTa = String(formData.get('moTa') ?? '').trim();
  const thuTu = Number(formData.get('thuTu') ?? 0) || 0;

  const loi = loiTheLoai(ten, moTa);
  if (loi) return { error: loi };

  const goc = toSlug(ten);
  let slug = goc;
  for (let i = 2; i <= 20; i++) {
    const dung = await db.quizCategory.findUnique({ where: { slug }, select: { id: true } });
    if (!dung) break;
    slug = `${goc}-${i}`;
  }

  const tl = await db.quizCategory.create({
    data: { slug, name: ten, note: moTa || null, order: thuTu },
    select: { id: true },
  });

  await logAdmin({
    actor: admin,
    action: 'quiz.category.create',
    targetType: 'quizCategory',
    targetId: tl.id,
    summary: `Lập thể loại trắc nghiệm: ${ten}`,
  });

  revalidatePath(DUONG_DAN_TL);
  revalidatePath('/giai-tri/trac-nghiem');
  return { ok: true };
}

/** Sửa tên, mô tả, thứ tự của một thể loại. Địa chỉ (`slug`) giữ nguyên. */
export async function suaTheLoai(_prev: TheLoaiState, formData: FormData): Promise<TheLoaiState> {
  const admin = await assertAdmin();

  const id = String(formData.get('id') ?? '').trim();
  const ten = String(formData.get('ten') ?? '').trim();
  const moTa = String(formData.get('moTa') ?? '').trim();
  const thuTu = Number(formData.get('thuTu') ?? 0) || 0;

  const loi = loiTheLoai(ten, moTa);
  if (loi) return { error: loi };

  const res = await db.quizCategory.updateMany({
    where: { id },
    data: { name: ten, note: moTa || null, order: thuTu },
  });
  if (res.count === 0) return { error: 'Không tìm thấy thể loại này.' };

  await logAdmin({
    actor: admin,
    action: 'quiz.category.update',
    targetType: 'quizCategory',
    targetId: id,
    summary: `Sửa thể loại trắc nghiệm: ${ten}`,
  });

  revalidatePath(DUONG_DAN_TL);
  revalidatePath('/giai-tri/trac-nghiem');
  return { ok: true };
}

/**
 * Bỏ một thể loại — CHỈ khi nó chưa có câu hỏi nào.
 *
 * Lược đồ để `categoryId` thành `null` khi thể loại mất, nghĩa là xoá một thể
 * loại đang có câu hỏi sẽ ném cả đống câu ra ngoài mọi thể loại, không ai tìm
 * lại được. Muốn dọn thì chuyển câu đi trước đã.
 */
export async function xoaTheLoai(id: string): Promise<TheLoaiState> {
  const admin = await assertAdmin();

  const tl = await db.quizCategory.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { questions: true } } },
  });
  if (!tl) return { error: 'Không tìm thấy thể loại này.' };
  if (tl._count.questions > 0) {
    return { error: `Thể loại còn ${tl._count.questions} câu hỏi, chuyển hết đi rồi mới bỏ được.` };
  }

  await db.quizCategory.delete({ where: { id } });

  await logAdmin({
    actor: admin,
    action: 'quiz.category.delete',
    targetType: 'quizCategory',
    targetId: id,
    summary: `Bỏ thể loại trắc nghiệm: ${tl.name}`,
  });

  revalidatePath(DUONG_DAN_TL);
  revalidatePath('/giai-tri/trac-nghiem');
  return { ok: true };
}
