import { db } from '@/lib/db';
import type { MaHeMay } from '@/lib/he-may';
import { MO_TA_HE } from '@/lib/he-may';

/*
 * Nhiều nhất bao nhiêu người được báo trong MỘT lần ra bản.
 *
 * Có trần vì đây là việc chạy TRONG lượt bấm nút của quản trị: một game vài
 * vạn người tải mà ghi vài vạn hàng thông báo thì nút "Đặt bản mới nhất" treo
 * cả phút, rồi hết hạn, rồi quản trị bấm lại — và lần bấm thứ hai ghi tiếp từ
 * đầu. Thà báo cho 500 người tải gần đây nhất còn hơn làm đổ cả thao tác.
 */
const TOI_DA_BAO = 500;

/**
 * Báo cho những người đã tải game này rằng đã có bản mới hơn bản họ đang có.
 *
 * VÌ SAO ĐẨY CHỨ KHÔNG ĐỂ NGƯỜI TA TỰ VÀO XEM: trang "Bản cập nhật" đã tính
 * sẵn danh sách này, nhưng nó chỉ hiện ra cho ai tự nhớ mà mở. Người tải một
 * bản JAR về máy rồi để đấy hàng tháng thì không có lý do gì quay lại — mà
 * đúng người ấy mới là người cần biết bản vá lỗi treo máy đã ra.
 *
 * Nuốt mọi lỗi, y như `guiThongBao`: việc chính ở đây là RA BẢN MỚI, và mất
 * một loạt thông báo thì tiếc, chứ để nó kéo đổ lượt ra bản thì tệ hơn nhiều.
 */
export async function baoBanMoi(gameId: string, heMay: MaHeMay, soHieu: string): Promise<number> {
  try {
    // Game còn nháp hay đã gỡ thì im lặng: báo về một trang người nhận bấm
    // vào sẽ gặp 404 còn tệ hơn không báo.
    const game = await db.game.findFirst({
      where: { id: gameId, trangThai: 'DANG_HIEN' },
      select: { ten: true, tenViet: true, duongDan: true },
    });
    if (!game) return 0;

    /*
     * Ai được báo: người có lượt tải ĐÚNG hệ máy ấy, và số hiệu đang giữ KHÁC
     * số hiệu vừa ra.
     *
     * Điều kiện "khác" nằm trong `where`, không lọc sau: lọc sau thì `take`
     * đếm cả những hàng sẽ bị bỏ, nên một game có nhiều người vừa tải đúng bản
     * mới sẽ ăn hết hạn ngạch và người dùng bản cũ — đúng người cần báo — lại
     * không được báo.
     */
    const daTai = await db.luotTai.findMany({
      where: { gameId, heMay, soHieu: { not: null, notIn: [soHieu] } },
      orderBy: [{ lanCuoi: 'desc' }, { id: 'desc' }],
      take: TOI_DA_BAO,
      select: { nguoiId: true },
    });
    if (daTai.length === 0) return 0;

    const ten = game.tenViet ?? game.ten;
    const tieuDe = `${ten} đã có bản ${soHieu}`;
    const chiTiet = `Bản mới cho ${MO_TA_HE[heMay].ten}`;
    const duongDan = `/game/${game.duongDan}`;

    /*
     * Bỏ qua ai đã nhận đúng tin này rồi.
     *
     * Cờ "bản mới nhất" là thứ quản trị bật tắt được, và bật nhầm rồi bật lại
     * là chuyện thường. Không chặn thì mỗi lần bật là một lượt thông báo giống
     * hệt nữa, và cái chuông mất hết giá trị.
     */
    const daBao = await db.thongBao.findMany({
      where: {
        loai: 'GAME_CO_BAN_MOI', tieuDe, duongDan,
        nguoiId: { in: daTai.map((l) => l.nguoiId) },
      },
      select: { nguoiId: true },
    });
    const boQua = new Set(daBao.map((t) => t.nguoiId));

    const canBao = [...new Set(daTai.map((l) => l.nguoiId))].filter((id) => !boQua.has(id));
    if (canBao.length === 0) return 0;

    // Ghi một lượt: vài trăm lượt `create` rời nhau là vài trăm vòng gọi CSDL.
    await db.thongBao.createMany({
      data: canBao.map((nguoiId) => ({ nguoiId, loai: 'GAME_CO_BAN_MOI' as const, tieuDe, chiTiet, duongDan })),
    });
    return canBao.length;
  } catch {
    // Nuốt lỗi có chủ ý — xem chú thích ở trên.
    return 0;
  }
}

