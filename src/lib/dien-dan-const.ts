/*
 * Mấy con số của DIỄN ĐÀN trong từng game.
 *
 * Tệp này KHÔNG import gì, để bài kiểm `.mjs` nạp thẳng được — Node không giải
 * được alias `@/`. Cùng lẽ với mấy tệp `*-const.ts` khác.
 */

/** Tiêu đề chủ đề dài nhất bấy nhiêu ký tự. */
export const TIEU_DE_TOI_DA = 150;

/** Thân bài và lời đáp dài nhất bấy nhiêu ký tự. */
export const NOI_DUNG_TOI_DA = 8000;

/*
 * NHỊP NGHỈ — hai con số, vì mở chủ đề và đáp một câu là hai việc khác nhau.
 *
 * VÌ SAO PHẢI CÓ. Diễn đàn là lối ghi vào cơ sở dữ liệu dễ nhất mà người lạ
 * chạm được tới: đăng nhập xong là viết được, không có ô nào phải duyệt. Phòng
 * chat đã có nhịp nghỉ từ đầu, còn diễn đàn thì không — mà bài diễn đàn NẶNG
 * HƠN một câu chat: mỗi bài kéo theo `guiThongBao`, và `guiThongBao` lại gọi
 * `baoQuaThu`. Rải bài là rải thư đi kèm, gửi tới hộp thư của người khác.
 *
 * Đo trên hàng CUỐI CÙNG của chính người ấy, không đếm trong một khoảng: đếm
 * thì phải quét, còn tra hàng cuối là một lượt chạm chỉ mục. Chỉ mục
 * `[nguoiId, taoLuc]` trên `ChuDe` và `TraLoi` có mặt cho đúng hai lượt tra
 * này.
 *
 * Đếm theo NGƯỜI, không theo cặp (game, người) — kèm `gameId` vào thì mỗi game
 * một hạn ngạch riêng, mà xoay vòng qua hàng trăm game là gửi được hàng trăm
 * bài trong một nhịp, đúng thứ nhịp nghỉ sinh ra để chặn. Cùng lẽ với
 * `chat.ts`.
 */

/**
 * Hai chủ đề liền nhau của cùng một người cách nhau bấy nhiêu giây.
 *
 * Dài hơn hẳn nhịp của lời đáp: mở một chủ đề là dựng một chỗ mới cho người
 * khác vào nói, mà chủ đề rác thì nằm lại trong danh sách rất lâu — khác một
 * lời đáp rác, vốn chìm xuống dưới sau vài câu. Ba mươi giây vẫn dưới thời
 * gian thật để gõ một cái tiêu đề tử tế cùng mươi chữ thân bài, nên người viết
 * thật không bao giờ chạm tới.
 */
export const NGHI_CHU_DE_GIAY = 30;

/**
 * Hai lời đáp liền nhau của cùng một người cách nhau bấy nhiêu giây.
 *
 * Nới hơn phòng chat (3 giây) vì một lời đáp diễn đàn dài hơn một câu nói, mà
 * vẫn đủ chặt để một vòng lặp không làm đầy bảng. Người trả lời liền mấy chủ
 * đề cũng phải mất hơn tám giây để đọc câu hỏi tiếp theo.
 */
export const NGHI_TRA_LOI_GIAY = 8;
