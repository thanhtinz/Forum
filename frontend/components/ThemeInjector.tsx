'use client';

import { useEffect } from 'react';
import { useSiteConfig } from '@/lib/siteConfig';
import { generateBrandRamp, isValidHex, BRAND_SHADES } from '@/lib/colorRamp';

const STYLE_ID = 'theme-vars-override';

// Áp màu chủ đạo (site.primaryColor) + CSS tuỳ chỉnh (site.customCss) do admin đặt, lúc chạy —
// vì frontend là static export nên không build lại được, phải ghi đè CSS variable qua client.
export function ThemeInjector() {
  const cfg = useSiteConfig();

  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    let css = '';
    if (cfg.primaryColor && isValidHex(cfg.primaryColor)) {
      const ramp = generateBrandRamp(cfg.primaryColor);
      const vars = BRAND_SHADES.map((s) => `--brand-${s}: ${ramp[s]};`).join(' ');
      css += `:root { ${vars} }\n`;
    }
    if (cfg.customCss) css += cfg.customCss;
    style.textContent = css;
  }, [cfg.primaryColor, cfg.customCss]);

  return null;
}
