import { db } from './db';

/** Escape HTML để chống XSS khi dựng nội dung. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Chuyển văn bản thô thành các đoạn <p> đã escape.
 * Chuẩn hoá xuống dòng trước: trình duyệt gửi textarea bằng CRLF, nếu không
 * đổi về LF thì regex tách đoạn không khớp và cả bài dồn thành một đoạn.
 */
export function toParagraphs(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => `<p>${escapeHtml(b).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * Nghịch đảo của `toParagraphs`: dựng lại văn bản thô để điền vào ô soạn thảo
 * khi sửa bài (giữ nguyên cách chia đoạn và xuống dòng).
 */
export function fromParagraphs(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

export function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'bai-viet';
}

const MAX_DOWNLOADS = 10;

/** Chỉ chấp nhận http(s) hoặc đường dẫn nội bộ — chặn javascript:/data:. */
function safeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith('/')) return s.slice(0, 2000);
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s.slice(0, 2000) : null;
  } catch {
    return null;
  }
}

export interface DownloadInput {
  label: string; url: string; provider: string | null; version: string | null;
  sizeBytes: bigint | null; password: string | null; extractCode: string | null;
}

/** Đọc danh sách tệp tải xuống (JSON) từ form và làm sạch từng trường. */
export function parseDownloads(raw: FormDataEntryValue | null): DownloadInput[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  let arr: unknown;
  try { arr = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(arr)) return [];

  const out: DownloadInput[] = [];
  for (const it of arr.slice(0, MAX_DOWNLOADS)) {
    if (!it || typeof it !== 'object') continue;
    const o = it as Record<string, unknown>;
    const label = String(o.label ?? '').trim().slice(0, 200);
    const url = safeUrl(String(o.url ?? ''));
    if (!label || !url) continue;

    const mb = Number(o.sizeMb);
    const sizeBytes = Number.isFinite(mb) && mb > 0 ? BigInt(Math.round(mb * 1024 * 1024)) : null;
    const trim = (v: unknown, n: number) => {
      const s = String(v ?? '').trim().slice(0, n);
      return s || null;
    };

    out.push({
      label, url,
      provider: trim(o.provider, 30),
      version: trim(o.version, 50),
      sizeBytes,
      password: trim(o.password, 100),
      extractCode: trim(o.extractCode, 100),
    });
  }
  return out;
}

export interface ParsedPost {
  data: {
    title: string;
    excerpt: string | null;
    content: string;
    hiddenContent: string | null;
    cover: string | null;
    cardStyle: never;
    access: never;
    pricePoints: number | null;
    priceAmount: number | null;
  };
  catIds: string[];
  tagNames: { slug: string; label: string }[];
  downloads: DownloadInput[];
}

/**
 * Đọc và kiểm tra dữ liệu bài viết từ form. Dùng chung cho đăng mới và sửa bài
 * để hai luồng không bao giờ lệch quy tắc kiểm tra.
 */
export async function parsePostForm(formData: FormData): Promise<ParsedPost | { error: string }> {
  const title = String(formData.get('title') ?? '').trim();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const hiddenContent = String(formData.get('hiddenContent') ?? '').trim();
  const cover = String(formData.get('cover') ?? '').trim();
  const cardStyle = String(formData.get('cardStyle') ?? 'STANDARD');
  const access = String(formData.get('access') ?? 'FREE');
  const pricePoints = parseInt(String(formData.get('pricePoints') ?? '0'), 10) || 0;
  const priceAmount = parseInt(String(formData.get('priceAmount') ?? '0'), 10) || 0;
  const tagRaw = String(formData.get('tags') ?? '');
  const catSlugs = formData.getAll('categories').map(String).filter(Boolean);

  const isPaid = access === 'POINTS' || access === 'PAID' || access === 'VIP_ONLY';

  if (title.length < 5) return { error: 'Tiêu đề tối thiểu 5 ký tự.' };
  if (content.length < 20) return { error: 'Nội dung quá ngắn (tối thiểu 20 ký tự).' };
  if (catSlugs.length === 0) return { error: 'Hãy chọn ít nhất 1 chuyên mục.' };
  if (access === 'POINTS' && pricePoints <= 0) return { error: 'Hãy nhập giá bằng điểm (> 0).' };
  if (access === 'PAID' && priceAmount <= 0) return { error: 'Hãy nhập giá bằng tiền (> 0).' };
  if (isPaid && hiddenContent.length < 10) return { error: 'Hãy nhập phần nội dung ẩn (sau khi mua mới xem được).' };

  const cats = await db.category.findMany({ where: { slug: { in: catSlugs } }, select: { id: true } });

  const tagNames = [...new Set(tagRaw.split(',').map((t) => t.trim()).filter(Boolean))]
    .slice(0, 8)
    .map((label) => ({ slug: toSlug(label), label }));

  return {
    data: {
      title,
      excerpt: excerpt || null,
      content: toParagraphs(content),
      hiddenContent: isPaid && hiddenContent ? toParagraphs(hiddenContent) : null,
      cover: cover || null,
      cardStyle: cardStyle as never,
      access: access as never,
      pricePoints: access === 'POINTS' ? pricePoints : null,
      priceAmount: access === 'PAID' ? priceAmount : null,
    },
    catIds: cats.map((c) => c.id),
    tagNames,
    downloads: parseDownloads(formData.get('downloads')),
  };
}
