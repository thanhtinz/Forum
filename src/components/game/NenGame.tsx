import { mauCuaGame } from '@/lib/mau-game';
import { gop } from '@/lib/tien-ich';

/**
 * NỀN THAY ẢNH BÌA — dùng chung cho tấm băng và thẻ Hôm nay.
 *
 * Cửa hàng chưa có ảnh bìa thật, mà dựng một tấm ảnh giả là nói dối người xem về
 * thứ họ sắp tải. Nên chỗ ấy là một mảng màu — nhưng một mảng màu phẳng lì thì
 * trông như chỗ ảnh chưa tải xong, chứ không ra một tấm bìa cố ý.
 *
 * Ba lớp để nó thành cố ý:
 *   1. Dải màu chéo, suy từ tên game (cùng game là cùng màu ở mọi trang).
 *   2. Một quầng sáng lệch góc trên — thứ tách "một khối có chiều sâu" khỏi
 *      "một ô tô màu".
 *   3. LƯỚI ĐIỂM ẢNH mảnh phủ lên trên. Cửa hàng này bán game Java đời 2005 lẫn
 *      game hiện đại, nên vân pixel là thứ nói đúng về hàng trong cửa hàng —
 *      không phải hoa văn nhặt đại cho đỡ trống.
 *
 * Lưới vẽ bằng `repeating-linear-gradient` chứ không phải ảnh nền: không tốn
 * một lượt tải nào, và nét luôn sắc ở mọi mật độ điểm ảnh màn hình.
 *
 * KHÔNG in chữ tắt cỡ lớn làm hoa văn. Bản trước có, và nó hỏng hai đường:
 * chữ tràn khỏi mép nên luôn bị cắt ngang thân, đọc ra là lỗi chứ không phải
 * cố ý; mà nó lại lặp đúng hai chữ cái đang nằm trên biểu tượng ngay cạnh.
 * Bỏ đi thì mảng màu yên tĩnh lại, và biểu tượng thành thứ duy nhất phải nhìn.
 */
export function NenGame({ ten, className, doLuoi = 4 }: {
  ten: string;
  className?: string;
  /** Bước lưới tính bằng px. Tấm càng lớn thì lưới càng thưa mới thấy được vân. */
  doLuoi?: number;
}) {
  const { tu, den } = mauCuaGame(ten);

  return (
    <span aria-hidden className={gop('absolute inset-0 overflow-hidden', className)}>
      <span className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(140deg, ${tu}, ${den})` }} />

      <span className="absolute inset-0"
        style={{ backgroundImage: `radial-gradient(120% 90% at 12% 0%, rgb(255 255 255 / .28), transparent 62%)` }} />

      <span className="absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage:
            `repeating-linear-gradient(0deg, rgb(255 255 255 / .10) 0 1px, transparent 1px ${doLuoi}px),`
            + `repeating-linear-gradient(90deg, rgb(0 0 0 / .10) 0 1px, transparent 1px ${doLuoi}px)`,
        }} />

    </span>
  );
}
