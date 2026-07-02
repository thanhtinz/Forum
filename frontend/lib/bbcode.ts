// BBCode -> HTML (bản client, mirror applyBBCode() ở backend src/common/html.util.ts).
// Dùng khi dán nội dung có BBCode, và khi xem trước trong trình soạn thảo — để
// "xem trước" hiển thị giống hệt nội dung sau khi lưu (backend chạy applyBBCode trước khi sanitize).
export function applyBBCode(s: string): string {
  const esc = (u: string) => String(u).replace(/"/g, '%22').replace(/\s/g, '');
  for (let i = 0; i < 4; i++) {
    s = s
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
      .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
      .replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>')
      .replace(/\[quote(?:=[^\]]+)?\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>')
      .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre><code>$1</code></pre>')
      .replace(/\[color=(#?[a-zA-Z0-9]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
      .replace(/\[size=(\d{1,3})\]([\s\S]*?)\[\/size\]/gi, (_m, n, c) => `<span style="font-size:${Math.min(Math.max(+n, 8), 48)}px">${c}</span>`)
      .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_m, u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`)
      .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_m, u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${u}</a>`)
      .replace(/\[img\]([\s\S]*?)\[\/img\]/gi, (_m, u) => `<img src="${esc(u)}" alt="" style="max-width:100%" />`)
      .replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_m, c) => `<ul>${String(c).replace(/\[\*\]\s?([^\[\n]*)/gi, '<li>$1</li>')}</ul>`);
  }
  return s;
}
