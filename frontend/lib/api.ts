'use client';

// Client API gọi tới backend NestJS (qua rewrite /api -> :3001/api)
const TOKEN_KEY = 'forum_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Unified deploy: NestJS phục vụ cùng origin -> '/api' tương đối.
  // Dev tách: đặt NEXT_PUBLIC_API_URL=http://localhost:3001 (hoặc dùng rewrite của next dev).
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  const res = await fetch(`${base}/api${path}`, { ...options, headers, cache: 'no-store' });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.message || res.statusText;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return body as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, data?: unknown) =>
    request<T>(p, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(p: string, data?: unknown) =>
    request<T>(p, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(p: string, data?: unknown) =>
    request<T>(p, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};

export const fetcher = <T>(p: string) => api.get<T>(p);

// Upload ảnh trực tiếp lên server (multipart). KHÔNG set Content-Type để
// trình duyệt tự thêm boundary cho multipart/form-data.
export async function uploadImage(file: File): Promise<{ url: string }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  const form = new FormData();
  form.append('file', file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/api/media/upload`, {
    method: 'POST',
    headers,
    body: form,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.message || res.statusText;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return body as { url: string };
}
