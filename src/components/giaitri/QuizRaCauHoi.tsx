'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { dangCauHoi, type RaCauState } from '@/app/(site)/giai-tri/trac-nghiem/actions';
import {
  QUIZ_COC_MAX, QUIZ_COC_MIN, QUIZ_GIAI_THICH_MAX, QUIZ_NHAN, QUIZ_NOI_DUNG_MAX,
  QUIZ_PHUONG_AN_MAX, QUIZ_SO_PHUONG_AN,
} from '@/lib/quiz-const';
import { cn } from '@/lib/utils';

/**
 * Biểu mẫu ra câu hỏi mới: bốn phương án, chọn một đáp án đúng, đặt cọc.
 *
 * Câu hỏi luôn đăng VÀO một thể loại — `categoryId` đi kèm cố định theo trang
 * thể loại đang mở, đúng như bản gốc (`quiz.php?act=add&id=<thể loại>`), chứ
 * không có ô chọn thể loại rời để người ta chọn nhầm.
 */
export function QuizRaCauHoi({ categoryId, tenTheLoai, slugTheLoai }: {
  categoryId: string;
  tenTheLoai: string;
  slugTheLoai: string;
}) {
  const [state, action, dangChay] = useActionState<RaCauState, FormData>(dangCauHoi, {});
  const [dapAn, setDapAn] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Gửi xong thì dọn ô nhập, chứ để nguyên là người ta tưởng chưa gửi được và
  // bấm lần nữa — mất thêm một lần cọc cho đúng câu hỏi ấy.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDapAn(0);
    }
  }, [state]);

  return (
    <ActionForm ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="categoryId" value={categoryId} />

      <p className="rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-500 dark:bg-ink-800/50">
        Đăng vào thể loại <b className="text-ink-700 dark:text-ink-200">{tenTheLoai}</b>. Câu hỏi viết
        tiếng Việt có dấu, ngắn gọn, đáp án phải chính xác; đăng sai thể loại có thể bị loại bỏ.
      </p>

      <label className="block">
        <span className="label">Câu hỏi</span>
        <textarea name="noiDung" rows={3} maxLength={QUIZ_NOI_DUNG_MAX} required
          placeholder="Hỏi thứ gì đó có đáp án rõ ràng, đừng đánh đố vô lý."
          className="input" />
      </label>

      <fieldset>
        <legend className="label mb-2">
          Bốn phương án — bấm chấm tròn để đánh dấu đáp án đúng
        </legend>
        <div className="space-y-2">
          {Array.from({ length: QUIZ_SO_PHUONG_AN }, (_, i) => (
            <div key={i} className={cn(
              'flex items-center gap-2 rounded-xl border-2 px-2 py-1.5 transition-colors',
              dapAn === i
                ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30'
                : 'border-ink-200 dark:border-ink-700',
            )}>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
                <input type="radio" name="dapAn" value={i} checked={dapAn === i}
                  onChange={() => setDapAn(i)} className="h-4 w-4 accent-emerald-500" />
                <b className="text-sm text-ink-500">{QUIZ_NHAN[i]}</b>
              </label>
              <input name={`phuongAn${i}`} required maxLength={QUIZ_PHUONG_AN_MAX}
                placeholder={`Phương án ${QUIZ_NHAN[i]}`}
                className="input !border-0 !bg-transparent !py-1 !shadow-none" />
            </div>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label">Giải thích (không bắt buộc)</span>
        <textarea name="giaiThich" rows={2} maxLength={QUIZ_GIAI_THICH_MAX}
          placeholder="Hiện ra sau khi người ta trả lời xong."
          className="input" />
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Đặt cọc (điểm)</span>
          <input name="coc" type="number" min={QUIZ_COC_MIN} max={QUIZ_COC_MAX}
            defaultValue={QUIZ_COC_MIN} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang gửi…' : 'Đăng câu hỏi'}
        </button>
        <span className="retro-sub text-ink-400">
          Trừ cọc ngay, bị từ chối cũng không hoàn
        </span>
      </div>

      {state.ke && (
        <p className="text-sm font-medium text-emerald-600">
          {state.ke}{' '}
          <Link href={`/giai-tri/trac-nghiem/the-loai/${slugTheLoai}`} className="underline">
            Về thể loại
          </Link>
        </p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </ActionForm>
  );
}
