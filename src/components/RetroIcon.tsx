/**
 * Icon pixel của forum wap ngày trước (bộ icon JohnCMS).
 *
 * Vì sao dùng `<img>` chứ không phải `next/image`: đây là ảnh 16×16 nằm sẵn
 * trong `public/`, nhỏ hơn cả phần mã mà bộ tối ưu ảnh sinh ra để phục vụ
 * chúng. Tối ưu ở đây chỉ tổ chậm hơn.
 *
 * `image-rendering: pixelated` là phần quan trọng nhất: bộ icon này vẽ từng
 * điểm ảnh một, để trình duyệt làm mịn thì mất sạch nét — nhòe nhoẹt và trông
 * như ảnh hỏng chứ không ra hoài cổ.
 */
export function RetroIcon({
  name, alt = '', size = 16, w, h, className,
}: {
  /** Đường dẫn trong `public/retro`, không kèm đuôi — vd `bb/bold` hay `award`. */
  name: string;
  alt?: string;
  /** Cạnh vuông. Icon không vuông (huy hiệu ON/OFF, dải sao) thì đặt `w`/`h`. */
  size?: number;
  w?: number;
  h?: number;
  className?: string;
}) {
  const ext = RETRO_PNG.has(name) ? 'png' : 'gif';
  const rong = w ?? size;
  const cao = h ?? size;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/retro/${name}.${ext}`}
      alt={alt}
      width={rong}
      height={cao}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={{ imageRendering: 'pixelated', width: rong, height: cao, objectFit: 'contain' }}
    />
  );
}

/**
 * Icon nào là .png, còn lại là .gif.
 *
 * Bộ icon gốc trộn hai định dạng chẳng theo quy luật nào, mà đoán sai đuôi thì
 * ra ảnh vỡ — nên liệt kê thẳng ra đây, thêm icon mới thì thêm vào danh sách.
 */
const RETRO_PNG = new Set([
  'award', 'balans', 'birthday', 'card', 'cat', 'code', 'coins', 'contacts', 'del',
  'dislike', 'down', 'facebook', 'forbidden', 'gift', 'google', 'home', 'label',
  'lock', 'm', 'm_new', 'mail', 'mail-inbox', 'mail-info', 'mail-send',
  'menu_cabinet', 'menu_home', 'menu_login', 'menu_online', 'menu_registration',
  'mission', 'modules', 'network', 'post', 'question', 'quote_icon', 'search',
  'settings', 'tinnhiem', 'topic', 'tuthien', 'up', 'user', 'user-block',
  'user-edit', 'user-ok', 'users', 'w', 'w_new',
  'bb/img', 'bb/youtube',
]);
