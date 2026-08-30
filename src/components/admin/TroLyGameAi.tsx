'use client';

import { useActionState, useState, useTransition } from 'react';
import { Check, Download, Loader2, Search, Sparkles } from 'lucide-react';
import {
  aiApVaoGame, aiSoanGame, aiTaiAnh, aiTimGame,
  type AiSoanState, type AiTimState,
} from '@/app/admin/games/ai-actions';
import type { UngVienGame } from '@/lib/ai-game';
import { cn } from '@/lib/utils';

/**
 * Trợ lý AI cho trang đăng game: gõ tên → AI tra → admin chọn đúng bản →
 * AI soạn → admin duyệt từng phần rồi mới ghi.
 *
 * Ba bước tách rời chứ không một nút "AI làm hết", vì mỗi bước có một câu hỏi
 * khác nhau mà chỉ người mới trả lời được: bản nào đúng, chữ đã ổn chưa, ảnh
 * nào lấy. Gộp lại thì admin chỉ còn hai lựa chọn: nhận tất, hoặc bỏ tất.
 *
 * Không có bước nào tự ghi vào cơ sở dữ liệu. Ghi chỉ xảy ra ở nút cuối cùng,
 * sau khi admin đã đọc — AI tra sai một năm phát hành thì đó là chuyện thường,
 * mà tự ghi thì không ai kịp thấy.
 */

