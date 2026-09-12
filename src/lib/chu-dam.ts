import MarkdownIt from 'markdown-it';

/*
 * MARKDOWN → HTML cho phần mô tả game.
 *
 * VÌ SAO MARKDOWN CHỨ KHÔNG LƯU THẲNG HTML:
 *
 * Một trình soạn thảo WYSIWYG thật thì lưu HTML, và HTML do người dùng gửi lên
 * bắt buộc phải đi qua một bộ lọc trước khi in ra trang — quên một lần là một
 * lỗ chèn mã. Bộ lọc ấy lại cần một DOM ở phía máy chủ, tức thêm một thư viện
 * nặng nữa, và nó là loại mã mà sai thì không ai thấy cho tới lúc bị lợi dụng.
 *
 * Markdown lật ngược bài toán: bật `html: false` thì mọi thẻ người ta gõ vào
 * đều bị ESCAPE thành chữ thường, nên đầu ra chỉ chứa đúng những thẻ mà bộ
 * dựng này tự sinh. An toàn theo THIẾT KẾ, không phải an toàn nhờ nhớ lọc.
 *
 * Cái giá: người soạn phải gõ `**đậm**` thay vì bấm nút rồi thấy chữ đậm ngay.
 * Trình soạn thảo ở khu quản trị bù lại bằng thanh công cụ chèn sẵn ký hiệu và
 * một ô xem trước — xem `OSoanThao.tsx`.
 */
const bo = new MarkdownIt({
  // Thẻ HTML gõ tay bị escape thành chữ. Đây là dòng quan trọng nhất tệp này.
  html: false,
  // Xuống dòng đơn thành <br>: người viết mô tả game xuống dòng theo ý họ, và
  // luật Markdown gốc (phải hai lần xuống dòng) làm họ tưởng trang bị hỏng.
  breaks: true,
  // Địa chỉ gõ trần thành liên kết. `validateLink` sẵn có của markdown-it chặn
  // `javascript:`, `vbscript:` và `data:` trừ vài loại ảnh vô hại.
  linkify: true,
  typographer: false,
});

/*
 * Liên kết ra ngoài mở tab mới và cắt đường quay đầu.
 *
 * `rel="noopener"` là bắt buộc: thiếu nó thì trang đích với tay được vào
 * `window.opener` và tự đổi địa chỉ trang này sang một trang giả.
 */
const moLienKet = bo.renderer.rules.link_open
  ?? ((token, i, opts, _env, self) => self.renderToken(token, i, opts));
bo.renderer.rules.link_open = (token, i, opts, env, self) => {
  const dia = token[i].attrGet('href') ?? '';
  if (/^https?:\/\//i.test(dia)) {
    token[i].attrSet('target', '_blank');
    token[i].attrSet('rel', 'noopener noreferrer');
  }
  return moLienKet(token, i, opts, env, self);
};

/** Dựng HTML từ Markdown. Rỗng vào thì rỗng ra, không trả `<p></p>`. */
export function dungChuDam(chu: string | null | undefined): string {
  const s = (chu ?? '').trim();
  return s ? bo.render(s) : '';
}

export { bocChu } from './chu-dam-const';
