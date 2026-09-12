/**
 * Tên tệp người tải nhận về.
 *
 * Tên trong kho mang mã ngẫu nhiên (`m3f9x1-4a2b….jar`) — cần thiết để hai
 * người cùng đặt tên `game.jar` không đè lên nhau, nhưng đưa nguyên cái tên ấy
 * cho người tải thì họ có một thư mục Tải về toàn chuỗi ký tự vô nghĩa.
 *
 * Nên tên ở đây dựng lại từ thứ người ta đọc được: tên người bày hàng đặt nếu
 * có, không thì đường dẫn game kèm số hiệu bản.
 *
 * CHỈ GIỮ CHỮ CÁI ASCII, vì chuỗi này đi vào tiêu đề `Content-Disposition`.
 * Hai lẽ: một dấu nháy kép trong tên là đủ để cắt đôi tiêu đề ấy và nhét thêm
 * tiêu đề khác vào; và tiêu đề HTTP vốn chỉ chở được ASCII, nên chữ có dấu
 * muốn đi qua thì phải gói kiểu `filename*=UTF-8''…` mà không phải trình duyệt
 * cũ nào cũng mở ra được. Tên tệp mất dấu thì vẫn đọc ra được game nào.
 */
export function tenTepTaiVe(
  tenDat: string | null, duongDanGame: string, soHieu: string, loai: string,
): string {
  const tho = tenDat?.trim() || `${duongDanGame}-${soHieu}.${loai.toLowerCase()}`;
  const sach = tho.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
  return sach || `tep.${loai.toLowerCase()}`;
}
