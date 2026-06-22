import type { CSSProperties } from 'react';

// Chuyển chuỗi khai báo CSS (admin nhập, vd: "color:#f00; background:linear-gradient(...);
// -webkit-background-clip:text; -webkit-text-fill-color:transparent;") thành object style React.
export function cssToStyle(css?: string | null): CSSProperties | undefined {
  if (!css || typeof css !== 'string') return undefined;
  const style: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const rawKey = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!rawKey || !value) continue;
    const vendor = rawKey.startsWith('-');
    const clean = vendor ? rawKey.slice(1) : rawKey;
    let key = clean.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    // Vendor prefix (trừ -ms-) phải viết hoa chữ đầu trong React: -webkit-… -> Webkit…
    if (vendor && !key.startsWith('ms')) key = key.charAt(0).toUpperCase() + key.slice(1);
    style[key] = value;
  }
  return style as CSSProperties;
}
