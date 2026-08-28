import { chromium } from 'playwright-core';
import fs from 'node:fs';
const R='/home/user/Forum/public/retro';
const dung = [
 ['topic','"Chủ đề" — thống kê + hồ sơ'],
 ['post','"Bài trả lời" — thống kê'],
 ['users','"Thành viên" / "người theo dõi"'],
 ['network','"đang theo dõi"'],
 ['contacts','"bạn bè"'],
 ['album-1','"album ảnh"'],
 ['album-2','(chưa dùng)'],
 ['album-3','(chưa dùng)'],
 ['album-4','(chưa dùng)'],
 ['coins','"điểm"'],
 ['tinnhiem','"uy tín"'],
 ['m','tin nhắn ĐÃ đọc'],
 ['m_new','tin nhắn CHƯA đọc'],
 ['w','(chưa dùng)'],
 ['w_new','(chưa dùng)'],
 ['mail','(chưa dùng)'],
 ['mail-inbox','(chưa dùng)'],
 ['mail-send','(chưa dùng)'],
 ['guestbook','"Sổ lưu bút"'],
 ['vote','"Bình chọn"'],
 ['lock','chủ đề khoá + nút [hide]'],
 ['bb/php','"Mã nguồn"'],
 ['code','(chưa dùng)'],
 ['photo','(chưa dùng)'],
 ['talk','(chưa dùng)'],
 ['label','(chưa dùng)'],
 ['award','(chưa dùng)'],
];
const ext = (n) => fs.existsSync(`${R}/${n}.png`) ? 'png' : 'gif';
const rows = dung.map(([n,l])=>{
  const e=ext(n);
  const b64=fs.readFileSync(`${R}/${n}.${e}`).toString('base64');
  return `<tr><td><img src="data:image/${e};base64,${b64}"></td><td class=n>${n}.${e}</td><td class=l>${l}</td></tr>`;
}).join('');
fs.writeFileSync('/tmp/kiem.html',`<!doctype html><meta charset=utf-8><style>
body{background:#fff;font:13px system-ui;padding:16px}
table{border-collapse:collapse}
td{padding:9px 14px;border-bottom:1px solid #eee;vertical-align:middle}
img{image-rendering:pixelated;transform:scale(3);transform-origin:left center;margin-left:18px}
.n{font:11px monospace;color:#666;padding-left:56px}
.l{font-weight:600;color:#111}
</style><table>${rows}</table>`);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:620,height:1240},deviceScaleFactor:2});
await p.goto('file:///tmp/kiem.html'); await p.screenshot({path:'/tmp/kiem.png',fullPage:true});
await b.close();