/**
 * Báo cho những người ĐÃ LƯU game này rằng nay đã có bản cho một hệ máy MỚI.
 *
 * VÌ SAO ĐÁNG BÁO: ở cửa hàng này, lý do phổ biến nhất để một người bấm "để
 * dành" thay vì tải ngay là game chưa có bản cho máy họ — thấy một game hay mà
 * chỉ có bản Java trong khi máy mình là Android thì lưu lại là việc duy
 * nhất làm được. Ngày bản Android lên kệ mà không ai nói với họ thì cái danh
 * sách đã lưu ấy chỉ là một chỗ để quên.
 *
 * CHỈ BÁO KHI HỆ MÁY LÀ MỚI, không báo mỗi lần ra bản: người đã lưu chưa tải
 * bao giờ, nên bản 1.1 hay 1.2 của một hệ họ vốn không dùng chẳng nói gì với
 * họ cả. Còn ai đã tải rồi thì `baoBanMoi` lo, và hai hàm không giẫm chân nhau
 * vì hai bảng khác nhau: `LuotTai` ghi việc đã xảy ra, `DaLuu` ghi một ý định.
 *
 * Nuốt mọi lỗi, cùng lẽ với `baoBanMoi`: việc chính là RA BẢN, mất một loạt
 * thông báo thì tiếc, chứ để nó kéo đổ lượt ra bản thì tệ hơn nhiều.
 */
export async function baoHeMayMoi(gameId: string, heMay: MaHeMay): Promise<number> {
  try {
    const game = await db.game.findFirst({
      where: { id: gameId, trangThai: 'DANG_HIEN' },
      select: { ten: true, tenViet: true, duongDan: true },
    });
    if (!game) return 0;

    const daLuu = await db.daLuu.findMany({
      where: { gameId },
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      take: TOI_DA_BAO,
      select: { nguoiId: true },
    });
    if (daLuu.length === 0) return 0;

    const ten = game.tenViet ?? game.ten;
    const tieuDe = `${ten} nay có bản cho ${MO_TA_HE[heMay].ten}`;
    const chiTiet = 'Game bạn đã lưu vừa có bản cho hệ máy này';
    const duongDan = `/game/${game.duongDan}`;

    /*
     * Bỏ qua ai đã nhận đúng tin này rồi.
     *
     * Quản trị xoá nhầm bản rồi thêm lại là chuyện thường, mà mỗi lần thêm lại
     * là một lượt "hệ máy mới" nữa — không chặn thì cái chuông mất hết giá trị.
     */
    const daBao = await db.thongBao.findMany({
      where: {
        loai: 'GAME_CO_BAN_MOI', tieuDe, duongDan,
        nguoiId: { in: daLuu.map((d) => d.nguoiId) },
      },
      select: { nguoiId: true },
    });
    const boQua = new Set(daBao.map((t) => t.nguoiId));

    const canBao = [...new Set(daLuu.map((d) => d.nguoiId))].filter((id) => !boQua.has(id));
    if (canBao.length === 0) return 0;

    await db.thongBao.createMany({
      data: canBao.map((nguoiId) => ({
        nguoiId, loai: 'GAME_CO_BAN_MOI' as const, tieuDe, chiTiet, duongDan,
      })),
    });
    return canBao.length;
  } catch {
    // Nuốt lỗi có chủ ý — xem chú thích ở trên.
    return 0;
  }
}
