/**
 * Nội dung trang hướng dẫn BBCode.
 *
 * Để riêng khỏi trang: cùng một danh sách này vừa dựng trang hướng dẫn, vừa là
 * chỗ duy nhất phải sửa khi thêm mã mới — trước đây mẫu cú pháp nằm rải trong
 * ô soạn thảo nên thêm mã xong là quên cập nhật chỗ hướng dẫn.
 *
 * Mỗi mục chỉ có mã BBCode; phần "kết quả" do trang tự dựng bằng chính
 * `bbcodeToHtml`, nên hướng dẫn không bao giờ lệch với thứ máy chủ thật sự làm.
 */

export interface GuideItem {
  /** Mã BBCode viết đúng như người dùng gõ. */
  code: string;
  /** Câu giải thích ngắn; bỏ trống khi nhìn kết quả là hiểu ngay. */
  note?: string;
}

export interface GuideSection {
  title: string;
  intro?: string;
  items: GuideItem[];
}

export const BBCODE_GUIDE: GuideSection[] = [
  {
    title: 'Chữ nghĩa',
    items: [
      { code: '[b]chữ đậm[/b]' },
      { code: '[i]chữ nghiêng[/i]' },
      { code: '[u]gạch chân[/u]' },
      { code: '[s]gạch ngang[/s]' },
      { code: '[color=#e5484d]chữ màu đỏ[/color]', note: 'Nhận mã màu #abc, #aabbcc hoặc tên màu tiếng Anh (red, teal…).' },
      { code: '[center]căn giữa dòng này[/center]' },
    ],
  },
  {
    title: 'Khối và danh sách',
    items: [
      { code: '[quote]Câu người khác nói[/quote]' },
      { code: '[quote=Minh Dev]Câu Minh Dev nói[/quote]', note: 'Ghi kèm tên người được trích.' },
      { code: '[code]const x = 1;[/code]', note: 'Trong khối mã, BBCode không được dịch — gõ gì hiện nấy.' },
      { code: '[list]\n[*]mục thứ nhất\n[*]mục thứ hai\n[/list]' },
    ],
  },
  {
    title: 'Liên kết và ảnh',
    items: [
      { code: '[url]https://example.com[/url]' },
      { code: '[url=https://example.com]chữ hiển thị[/url]' },
      // Ảnh mẫu để ở ngay trong trang chứ không trỏ ra ngoài: trang hướng dẫn
      // mà hiện ô ảnh vỡ thì người đọc tưởng mã [img] hỏng.
      { code: '[img]/logo-mau.svg[/img]', note: 'Dán thẳng địa chỉ ảnh, hoặc bấm nút tải ảnh trên thanh công cụ.' },
      { code: '@minhdev', note: 'Gõ @ kèm tên đăng nhập để nhắc ai đó — người được nhắc sẽ nhận thông báo.' },
    ],
  },
  {
    title: 'Che nội dung',
    intro:
      'Hai mã này khác nhau ở chỗ quan trọng nhất: [spoiler] chỉ gấp lại cho gọn, ai bấm mở cũng đọc được. '
      + '[hide] thì phần bị giấu KHÔNG được gửi xuống trình duyệt cho tới khi người đọc đủ điều kiện, '
      + 'nên xem mã nguồn trang cũng không moi ra được.',
    items: [
      { code: '[spoiler]nội dung gấp lại[/spoiler]', note: 'Chỉ để cho gọn hoặc tránh lộ tình tiết, không phải để giấu.' },
    ],
  },
];

/**
 * Các mức khoá của `[hide]`, xếp từ dễ tới khó.
 *
 * Cùng một dãy mức với phần cấu hình khi đăng bài viết — cố ý, để ai quen bên
 * ấy sang đây không phải học lại.
 */
export const HIDE_GUIDE: { code: string; when: string }[] = [
  { code: '[hide]…[/hide]', when: 'Người đọc phải trả lời chủ đề' },
  { code: '[hide=dangnhap]…[/hide]', when: 'Chỉ cần đăng nhập là xem được' },
  { code: '[hide=thich]…[/hide]', when: 'Người đọc phải thả thích cho chủ đề' },
  { code: '[hide=thich:20]…[/hide]', when: 'Chủ đề đạt 20 lượt thích thì mở cho tất cả' },
  { code: '[hide=traloi:10]…[/hide]', when: 'Chủ đề đạt 10 trả lời thì mở cho tất cả' },
  { code: '[hide=cap:3]…[/hide]', when: 'Chỉ thành viên từ cấp 3 trở lên' },
  { code: '[hide=diem:50]…[/hide]', when: 'Trả 50 điểm để mở; bạn được chia phần lớn số điểm đó' },
];

/** Vài điều hay bị hỏi, gom lại cho khỏi phải hỏi. */
export const BBCODE_NOTES: string[] = [
  'Gõ HTML thẳng vào bài sẽ hiện ra nguyên chữ chứ không thành thẻ — mọi ký tự đặc biệt đều được hoá giải trước khi dựng trang.',
  'Các mã lồng nhau được: [b][color=teal]vừa đậm vừa xanh[/color][/b].',
  'Gõ sai tên mã thì phần đó hiện nguyên xi như bạn gõ, bài không hỏng.',
  'Riêng [hide], nếu gõ sai điều kiện thì hệ thống hiểu về mức mặc định là "trả lời chủ đề" — chặt tay hơn chứ không mở toang phần bạn định giấu.',
  'Trích ngắn ở danh sách chủ đề, kết quả tìm kiếm và mô tả trang đều đã cắt sẵn phần [hide], nên nội dung giấu không lọt ra ngoài theo đường đó.',
  'Bấm nút Xem trước ở ô soạn để xem bài dựng ra thế nào trước khi đăng; ở chế độ xem trước, phần [hide] luôn mở để chính bạn kiểm lại.',
];
