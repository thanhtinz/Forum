import sanitizeHtml from 'sanitize-html';

// Nội dung từ TipTap là HTML; nội dung cũ là Markdown/BBCode.
export function isHtmlContent(raw: string): boolean {
  return /<\/?(p|div|span|h[1-6]|ul|ol|li|blockquote|pre|code|table|img|a|br|strong|em|u|s|details|iframe|mark)\b/i.test(raw);
}

// Làm sạch HTML từ trình soạn thảo TipTap (whitelist chống XSS).
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'details', 'summary', 'iframe', 'input', 'label', 'audio', 'source',
      'svg', 'path',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title', 'class', 'data-type', 'data-id', 'data-label', 'style'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style'],
      span: ['style', 'data-type', 'data-id', 'class', 'data-copy', 'title'],
      div: ['style', 'class', 'data-type', 'data-percent'],
      p: ['style', 'class'],
      h1: ['style', 'class'], h2: ['style', 'class'], h3: ['style', 'class'], h4: ['style', 'class'], h5: ['style', 'class'], h6: ['style', 'class'],
      td: ['style', 'colspan', 'rowspan'], th: ['style', 'colspan', 'rowspan'],
      li: ['data-type', 'data-checked', 'class'],
      ul: ['data-type', 'class'],
      input: ['type', 'checked', 'disabled'],
      code: ['class'], pre: ['class'],
      hr: ['class', 'style'],
      audio: ['controls', 'src'], source: ['src', 'type'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'class'],
      details: ['class'], summary: ['class'],
      // Chỉ cho thuộc tính vẽ hình thuần tuý (không href/onload) — dùng cho icon nút Tải xuống
      svg: ['viewBox'], path: ['d'],
    },
    allowedStyles: {
      '*': {
        color: [/^#(0x)?[0-9a-fA-F]{3,8}$/, /^rgba?\(/, /^[a-zA-Z]+$/],
        'background-color': [/^#(0x)?[0-9a-fA-F]{3,8}$/, /^rgba?\(/, /^[a-zA-Z]+$/],
        'background': [/^(linear-gradient|#|rgb|[a-zA-Z])/],
        'text-align': [/^(left|right|center|justify)$/],
        'font-size': [/^\d{1,3}(px|pt|em|rem|%)$/],
        'width': [/^\d{1,3}(\.\d+)?%$/, /^\d{1,4}px$/],
        'border-radius': [/^\d{1,3}px$/],
        'padding': [/^[\d.\s a-z%]+$/],
      },
    },
    allowedClasses: {
      '*': ['callout', 'callout-info', 'callout-success', 'callout-warning', 'callout-danger',
        'fx-btn', 'fx-note', 'fx-marquee', 'fx-progress', 'fx-progress-bar', 'fx-divider',
        'fx-card', 'fx-card-title', 'fx-card-body', 'fx-timeline', 'fx-netdisk', 'fx-netdisk-pw', 'fx-copy',
        'fx-netdisk-btn', 'folder', 'top', 'paper', 'pencil',
        'video-embed', 'video-embed-wrap', 'mention', 'hashtag', 'attachment', 'spoiler'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'www.tiktok.com', 'player.bilibili.com', 'music.163.com'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
    },
    // SVG dùng thuộc tính viewBox chữ hoa B — parser mặc định hạ thường tên thuộc tính
    // khiến "viewBox" thành "viewbox" (SVG không nhận, phân biệt hoa/thường). Giữ nguyên hoa/thường.
    parser: { lowerCaseAttributeNames: false },
  });
}

// Chuyển BBCode phổ biến sang HTML (whitelist an toàn) — chạy trước markdown.
export function applyBBCode(text: string): string {
  let s = text;
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
