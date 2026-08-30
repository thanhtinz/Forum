#!/usr/bin/env node
/**
 * Dựng tấm biển "ĐƠN HÀNG" cho nông trại từ chính tấm `bxh.png` của bản gốc.
 *
 * Chạy:  node scripts/ve-bien-don-hang.mjs
 *
 * Vì sao không vẽ tay một tấm biển mới: đã thử, và nó xấu. Khung gỗ, bóng đổ,
 * vân gỗ, hai cái cột — mỗi thứ lệch một chút so với tấm gốc là cả cảnh nhìn
 * ra đồ ghép từ hai bộ ảnh. Chép nguyên khung rồi chỉ thay phần chữ thì hai
 * tấm biển giống nhau như đúc, vì chúng LÀ một tấm.
 *
 * Chữ cái cũng lấy từ chính tấm ấy: H, N, G, A cắt thẳng ra khỏi "BẢNG XẾP
 * HẠNG". Chỉ Đ và Ơ là phải vẽ, vì cả câu gốc không có chữ nào chứa D hay O.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const GOC = 'public/hoai-niem/nongtrai/o-dat/bxh.png';
const RA = 'public/hoai-niem/nongtrai/o-dat/bangdon.png';

// ── Đọc PNG bằng tay: chỉ cần đúng một tấm, không đáng kéo thêm thư viện ──
function docPng(tep) {
  const b = fs.readFileSync(tep);
  let i = 8, rong = 0, cao = 0, sau = 0, loai = 0;
  const dl = [];
  while (i < b.length) {
    const n = b.readUInt32BE(i);
    const ten = b.toString('ascii', i + 4, i + 8);
    const than = b.subarray(i + 8, i + 8 + n);
    if (ten === 'IHDR') {
      rong = than.readUInt32BE(0); cao = than.readUInt32BE(4);
      sau = than[8]; loai = than[9];
    } else if (ten === 'IDAT') dl.push(than);
    i += 12 + n;
  }
  if (sau !== 8 || loai !== 6) throw new Error(`chỉ đọc được RGBA 8 bit, tấm này là ${sau}/${loai}`);
  const th = zlib.inflateSync(Buffer.concat(dl));
  const px = Buffer.alloc(rong * cao * 4);
  const bpp = 4, buoc = rong * bpp;
  for (let y = 0; y < cao; y++) {
    const loc = th[y * (buoc + 1)];
    const hang = th.subarray(y * (buoc + 1) + 1, y * (buoc + 1) + 1 + buoc);
    for (let x = 0; x < buoc; x++) {
      const a = x >= bpp ? px[y * buoc + x - bpp] : 0;
      const b2 = y > 0 ? px[(y - 1) * buoc + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * buoc + x - bpp] : 0;
      let v = hang[x];
      if (loc === 1) v += a;
      else if (loc === 2) v += b2;
      else if (loc === 3) v += (a + b2) >> 1;
      else if (loc === 4) {
        const p = a + b2 - c, pa = Math.abs(p - a), pb = Math.abs(p - b2), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c;
      }
      px[y * buoc + x] = v & 0xff;
    }
  }
  return { rong, cao, px };
}

function ghiPng(tep, { rong, cao, px }) {
  const buoc = rong * 4;
  const th = Buffer.alloc((buoc + 1) * cao);
  for (let y = 0; y < cao; y++) {
    th[y * (buoc + 1)] = 0;
    px.copy(th, y * (buoc + 1) + 1, y * buoc, (y + 1) * buoc);
  }
  const khoi = (ten, than) => {
    const b = Buffer.alloc(12 + than.length);
    b.writeUInt32BE(than.length, 0);
    b.write(ten, 4, 'ascii');
    than.copy(b, 8);
    b.writeUInt32BE(crc(Buffer.concat([Buffer.from(ten, 'ascii'), than])), 8 + than.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(rong, 0); ihdr.writeUInt32BE(cao, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  fs.mkdirSync(path.dirname(tep), { recursive: true });
  fs.writeFileSync(tep, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    khoi('IHDR', ihdr),
    khoi('IDAT', zlib.deflateSync(th, { level: 9 })),
    khoi('IEND', Buffer.alloc(0)),
  ]));
}

let BANG_CRC = null;
function crc(b) {
  if (!BANG_CRC) {
    BANG_CRC = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      BANG_CRC[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const v of b) c = BANG_CRC[(c ^ v) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── Bảng màu của tấm gốc ──
const MAU = {
  u: [0x6b, 0x49, 0x00, 255],   // nét chữ đậm
  z: [0xff, 0xe7, 0xc1, 255],   // viền sáng của nét
  e: [0xff, 0xcb, 0x7b, 255],   // mặt gỗ
};

const anh = docPng(GOC);
const dat = (x, y, m) => {
  if (x < 0 || y < 0 || x >= anh.rong || y >= anh.cao) return;
  const i = (y * anh.rong + x) * 4;
  anh.px[i] = m[0]; anh.px[i + 1] = m[1]; anh.px[i + 2] = m[2]; anh.px[i + 3] = m[3];
};
const lay = (x, y) => {
  const i = (y * anh.rong + x) * 4;
  return [anh.px[i], anh.px[i + 1], anh.px[i + 2], anh.px[i + 3]];
};
const laMau = (c, m) => c[0] === m[0] && c[1] === m[1] && c[2] === m[2];

/** Cắt một chữ ra khỏi tấm gốc thành bản đồ ký tự. */
function catChu(x0, x1, y0, y1) {
  const o = [];
  for (let y = y0; y <= y1; y++) {
    let h = '';
    for (let x = x0; x <= x1; x++) {
      const c = lay(x, y);
      h += laMau(c, MAU.u) ? 'u' : laMau(c, MAU.z) ? 'z' : '.';
    }
    o.push(h);
  }
  return o;
}

