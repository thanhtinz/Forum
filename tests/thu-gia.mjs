import net from 'node:net';

/*
 * MÁY CHỦ THƯ GIẢ, đủ nói chuyện cho `nodemailer` tin là thật.
 *
 * VÌ SAO CẦN: phần xin mã đặt lại mật khẩu gửi một lá thư thật ra ngoài, mà
 * bài kiểm thì tuyệt đối không được gửi thư thật — không ai muốn mỗi lượt chạy
 * bộ kiểm lại bắn một nắm thư vào hòm thư của người khác, và cũng không ai
 * muốn phép kiểm phụ thuộc vào một máy chủ thư ngoài Internet.
 *
 * Nói được đúng chừng này lệnh SMTP, không hơn: chào, EHLO, AUTH, MAIL, RCPT,
 * DATA, QUIT. Không TLS, không kiểm mật khẩu — nó nằm ở máy này và chỉ sống
 * trong lúc bài kiểm chạy.
 *
 * Thư nhận được cất nguyên văn vào mảng `thu` để bài kiểm soi: có đúng cái
 * đường dẫn ấy trong thân thư không, gửi tới đúng ai không.
 */
export function moThuGia(cong) {
  const thu = [];

  const may = net.createServer((o) => {
    let dem = '';
    let dangNhanThan = false;
    let than = '';
    let toi = '';

    const noi = (d) => o.write(`${d}\r\n`);
    noi('220 localhost SunnyStore kiem thu');

    o.on('data', (mieng) => {
      dem += mieng.toString('utf8');

      // Thân thư kết thúc bằng một dòng chỉ có dấu chấm.
      if (dangNhanThan) {
        const het = dem.indexOf('\r\n.\r\n');
        if (het === -1) return;
        than += dem.slice(0, het);
        dem = dem.slice(het + 5);
        dangNhanThan = false;
        thu.push({ toi, than });
        than = '';
        noi('250 2.0.0 OK');
      }

      let cat;
      while ((cat = dem.indexOf('\r\n')) !== -1) {
        const dong = dem.slice(0, cat);
        dem = dem.slice(cat + 2);
        const lenh = dong.toUpperCase();

        if (lenh.startsWith('EHLO') || lenh.startsWith('HELO')) {
          // Khai AUTH để `nodemailer` chịu gửi phần đăng nhập rồi đi tiếp;
          // không khai thì nó báo máy chủ không nhận đăng nhập và bỏ cuộc.
          noi('250-localhost');
          noi('250-AUTH PLAIN LOGIN');
          noi('250 SIZE 10485760');
        } else if (lenh.startsWith('AUTH')) {
          noi('235 2.7.0 Accepted');
        } else if (lenh.startsWith('MAIL FROM')) {
          noi('250 2.1.0 OK');
        } else if (lenh.startsWith('RCPT TO')) {
          toi = (dong.match(/<([^>]*)>/) ?? [])[1] ?? '';
          noi('250 2.1.5 OK');
        } else if (lenh.startsWith('DATA')) {
          dangNhanThan = true;
          noi('354 End data with <CR><LF>.<CR><LF>');
          return;
        } else if (lenh.startsWith('QUIT')) {
          noi('221 2.0.0 Bye');
          o.end();
          return;
        } else {
          noi('250 2.0.0 OK');
        }
      }
    });

    o.on('error', () => { /* máy khách ngắt giữa chừng là chuyện thường */ });
  });

  const san = new Promise((xong, hong) => {
    may.once('error', hong);
    may.listen(cong, '127.0.0.1', xong);
  });

  return {
    thu,
    san,
    dong: () => new Promise((xong) => may.close(xong)),
  };
}

/**
 * Giải mã thân thư về chữ đọc được.
 *
 * `nodemailer` không gửi chữ trần lên đường: chữ tiếng Việt có dấu nên nó bọc
 * lại bằng `quoted-printable` hoặc `base64` tuỳ nội dung. Bản đầu của bài kiểm
 * tìm thẳng chuỗi trong thân thư thô rồi báo hỏng ba chỗ hoàn toàn đúng — thư
 * có đủ cả, chỉ là đang nằm dưới dạng `=C4=90=E1=BA=B7t...`.
 *
 * Chỉ lo đúng hai lối bọc ấy, vì đó là hai lối `nodemailer` dùng cho thư chữ
 * trần. Không có dòng khai thì coi như chữ trần luôn.
 */
export function docThan(tho) {
  const cat = tho.indexOf('\r\n\r\n');
  const dau = cat === -1 ? '' : tho.slice(0, cat);
  const than = cat === -1 ? tho : tho.slice(cat + 4);

  const boc = (dau.match(/content-transfer-encoding:\s*(\S+)/i) ?? [])[1]?.toLowerCase();

  if (boc === 'base64') {
    return Buffer.from(than.replace(/\r?\n/g, ''), 'base64').toString('utf8');
  }

  if (boc === 'quoted-printable') {
    return than
      // Dấu `=` cuối dòng là "câu chưa hết", nối lại chứ không phải ký tự.
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      // Chuỗi vừa ghép là từng byte một, phải đọc lại theo UTF-8 mới ra chữ.
      .replace(/[\s\S]*/, (x) => Buffer.from(x, 'binary').toString('utf8'));
  }

  return than;
}
