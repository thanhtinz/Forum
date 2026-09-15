import { inflateRawSync } from 'node:zlib';

/*
 * ĐỌC MỘT TỆP ZIP, tự viết lấy, không thêm thư viện.
 *
 * Dự án chỉ cần đúng một việc: mở một gói sticker ra lấy mấy tấm ảnh bên
 * trong. Thư viện zip nào cũng kéo theo cả phần GHI zip, phần mã hoá, phần
 * zip64 và mấy chục nghìn dòng mã mà chỗ này không bao giờ chạm tới — trong
 * khi phần ĐỌC thì chỉ là: tìm bảng mục lục ở cuối tệp, đi từng mục, và gọi
 * `inflateRaw` của Node cho mỗi mục.
 *
 * VÀ ĐÂY LÀ TỆP NGƯỜI NGOÀI GỬI LÊN, nên mọi con số trong nó đều là con số
 * người gửi tự đặt. Mấy chỗ chặn dưới đây không phải để cho gọn, chúng là
 * phần chính của tệp này:
 *
 *   • KHÔNG BAO GIỜ dùng tên tệp trong zip để ghi ra đĩa. Hàm này chỉ trả về
 *     RUỘT của từng mục; tên chỉ dùng để lọc đuôi và để xếp thứ tự. Nhờ vậy
 *     mấy cái tên kiểu `../../etc/passwd` chẳng làm được gì.
 *   • Có TRẦN cho số mục, cho cỡ mỗi mục sau khi bung, và cho tổng cỡ sau khi
 *     bung. Một tệp zip vài trăm kilobyte bung ra được vài gigabyte — đó là
 *     trò "bom nén", và không chặn thì nó là đường làm ngạt máy chủ rẻ nhất.
 *   • Thư mục và mục rỗng bỏ qua, không tính là ảnh hỏng.
 *
 * Không đọc zip64 và không đọc mục có mã hoá: gói sticker vài chục tấm ảnh
 * không bao giờ chạm tới hai thứ ấy, mà đọc thêm là thêm chỗ để sai.
 */

export interface MucZip {
  ten: string;
  ruot: Uint8Array;
}

export interface LuatZip {
  /** Nhiều nhất bấy nhiêu mục được lấy ra. */
  soMucToiDa: number;
  /** Mỗi mục sau khi bung nặng nhất bấy nhiêu byte. */
  moiMucToiDa: number;
  /** Tổng sau khi bung nặng nhất bấy nhiêu byte. */
  tongToiDa: number;
}

const KY_EOCD = 0x06054b50;
const KY_MUC_LUC = 0x02014b50;

function doc16(d: DataView, i: number) { return d.getUint16(i, true); }
function doc32(d: DataView, i: number) { return d.getUint32(i, true); }

/**
 * Bung một tệp zip, trả về từng mục bên trong.
 *
 * Ném lỗi khi tệp không phải zip hoặc vượt trần; gọi ở đâu thì bắt ở đấy rồi
 * đổi thành câu tiếng Việt cho người dùng.
 */
export function docZip(du: Uint8Array, luat: LuatZip): MucZip[] {
  const d = new DataView(du.buffer, du.byteOffset, du.byteLength);

  /*
   * Tìm bảng mục lục bằng cách DÒ NGƯỢC từ cuối tệp.
   *
   * Zip để bảng mục lục ở cuối, và ngay sau nó là một khối kết (EOCD) dài 22
   * byte cộng phần chú thích tuỳ ý dài tối đa 65535 byte. Nên chỉ dò trong
   * chừng ấy byte cuối chứ không quét cả tệp.
   */
  let viTriEocd = -1;
  const dayNhat = Math.max(0, du.length - (22 + 0xffff));
  for (let i = du.length - 22; i >= dayNhat; i--) {
    if (doc32(d, i) === KY_EOCD) { viTriEocd = i; break; }
  }
  if (viTriEocd < 0) throw new Error('khong-phai-zip');

  const soMuc = doc16(d, viTriEocd + 10);
  let con = doc32(d, viTriEocd + 16);
  if (soMuc > luat.soMucToiDa) throw new Error('qua-nhieu-muc');

  const ra: MucZip[] = [];
  let tong = 0;

  for (let i = 0; i < soMuc; i++) {
    if (con + 46 > du.length || doc32(d, con) !== KY_MUC_LUC) throw new Error('hong');

    const cach = doc16(d, con + 10);
    const coNen = doc32(d, con + 20);
    const coThat = doc32(d, con + 24);
    const daiTen = doc16(d, con + 28);
    const daiThem = doc16(d, con + 30);
    const daiChuThich = doc16(d, con + 32);
    const viTriCucBo = doc32(d, con + 42);

    const ten = new TextDecoder().decode(du.subarray(con + 46, con + 46 + daiTen));
    con += 46 + daiTen + daiThem + daiChuThich;

    // Thư mục: zip đánh dấu bằng dấu gạch chéo cuối tên.
    if (ten.endsWith('/') || coThat === 0) continue;

    if (coThat > luat.moiMucToiDa) throw new Error('muc-qua-nang');
    tong += coThat;
    if (tong > luat.tongToiDa) throw new Error('tong-qua-nang');

    /*
     * Phần đầu CỤC BỘ đứng ngay trước ruột, và hai ô độ dài của nó KHÔNG
     * nhất thiết bằng hai ô cùng tên trong bảng mục lục — nên phải đọc lại ở
     * đây chứ không dùng con số vừa đọc trên kia.
     */
    if (viTriCucBo + 30 > du.length) throw new Error('hong');
    const daiTenCucBo = doc16(d, viTriCucBo + 26);
    const daiThemCucBo = doc16(d, viTriCucBo + 28);
    const dau = viTriCucBo + 30 + daiTenCucBo + daiThemCucBo;
    if (dau + coNen > du.length) throw new Error('hong');

    const than = du.subarray(dau, dau + coNen);

    let ruot: Uint8Array;
    if (cach === 0) {
      ruot = than;
    } else if (cach === 8) {
      // `maxOutputLength` là cái chặn bom nén THẬT SỰ: con số `coThat` ở trên
      // do chính tệp khai, nên nó nói dối được; chỗ này thì không.
      ruot = new Uint8Array(inflateRawSync(than, { maxOutputLength: luat.moiMucToiDa }));
    } else {
      // Mấy cách nén khác (và mục có mã hoá) thì bỏ qua, không làm hỏng cả gói.
      continue;
    }

    ra.push({ ten, ruot });
  }

  return ra;
}