// Thân chữ dòng 1 nằm ở hàng 12..17, dòng 2 ở hàng 21..26.
const CHU = {
  N: catChu(23, 26, 12, 17),
  G: catChu(28, 31, 12, 17),
  H: catChu(20, 23, 21, 26),
  A: catChu(25, 28, 21, 26),   // lấy từ Ạ, dấu nặng nằm dưới hàng 26 nên không dính
  // Đ và Ơ vẽ tay theo đúng lối hai tông của bộ gốc: nét đậm ở trên và bên
  // trái, viền sáng ở dưới và bên phải.
  'Đ': [
    '.uuu.',
    '.uz.u',
    'uuu.u',
    '.uz.u',
    '.uuuz',
    '..zzz',
  ],
  'Ơ': [
    '.uu.u',
    'uzzuu',
    'uz.u.',
    'uz.u.',
    '.uuz.',
    '..zz.',
  ],
};

/** Dấu huyền, đặt phía trên chữ. */
const HUYEN = ['.u..', '..u.'];

// ── Xoá chữ cũ: tô phẳng vùng chữ bằng màu mặt gỗ ──
for (const [x0, y0, x1, y1] of [[12, 8, 33, 18], [4, 19, 39, 27]]) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dat(x, y, MAU.e);
}

/** Dán một bản đồ ký tự lên tấm ảnh. */
function dan(hinh, x0, y0) {
  hinh.forEach((h, dy) => [...h].forEach((c, dx) => {
    if (c === 'u') dat(x0 + dx, y0 + dy, MAU.u);
    else if (c === 'z') dat(x0 + dx, y0 + dy, MAU.z);
  }));
}

/** Viết một dòng, căn giữa theo bề ngang tấm biển. */
function vietDong(chuoi, y, dauHuyenO = -1) {
  const gl = [...chuoi].map((c) => (c === ' ' ? null : CHU[c]));
  const rong = gl.reduce((t, g) => t + (g ? g[0].length : 2) + 1, -1);
  let x = Math.round((anh.rong - rong) / 2);
  gl.forEach((g, i) => {
    if (g) {
      dan(g, x, y);
      if (i === dauHuyenO) dan(HUYEN, x, y - 3);
      x += g[0].length + 1;
    } else x += 3;
  });
}

vietDong('ĐƠN', 12);
// Viết 'HANG' rồi mới đội dấu huyền lên chữ thứ hai: tra bảng bằng 'À' thì
// trượt, vì bảng chữ cắt ra từ tấm gốc chỉ có chữ CÁI trần, dấu để riêng.
vietDong('HANG', 21, 1);

ghiPng(RA, anh);
console.log(`✓ Đã dựng ${RA} (${anh.rong}×${anh.cao}) từ ${GOC}`);
