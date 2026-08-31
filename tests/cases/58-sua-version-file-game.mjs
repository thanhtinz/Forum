import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Sửa version / file ở trang quản trị game không được xoá trắng dữ liệu cũ.
 *
 * `upsertVersion` và `upsertFile` dùng chung một khối `data` cho cả tạo mới lẫn
 * sửa, mà biểu mẫu lại KHÔNG nạp sẵn giá trị đang lưu — nên đổi một chữ trong
 * số hiệu version là ghi `null` đè lên changelog, dung lượng, ghi chú và
 * GIÁ ĐIỂM (một bản game đang bán tự thành miễn phí).
 *
 * Nặng nhất là ở file: ô "Kết quả quét" không có mục rỗng nên mỗi lượt lưu là
 * `scanStatus` rơi về PENDING — sửa tên một tệp đang bị CÁCH LY là vô tình cho
 * tải lại, vì đường tải chỉ chặn đúng trạng thái QUARANTINED.
 */
export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, role: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }
  await db.user.update({ where: { id: me.id }, data: { role: 'ADMIN' } });

  const game = await db.game.create({
    data: { slug: `sua-version-${Date.now()}`, title: 'Game Sửa Version', status: 'PUBLISHED', publishedAt: new Date() },
  });
  const v = await db.gameVersion.create({
    data: {
      gameId: game.id, platform: 'WINDOWS', version: '1.0', latest: true,
      pricePoints: 777, changelog: 'Changelog phải còn nguyên', note: 'ghi chú cũ',
      sizeBytes: 12_345_678n, releaseDate: new Date('2026-01-15'),
    },
  });
  const f = await db.gameFile.create({
    data: {
      versionId: v.id, type: 'EXE', storageKey: 'a/b.exe', fileName: 'cu.exe',
      scanStatus: 'QUARANTINED', checksumAlgo: 'sha512', checksum: 'abc',
      mimeType: 'application/x-msdownload', scanNote: 'nghi ngờ',
    },
  });

  // try/finally: bài này lập một game PUBLISHED, mà `11-game-price` lại bốc
  // `findFirst` game published bất kỳ — sót lại một game kiểm thử là bài ấy đỏ
  // oan vì bốc trúng game có bản khoá điểm và tệp bị cách ly.
  try {
    const p = await openPage('minhdev');
    await p.goto(`${BASE}/admin/games/${game.id}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);

    // ── Version ──────────────────────────────────────────────────────────
    // Hai biểu mẫu trên trang đều có ô `versionId`, nên bám vào ô chỉ VersionForm
    // mới có (`platform`) chứ không lấy ô trùng tên đầu tiên.
    const fV = p.locator('form:has(select[name="platform"])');
    await fV.locator('select[name="versionId"]').selectOption(v.id);
    await p.waitForTimeout(400);

    check('chọn version có sẵn thì giá điểm được nạp sẵn',
      (await fV.locator('input[name="pricePoints"]').inputValue()) === '777');
    check('chọn version có sẵn thì changelog được nạp sẵn',
      (await fV.locator('textarea[name="changelog"]').inputValue()) === 'Changelog phải còn nguyên');
    check('chọn version có sẵn thì ngày phát hành được nạp sẵn',
      (await fV.locator('input[name="releaseDate"]').inputValue()) === '2026-01-15');

    await fV.locator('input[name="version"]').fill('1.1');
    await fV.locator('button[type=submit]').click();
    await doiToi(async () => (await db.gameVersion.findUnique({ where: { id: v.id } })).version === '1.1');

    const sau = await db.gameVersion.findUnique({ where: { id: v.id } });
    check('đổi số hiệu thì số hiệu đổi thật', sau.version === '1.1', sau.version);
    check('sửa version KHÔNG xoá mất giá điểm', sau.pricePoints === 777, String(sau.pricePoints));
    check('sửa version KHÔNG xoá mất changelog',
      sau.changelog === 'Changelog phải còn nguyên', String(sau.changelog));
    check('sửa version KHÔNG xoá mất ghi chú', sau.note === 'ghi chú cũ', String(sau.note));
    check('sửa version KHÔNG xoá mất dung lượng',
      String(sau.sizeBytes) === '12345678', String(sau.sizeBytes));
    check('sửa version KHÔNG xoá mất ngày phát hành',
      sau.releaseDate?.toISOString().slice(0, 10) === '2026-01-15', String(sau.releaseDate));

    // ── File ─────────────────────────────────────────────────────────────
    await p.goto(`${BASE}/admin/games/${game.id}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const fF = p.locator('form:has(select[name="fileId"])');
    await fF.locator('select[name="fileId"]').selectOption(f.id);
    await p.waitForTimeout(400);

    check('chọn file có sẵn thì trạng thái quét được nạp sẵn',
      (await fF.locator('select[name="scanStatus"]').inputValue()) === 'QUARANTINED');
    check('chọn file có sẵn thì storage key được nạp sẵn',
      (await fF.locator('input[name="storageKey"]').inputValue()) === 'a/b.exe');

    await fF.locator('input[name="fileName"]').fill('moi.exe');
    await fF.locator('button[type=submit]').click();
    await doiToi(async () => (await db.gameFile.findUnique({ where: { id: f.id } })).fileName === 'moi.exe');

    const fSau = await db.gameFile.findUnique({ where: { id: f.id } });
    check('đổi tên file thì tên đổi thật', fSau.fileName === 'moi.exe', String(fSau.fileName));
    check('sửa file KHÔNG gỡ cách ly',
      fSau.scanStatus === 'QUARANTINED', fSau.scanStatus);
    check('sửa file KHÔNG reset thuật toán checksum',
      fSau.checksumAlgo === 'sha512', fSau.checksumAlgo);
    check('sửa file KHÔNG xoá mất kiểu MIME',
      fSau.mimeType === 'application/x-msdownload', String(fSau.mimeType));
    check('sửa file KHÔNG xoá mất checksum và ghi chú quét',
      fSau.checksum === 'abc' && fSau.scanNote === 'nghi ngờ');

    // Tệp vẫn bị cách ly thì đường tải vẫn phải chặn.
    const taiVe = await p.evaluate(async ([base, slug]) => {
      const r = await fetch(`${base}/api/games/${slug}/download?type=EXE`);
      return { status: r.status, body: await r.json().catch(() => ({})) };
    }, [BASE, game.slug]);
    check('tệp còn cách ly thì đường tải vẫn chặn',
      taiVe.status === 423 && taiVe.body.error === 'FILE_QUARANTINED',
      `${taiVe.status} ${taiVe.body.error}`);

    // ── Cảnh báo đè file ─────────────────────────────────────────────────
    // Gắn file MỚI vào đúng cặp version + loại đã có: `upsertFile` ghi theo khoá
    // `versionId_type` nên sẽ đè lên, phải nói trước chứ không báo "Đã lưu."
    // y như lúc tạo mới thật.
    await fF.locator('select[name="fileId"]').selectOption('');
    await fF.locator('select[name="versionId"]').selectOption(v.id);
    await fF.locator('select[name="type"]').selectOption('EXE');
    await p.waitForTimeout(400);
    check('gắn file mới đè lên cặp đã có thì được cảnh báo trước',
      (await fF.innerText()).includes('đè lên'));

  } finally {
    await db.game.deleteMany({ where: { id: game.id } });
    await db.user.update({ where: { id: me.id }, data: { role: me.role } });
  }
}
