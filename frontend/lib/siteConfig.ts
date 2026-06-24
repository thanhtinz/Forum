'use client';

import useSWR from 'swr';
import { fetcher } from './api';

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  contactEmail: string;
  logo: string;
  logoSmall: string;
  favicon: string;
  primaryColor: string;
  heroTitle: string;
  heroDescription: string;
  footerText: string;
}

const DEFAULTS: SiteConfig = {
  name: 'Trạm GenZ',
  tagline: 'Cộng đồng anime & manga Việt Nam',
  description: 'Cộng đồng anime, manga, hoạt hình — xem phim, đọc truyện, thảo luận tại Trạm GenZ.',
  contactEmail: '',
  logo: '',
  logoSmall: '',
  favicon: '',
  primaryColor: '',
  heroTitle: 'Chào mừng đến Trạm GenZ',
  heroDescription: 'Cộng đồng anime & manga — xem hoạt hình, đọc truyện, thảo luận cùng bạn bè.',
  footerText: '© {year} Trạm GenZ',
};

export function useSiteConfig(): SiteConfig {
  const { data } = useSWR<Partial<SiteConfig>>('/site-config', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return { ...DEFAULTS, ...(data || {}) };
}
