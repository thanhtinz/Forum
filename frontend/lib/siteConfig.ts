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
  tagline: 'Cộng đồng mạng xã hội Việt Nam',
  description: 'Diễn đàn thảo luận, kết nối cộng đồng tại Trạm GenZ.',
  contactEmail: '',
  logo: '',
  logoSmall: '',
  favicon: '',
  primaryColor: '',
  heroTitle: 'Chào mừng đến Trạm GenZ',
  heroDescription: 'Cộng đồng diễn đàn — kết nối, thảo luận cùng bạn bè.',
  footerText: '© {year} Trạm GenZ',
};

export function useSiteConfig(): SiteConfig {
  const { data } = useSWR<Partial<SiteConfig>>('/site-config', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return { ...DEFAULTS, ...(data || {}) };
}
