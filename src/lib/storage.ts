import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from './db';

export const R2_SETTING_KEY = 'r2_storage';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Tên miền công khai để đọc tệp (r2.dev hoặc domain riêng). */
  publicUrl: string;
  enabled: boolean;
}

const EMPTY: R2Config = { accountId: '', accessKeyId: '', secretAccessKey: '', bucket: '', publicUrl: '', enabled: false };

/**
 * Cấu hình Cloudflare R2. Ưu tiên biến môi trường (an toàn hơn cho khoá bí mật),
 * nếu không có thì lấy cấu hình quản trị viên nhập trong trang quản trị.
 */
export async function getR2Config(): Promise<R2Config> {
  const env: Partial<R2Config> = {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    publicUrl: process.env.R2_PUBLIC_URL ?? '',
  };
  if (env.accountId && env.accessKeyId && env.secretAccessKey && env.bucket && env.publicUrl) {
    return { ...(env as R2Config), enabled: true };
  }

  const row = await db.siteSetting.findUnique({ where: { key: R2_SETTING_KEY } });
  const v = (row?.value ?? {}) as Partial<R2Config>;
  const cfg: R2Config = {
    accountId: v.accountId ?? '',
    accessKeyId: v.accessKeyId ?? '',
    secretAccessKey: v.secretAccessKey ?? '',
    bucket: v.bucket ?? '',
    publicUrl: (v.publicUrl ?? '').replace(/\/$/, ''),
    enabled: false,
  };
  cfg.enabled = !!(v.enabled && cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucket && cfg.publicUrl);
  return cfg.enabled ? cfg : { ...EMPTY, ...cfg, enabled: false };
}

function clientFor(cfg: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

export interface StoredFile {
  /** Đường dẫn công khai để hiển thị. */
  url: string;
  /** Khoá đối tượng trên R2 (rỗng nếu lưu trên đĩa máy chủ). */
  key: string;
}

/** Sinh tên tệp không đoán được, giữ phần mở rộng. */
export function newObjectName(ext: string, prefix = 'uploads'): string {
  return `${prefix}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${ext}`;
}

/**
 * Lưu một tệp: dùng Cloudflare R2 nếu đã cấu hình, ngược lại ghi vào
 * `public/` để môi trường phát triển vẫn chạy được.
 */
export async function putFile(body: Buffer, name: string, contentType: string): Promise<StoredFile> {
  const cfg = await getR2Config();

  if (cfg.enabled) {
    await clientFor(cfg).send(new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: name,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return { url: `${cfg.publicUrl}/${name}`, key: name };
  }

  const dest = path.join(process.cwd(), 'public', name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, body);
  return { url: `/${name}`, key: '' };
}

/** Xoá tệp trên R2 (bỏ qua nếu tệp nằm trên đĩa máy chủ). */
export async function deleteFile(key: string): Promise<void> {
  if (!key) return;
  const cfg = await getR2Config();
  if (!cfg.enabled) return;
  await clientFor(cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key })).catch(() => {});
}

/** Đoán kiểu ảnh từ vài byte đầu — an toàn hơn tin vào header của client. */
export function sniffImage(b: Buffer): { mime: string; ext: string } | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (b.toString('ascii', 0, 3) === 'GIF') return { mime: 'image/gif', ext: 'gif' };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  // SVG: tệp văn bản, kiểm tra vài trăm byte đầu
  const head = b.toString('utf8', 0, Math.min(b.length, 300)).trim().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    if (head.includes('<svg')) return { mime: 'image/svg+xml', ext: 'svg' };
  }
  return null;
}
