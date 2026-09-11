/**
 * Hình và sắc màu riêng cho từng thể loại.
 *
 * Lưới thể loại trước đây là mười ô chữ nhật viền xám giống hệt nhau, khác mỗi
 * dòng chữ — mắt phải ĐỌC từng ô mới biết ô nào là ô nào. Cho mỗi thể loại một
 * hình và một sắc thì nhận ra bằng liếc, và lần sau vào lại còn nhớ được vị
 * trí ô mình hay bấm.
 *
 * Tra theo ĐƯỜNG DẪN chứ không theo tên: tên hiển thị là thứ quản trị sửa
 * được bất cứ lúc nào, còn đường dẫn thì nằm trên URL nên không ai đổi bừa.
 *
 * Sắc ghi bằng ba kênh RGB rời để ghép được độ mờ, y như bảng màu ở
 * `globals.css`. Mỗi ô chỉ tô nền thật nhạt và tô màu cho riêng cái hình, nên
 * không cần lo tương phản chữ — chữ vẫn là màu chữ thường trên nền gần trắng.
 */
export interface HinhTheLoai {
  /** Tên biểu tượng trong bộ lucide. */
  icon: string;
  /** Ba kênh RGB, cách nhau bằng khoảng trắng. */
  sac: string;
}

export const HINH_THE_LOAI: Record<string, HinhTheLoai> = {
  'hanh-dong': { icon: 'Swords', sac: '225 29 72' },
  'phieu-luu': { icon: 'Compass', sac: '13 148 136' },
  arcade: { icon: 'Joystick', sac: '217 70 239' },
  'dua-xe': { icon: 'CarFront', sac: '234 88 12' },
  'giai-do': { icon: 'Puzzle', sac: '79 70 229' },
  'nhap-vai': { icon: 'Shield', sac: '124 58 237' },
  'chien-thuat': { icon: 'Crown', sac: '180 83 9' },
  'the-thao': { icon: 'Volleyball', sac: '22 163 74' },
  'mo-phong': { icon: 'Sprout', sac: '5 150 105' },
  'thuong-thuc': { icon: 'Coffee', sac: '2 132 199' },
};

/** Thể loại lạ thì rơi về hình chung — thêm thể loại mới không được vỡ lưới. */
export const HINH_CHUNG: HinhTheLoai = { icon: 'Gamepad2', sac: '71 85 105' };

export function hinhCuaTheLoai(duongDan: string): HinhTheLoai {
  return HINH_THE_LOAI[duongDan] ?? HINH_CHUNG;
}
