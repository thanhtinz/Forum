import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, Lock, Lightbulb } from 'lucide-react';
import { bbcodeToHtml, renderHidden } from '@/lib/bbcode';
import { BBCODE_GUIDE, HIDE_GUIDE, BBCODE_NOTES } from '@/lib/bbcode-guide';

export const metadata: Metadata = {
  title: 'Hướng dẫn BBCode',
  description: 'Cách gõ chữ đậm, màu, trích dẫn, ảnh và cách giấu nội dung bằng mã [hide] trên diễn đàn.',
};

/**
 * Phần "kết quả" của mỗi mẫu dựng bằng chính `bbcodeToHtml`, không phải HTML
 * chép tay: hướng dẫn mà chép tay thì sửa mã một hồi là hướng dẫn nói một đằng
 * máy chủ làm một nẻo. Chuỗi đưa vào đều là mẫu của ta, mà kể cả không phải thì
 * `bbcodeToHtml` cũng đã hoá giải mọi ký tự đặc biệt từ bước đầu.
 */
function Mau({ code, note }: { code: string; note?: string }) {
  return (
    <div className="grid gap-3 border-t border-ink-100 py-3 first:border-0 first:pt-0 sm:grid-cols-2 dark:border-ink-800">
      <div>
        <pre className="overflow-x-auto rounded-lg bg-ink-50 p-2.5 text-xs dark:bg-ink-800/60"><code className="font-mono text-ink-600 dark:text-ink-300">{code}</code></pre>
        {note && <p className="mt-1.5 text-xs text-ink-500">{note}</p>}
      </div>
      <div className="prose prose-sm max-w-none self-center dark:prose-invert prose-img:max-h-40 prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: bbcodeToHtml(code) }} />
    </div>
  );
}

export default function BBCodeGuidePage() {
  /** Mẫu [hide] dựng ở trạng thái CHƯA đủ điều kiện — đúng thứ người đọc thấy. */
  const hideLocked = (code: string) =>
    renderHidden(bbcodeToHtml(code), {
      loggedIn: false, liked: false, replied: false, level: 0, paid: false, likeCount: 0, replyCount: 0,
    });

  return (
    <div className="container-nova py-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-2xl font-black text-ink-800 dark:text-ink-100">
            <BookOpen size={24} className="text-brand-500" /> Hướng dẫn BBCode
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            BBCode là cách trình bày bài viết trên diễn đàn: gõ mã trong ngoặc vuông, máy chủ dựng ra chữ đậm,
            màu, trích dẫn, ảnh… Thanh công cụ ở ô soạn chèn sẵn các mã này, nhưng gõ tay vẫn nhanh hơn khi đã quen.
          </p>
        </header>

        {BBCODE_GUIDE.map((sec) => (
          <section key={sec.title} className="card mb-4 p-4 sm:p-5">
            <h2 className="zib-title mb-1">{sec.title}</h2>
            {sec.intro && <p className="mb-3 text-sm text-ink-500">{sec.intro}</p>}
            <div className={sec.intro ? '' : 'mt-3'}>
              {sec.items.map((it) => <Mau key={it.code} code={it.code} note={it.note} />)}
            </div>
          </section>
        ))}

        <section className="card mb-4 p-4 sm:p-5">
          <h2 className="zib-title mb-1 flex items-center gap-2"><Lock size={18} /> Giấu nội dung bằng [hide]</h2>
          <p className="mb-3 text-sm text-ink-500">
            Phần nằm trong <code className="font-mono">[hide]</code> chỉ hiện ra khi người đọc đủ điều kiện bạn đặt.
            Chưa đủ thì phần đó bị cắt ngay ở máy chủ — không nằm trong trang, nên không ai xem mã nguồn mà moi ra được.
            Bạn và ban điều hành thì luôn đọc được bài của chính mình.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-700">
                  <th className="py-2 pr-3 font-bold">Gõ thế này</th>
                  <th className="py-2 font-bold">Thì mở khi…</th>
                </tr>
              </thead>
              <tbody>
                {HIDE_GUIDE.map((h) => (
                  <tr key={h.code} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
                    <td className="py-2 pr-3 align-top">
                      <code className="whitespace-nowrap font-mono text-xs text-brand-600 dark:text-brand-300">{h.code}</code>
                    </td>
                    <td className="py-2 align-top text-ink-600 dark:text-ink-300">{h.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm font-semibold text-ink-600 dark:text-ink-300">Người chưa đủ điều kiện sẽ thấy:</p>
          <div className="prose prose-sm mt-1.5 max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: hideLocked('[hide=diem:50]Link tải nằm ở đây[/hide]') }} />

          <p className="mt-2 text-xs text-ink-500">
            Mức <code className="font-mono">diem</code> hiện thêm nút trả điểm ngay dưới bài; trả một lần là mở hết mọi
            khối ẩn của chủ đề đó, và phần lớn số điểm chảy về túi bạn.
            Các mã tiếng Anh cũng chạy: <code className="font-mono">like</code>, <code className="font-mono">reply</code>,
            {' '}<code className="font-mono">level</code>, <code className="font-mono">points</code>, <code className="font-mono">login</code>.
          </p>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="zib-title mb-3 flex items-center gap-2"><Lightbulb size={18} /> Hay bị hỏi</h2>
          <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-300">
            {BBCODE_NOTES.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-5 text-center text-sm text-ink-500">
          Quen tay rồi thì <Link href="/" className="font-semibold text-brand-600 hover:underline">ra diễn đàn</Link> đăng bài thôi.
        </p>
      </div>
    </div>
  );
}