export function TroLyGameAi({ gameId, coKhoa }: { gameId: string; coKhoa: boolean }) {
  const [tim, timAction, dangTim] = useActionState<AiTimState, FormData>(aiTimGame, {});
  const [soan, soanAction, dangSoan] = useActionState<AiSoanState, FormData>(aiSoanGame, {});
  const [chon, setChon] = useState<UngVienGame | null>(null);

  if (!coKhoa) {
    return (
      <div className="card border-dashed p-4 text-sm text-ink-500">
        <p className="mb-1 flex items-center gap-1.5 font-bold text-ink-600 dark:text-ink-300">
          <Sparkles size={15} /> Trợ lý AI chưa bật
        </p>
        <p>
          Đặt <code className="rounded bg-ink-100 px-1 dark:bg-ink-800">ANTHROPIC_API_KEY</code> trong
          tệp <code className="rounded bg-ink-100 px-1 dark:bg-ink-800">.env</code> rồi khởi động lại
          máy chủ là dùng được.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Bước 1: gõ tên, AI tra ── */}
      <form action={timAction} className="card p-4">
        <h2 className="zib-title mb-1 flex items-center gap-1.5"><Sparkles size={16} /> Nhờ AI tra cứu</h2>
        <p className="retro-sub mb-3 text-ink-400">
          Gõ tên game, AI đi tìm rồi bày ra các bản khớp để bạn chọn đúng bản mình muốn.
        </p>
        <div className="flex gap-2">
          <input name="ten" required maxLength={120} defaultValue={tim.ten}
            className="input flex-1" placeholder="Contra 4" aria-label="Tên game cần tra" />
          <button type="submit" disabled={dangTim} className="btn-primary shrink-0 gap-1.5">
            {dangTim ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Tra
          </button>
        </div>
        {tim.error && <p className="mt-2 text-sm text-red-600">{tim.error}</p>}
      </form>

      {/* ── Bước 2: chọn đúng bản ── */}
      {tim.ungVien && tim.ungVien.length > 0 && (
        <div className="card p-4">
          <h2 className="zib-title mb-1">Chọn đúng bản</h2>
          <p className="retro-sub mb-3 text-ink-400">
            Nhiều game trùng tên hoặc có nhiều bản trên nhiều hệ máy. Chọn sai ở đây thì
            mọi thứ AI soạn sau đó đều nói về game khác.
          </p>
          <ul className="space-y-2">
            {tim.ungVien.map((v, i) => (
              <li key={`${v.title}-${i}`}>
                <button type="button" onClick={() => setChon(v)}
                  aria-pressed={chon === v}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    chon === v
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                      : 'border-[var(--nova-border)] hover:border-brand-400',
                  )}>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
                    {v.title}
                    {v.platform && <span className="chip !py-0 text-[11px]">{v.platform}</span>}
                    {v.releaseYear && <span className="retro-sub text-ink-400">{v.releaseYear}</span>}
                  </p>
                  <p className="retro-sub mt-0.5 text-ink-500 dark:text-ink-300">{v.tomTat}</p>
                  {(v.developer || v.publisher) && (
                    <p className="retro-sub mt-0.5 text-ink-400">
                      {[v.developer, v.publisher].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {chon && (
            <form action={soanAction} className="mt-3">
              <input type="hidden" name="ung_vien" value={JSON.stringify(chon)} />
              <button type="submit" disabled={dangSoan} className="btn-primary w-full gap-1.5">
                {dangSoan ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Xác nhận bản này, nhờ AI soạn nội dung
              </button>
            </form>
          )}
          {soan.error && <p className="mt-2 text-sm text-red-600">{soan.error}</p>}
        </div>
      )}

      {/* ── Bước 3: duyệt nội dung rồi mới ghi ── */}
      {soan.chiTiet && <DuyetNoiDung gameId={gameId} chiTiet={soan.chiTiet} />}
    </div>
  );
}

function DuyetNoiDung({ gameId, chiTiet }: {
  gameId: string;
  chiTiet: NonNullable<AiSoanState['chiTiet']>;
}) {
  const [luu, luuAction, dangLuu] = useActionState<{ error?: string; ok?: boolean }, FormData>(
    aiApVaoGame, {},
  );
  // Ảnh đã tải về kho: `null` là chưa tải, chuỗi là đường dẫn nội bộ.
  const [anhKho, setAnhKho] = useState<Record<number, string>>({});
  const [anhLoi, setAnhLoi] = useState<Record<number, string>>({});
  const [icon, setIcon] = useState('');
  const [cover, setCover] = useState('');
  const [dangTai, batDau] = useTransition();

  const tai = (i: number, url: string) => batDau(async () => {
    const fd = new FormData();
    fd.set('url', url);
    const kq = await aiTaiAnh({}, fd);
    if (kq.url) setAnhKho((c) => ({ ...c, [i]: kq.url! }));
    else setAnhLoi((c) => ({ ...c, [i]: kq.error ?? 'Không tải được ảnh.' }));
  });

  return (
    <form action={luuAction} className="card space-y-3 p-4">
      <input type="hidden" name="id" value={gameId} />
      <h2 className="zib-title flex items-center gap-1.5">Duyệt nội dung AI soạn</h2>
      <p className="retro-sub text-ink-400">
        Sửa thoải mái trước khi lưu — AI tra sai một năm phát hành là chuyện thường,
        mà lưu rồi thì không ai đọc lại nữa.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <O nhan="Tên Việt hóa" ten="titleVi" mac={chiTiet.titleVi ?? ''} />
        <O nhan="Dòng game" ten="series" mac={chiTiet.series ?? ''} />
        <O nhan="Nhà phát triển" ten="developer" mac={chiTiet.developer ?? ''} />
        <O nhan="Nhà phát hành" ten="publisher" mac={chiTiet.publisher ?? ''} />
        <O nhan="Năm phát hành" ten="releaseYear" mac={chiTiet.releaseYear?.toString() ?? ''} />
      </div>

      <Vung nhan="Mô tả" ten="description" mac={chiTiet.description} dong={6} />
      <Vung nhan="Lối chơi" ten="gameplay" mac={chiTiet.gameplay} dong={4} />
      <Vung nhan="Lưu ý tương thích" ten="compatibilityNote" mac={chiTiet.compatibilityNote ?? ''} dong={2} />
      <Vung nhan="Lỗi đã biết" ten="knownIssues" mac={chiTiet.knownIssues ?? ''} dong={2} />

      {chiTiet.controls.length > 0 && (
        <div>
          <p className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Bảng phím</p>
          <ul className="rounded-xl border border-[var(--nova-border)] p-2 text-sm">
            {chiTiet.controls.map((c, i) => (
              <li key={i} className="flex gap-2 py-0.5">
                <span className="chip !py-0 shrink-0 font-mono text-[11px]">{c.key}</span>
                <span className="text-ink-500 dark:text-ink-300">{c.action}</span>
              </li>
            ))}
          </ul>
          <input type="hidden" name="controls" value={JSON.stringify(chiTiet.controls)} />
        </div>
      )}

      {/* ── Ảnh: AI chỉ GỢI Ý, máy chủ chỉ tải về khi admin bấm ── */}
      {chiTiet.anhGoiY.length > 0 && (
        <div>
          <p className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
            Ảnh AI tìm được
          </p>
          <p className="retro-sub mb-2 text-ink-400">
            Bấm “Tải về” thì máy chủ tự lấy ảnh và lưu nội bộ — không dẫn thẳng sang
            máy chủ người khác. Tải xong mới chọn được làm icon hay ảnh bìa.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {chiTiet.anhGoiY.map((a, i) => (
              <li key={i} className="rounded-xl border border-[var(--nova-border)] p-2">
                <p className="retro-sub mb-1 truncate text-ink-500 dark:text-ink-300" title={a.url}>
                  {a.moTa}
                </p>
                {anhKho[i] ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={anhKho[i]} alt={a.moTa} className="mb-2 h-24 w-full rounded-lg object-contain" />
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setIcon(anhKho[i]!)}
                        className={cn('btn-outline !py-1 flex-1 justify-center text-xs',
                          icon === anhKho[i] && '!border-brand-500 !text-brand-600')}>
                        {icon === anhKho[i] ? '✓ Icon' : 'Làm icon'}
                      </button>
                      <button type="button" onClick={() => setCover(anhKho[i]!)}
                        className={cn('btn-outline !py-1 flex-1 justify-center text-xs',
                          cover === anhKho[i] && '!border-brand-500 !text-brand-600')}>
                        {cover === anhKho[i] ? '✓ Ảnh bìa' : 'Làm ảnh bìa'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" disabled={dangTai} onClick={() => tai(i, a.url)}
                    className="btn-outline w-full justify-center gap-1.5 !py-1 text-xs">
                    {dangTai ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Tải về
                  </button>
                )}
                {anhLoi[i] && <p className="mt-1 text-xs text-red-600">{anhLoi[i]}</p>}
              </li>
            ))}
          </ul>
          <input type="hidden" name="icon" value={icon} />
          <input type="hidden" name="cover" value={cover} />
        </div>
      )}

      {luu.error && <p className="text-sm text-red-600">{luu.error}</p>}
      {luu.ok && <p className="text-sm font-medium text-emerald-600">Đã lưu vào game.</p>}
      <button type="submit" disabled={dangLuu} className="btn-primary w-full gap-1.5">
        {dangLuu ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        Lưu vào game
      </button>
    </form>
  );
}

function O({ nhan, ten, mac }: { nhan: string; ten: string; mac: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{nhan}</span>
      <input name={ten} defaultValue={mac} className="input" />
    </label>
  );
}

function Vung({ nhan, ten, mac, dong }: { nhan: string; ten: string; mac: string; dong: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">{nhan}</span>
      <textarea name={ten} defaultValue={mac} rows={dong} className="input" />
    </label>
  );
}
