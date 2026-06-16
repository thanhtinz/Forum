// Engine Tarot — 22 lá Ẩn Chính (Major Arcana). Cấu trúc port từ taibu-core, nghĩa dịch sang tiếng Việt.
export interface TarotCard {
  number: number;
  name: string;
  nameVi: string;
  upright: string[];   // nghĩa xuôi
  reversed: string[];  // nghĩa ngược
}

export const MAJOR_ARCANA: TarotCard[] = [
  { number: 0, name: 'The Fool', nameVi: 'Gã Khờ', upright: ['khởi đầu mới', 'phiêu lưu', 'tự do'], reversed: ['liều lĩnh', 'thiếu kế hoạch', 'bốc đồng'] },
  { number: 1, name: 'The Magician', nameVi: 'Nhà Ảo Thuật', upright: ['sáng tạo', 'kỹ năng', 'ý chí'], reversed: ['lừa dối', 'lãng phí tiềm năng', 'thiếu tập trung'] },
  { number: 2, name: 'The High Priestess', nameVi: 'Nữ Tư Tế', upright: ['trực giác', 'bí ẩn', 'trí tuệ nội tâm'], reversed: ['phớt lờ trực giác', 'che giấu', 'khép kín'] },
  { number: 3, name: 'The Empress', nameVi: 'Nữ Hoàng', upright: ['sung túc', 'nuôi dưỡng', 'sáng tạo'], reversed: ['tắc nghẽn', 'phụ thuộc', 'kiệt sức'] },
  { number: 4, name: 'The Emperor', nameVi: 'Hoàng Đế', upright: ['quyền uy', 'ổn định', 'lãnh đạo'], reversed: ['lạm quyền', 'cứng nhắc', 'hỗn loạn'] },
  { number: 5, name: 'The Hierophant', nameVi: 'Giáo Hoàng', upright: ['truyền thống', 'niềm tin', 'dẫn dắt'], reversed: ['nổi loạn', 'giáo điều', 'mù quáng'] },
  { number: 6, name: 'The Lovers', nameVi: 'Tình Nhân', upright: ['tình yêu', 'lựa chọn', 'hòa hợp'], reversed: ['bất hòa', 'chọn sai', 'mâu thuẫn'] },
  { number: 7, name: 'The Chariot', nameVi: 'Cỗ Xe', upright: ['chiến thắng', 'ý chí', 'quyết tâm'], reversed: ['mất kiểm soát', 'lạc hướng', 'yếu đuối'] },
  { number: 8, name: 'Strength', nameVi: 'Sức Mạnh', upright: ['can đảm', 'kiên nhẫn', 'kiểm soát'], reversed: ['nghi ngờ bản thân', 'yếu đuối', 'nóng giận'] },
  { number: 9, name: 'The Hermit', nameVi: 'Ẩn Sĩ', upright: ['nội quan', 'tìm kiếm', 'khôn ngoan'], reversed: ['cô lập', 'lạc lối', 'khép mình'] },
  { number: 10, name: 'Wheel of Fortune', nameVi: 'Bánh Xe Số Phận', upright: ['vận may', 'bước ngoặt', 'chu kỳ'], reversed: ['xui xẻo', 'trì trệ', 'mất kiểm soát'] },
  { number: 11, name: 'Justice', nameVi: 'Công Lý', upright: ['công bằng', 'sự thật', 'trách nhiệm'], reversed: ['bất công', 'thiên vị', 'trốn tránh'] },
  { number: 12, name: 'The Hanged Man', nameVi: 'Người Treo Ngược', upright: ['buông bỏ', 'góc nhìn mới', 'hy sinh'], reversed: ['chần chừ', 'kháng cự', 'bế tắc'] },
  { number: 13, name: 'Death', nameVi: 'Cái Chết', upright: ['kết thúc', 'chuyển hóa', 'tái sinh'], reversed: ['níu kéo', 'sợ thay đổi', 'trì hoãn'] },
  { number: 14, name: 'Temperance', nameVi: 'Tiết Độ', upright: ['cân bằng', 'điều hòa', 'kiên nhẫn'], reversed: ['mất cân bằng', 'thái quá', 'thiếu kiên nhẫn'] },
  { number: 15, name: 'The Devil', nameVi: 'Ác Quỷ', upright: ['ràng buộc', 'cám dỗ', 'vật chất'], reversed: ['giải thoát', 'phá bỏ xiềng xích', 'tỉnh ngộ'] },
  { number: 16, name: 'The Tower', nameVi: 'Tòa Tháp', upright: ['biến động', 'sụp đổ', 'thức tỉnh'], reversed: ['né tránh tai họa', 'sợ thay đổi', 'trì hoãn khủng hoảng'] },
  { number: 17, name: 'The Star', nameVi: 'Ngôi Sao', upright: ['hy vọng', 'cảm hứng', 'chữa lành'], reversed: ['tuyệt vọng', 'mất niềm tin', 'nản lòng'] },
  { number: 18, name: 'The Moon', nameVi: 'Mặt Trăng', upright: ['ảo ảnh', 'tiềm thức', 'mơ hồ'], reversed: ['sáng tỏ', 'vượt qua sợ hãi', 'sự thật lộ ra'] },
  { number: 19, name: 'The Sun', nameVi: 'Mặt Trời', upright: ['niềm vui', 'thành công', 'sức sống'], reversed: ['lạc quan thái quá', 'trì hoãn', 'thiếu năng lượng'] },
  { number: 20, name: 'Judgement', nameVi: 'Phán Xét', upright: ['hồi sinh', 'thức tỉnh', 'tha thứ'], reversed: ['tự trách', 'nghi ngờ', 'né tránh phán xét'] },
  { number: 21, name: 'The World', nameVi: 'Thế Giới', upright: ['hoàn thành', 'viên mãn', 'thành tựu'], reversed: ['dang dở', 'trì trệ', 'thiếu kết thúc'] },
];

export interface DrawnCard extends TarotCard {
  reversedOrientation: boolean;
  meaning: string[];
}

// Bốc `n` lá không trùng
export function drawTarot(n = 3): DrawnCard[] {
  const count = Math.min(Math.max(n, 1), 10);
  const deck = [...MAJOR_ARCANA];
  const drawn: DrawnCard[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * deck.length);
    const card = deck.splice(idx, 1)[0];
    const reversed = Math.random() < 0.5;
    drawn.push({ ...card, reversedOrientation: reversed, meaning: reversed ? card.reversed : card.upright });
  }
  return drawn;
}
