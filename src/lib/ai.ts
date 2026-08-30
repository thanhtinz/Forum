import 'server-only';

/**
 * Cầu nối tới Claude — chỉ dùng ở phía máy chủ.
 *
 * Gọi thẳng bằng `fetch` chứ không kéo thêm SDK: cả dự án chỉ cần đúng một
 * kiểu lời gọi, mà thêm một phụ thuộc là thêm một thứ phải nâng cấp và phải
 * tin. Thân yêu cầu bên dưới chính là API Messages, không có lớp bọc nào.
 *
 * Khoá để ở `ANTHROPIC_API_KEY`. KHÔNG có khoá thì mọi hàm ở đây ném lỗi có
 * chữ đọc được, chứ không trả dữ liệu bịa — thà admin thấy "chưa cấu hình
 * khoá" còn hơn thấy một mô tả game trông như thật mà do đâu ra thì không ai
 * biết.
 */

const GOC = 'https://api.anthropic.com/v1/messages';

/** Model mặc định; đổi được bằng biến môi trường khi cần. */
const MODEL = process.env.AI_MODEL || 'claude-sonnet-5';

/**
 * Công cụ tìm kiếm web chạy ở phía Anthropic: mình không phải tự đi cào trang,
 * và cũng không phải giữ thêm một khoá của nhà tìm kiếm nào khác.
 *
 * Tên có gắn ngày phiên bản nên để ra biến môi trường — nhà cung cấp ra bản
 * mới thì đổi một dòng cấu hình, không phải sửa mã.
 */
const CONG_CU_TIM = process.env.AI_SEARCH_TOOL || 'web_search_20250305';

export class ThieuKhoaAiError extends Error {
  constructor() {
    super('Chưa cấu hình ANTHROPIC_API_KEY nên chưa dùng được trợ lý AI.');
    this.name = 'ThieuKhoaAiError';
  }
}

export class LoiAiError extends Error {}

/** Đã cắm khoá chưa — giao diện hỏi để biết có bày nút AI ra không. */
export function coAi(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

interface KhoiNoiDung {
  type: string;
  name?: string;
  input?: unknown;
  text?: string;
}

/**
 * Hỏi Claude và bắt nó trả lời bằng MỘT lời gọi công cụ có lược đồ cố định.
 *
 * Bắt trả lời qua công cụ chứ không đọc chữ tự do rồi tự phân tích: chữ tự do
 * thì lần nào cũng có thể thiếu một trường hoặc kèm thêm một câu dẫn, mà mình
 * lại đang đổ thẳng vào cơ sở dữ liệu.
 *
 * `timWeb` bật thì thêm công cụ tìm kiếm của nhà cung cấp — thông tin game
 * nằm ngoài đời chứ không nằm trong đầu model, và model nhớ sai thì nó bịa ra
 * một cách rất trôi chảy.
 */
export async function hoiCoCauTruc<T>({
  he, nhac, tenCongCu, moTaCongCu, luocDo, timWeb = false, toiDaTu = 4000,
}: {
  he: string;
  nhac: string;
  tenCongCu: string;
  moTaCongCu: string;
  luocDo: Record<string, unknown>;
  timWeb?: boolean;
  toiDaTu?: number;
}): Promise<T> {
  const khoa = process.env.ANTHROPIC_API_KEY;
  if (!khoa) throw new ThieuKhoaAiError();

  const congCu: Record<string, unknown>[] = [
    { name: tenCongCu, description: moTaCongCu, input_schema: luocDo },
  ];
  if (timWeb) congCu.push({ type: CONG_CU_TIM, name: 'web_search', max_uses: 6 });

  // Hạn thời gian: tìm web rồi soạn có thể lâu, nhưng treo vô hạn thì server
  // action giữ luôn một tiến trình.
  const bo = new AbortController();
  const hen = setTimeout(() => bo.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(GOC, {
      method: 'POST',
      signal: bo.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': khoa,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: toiDaTu,
        system: he,
        tools: congCu,
        messages: [{ role: 'user', content: nhac }],
      }),
    });
  } catch (e) {
    throw new LoiAiError(
      e instanceof Error && e.name === 'AbortError'
        ? 'Trợ lý AI trả lời quá lâu, thử lại nhé.'
        : 'Không gọi được trợ lý AI.',
    );
  } finally {
    clearTimeout(hen);
  }

  if (!res.ok) {
    const chu = await res.text().catch(() => '');
    // Không ném nguyên văn phản hồi ra giao diện: nó có thể lẫn cả khoá hoặc
    // id nội bộ. Ghi ra log để còn tra, hiện ra màn hình thì gọn thôi.
    console.error('[ai] lỗi', res.status, chu.slice(0, 500));
    throw new LoiAiError(`Trợ lý AI trả về lỗi ${res.status}.`);
  }

  const du = (await res.json()) as { content?: KhoiNoiDung[] };
  const goi = du.content?.find((k) => k.type === 'tool_use' && k.name === tenCongCu);
  if (!goi?.input) throw new LoiAiError('Trợ lý AI không trả về dữ liệu đúng khuôn.');
  return goi.input as T;
}
