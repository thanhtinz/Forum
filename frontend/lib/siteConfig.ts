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
  name: 'ForumHub',
  tagline: '',
  description: '',
  contactEmail: '',
  logo: '',
  logoSmall: '',
  favicon: '',
  primaryColor: '',
  heroTitle: 'Chào mừng đến ForumHub',
  heroDescription: 'Diễn đàn cộng đồng tích hợp game hoá — chia sẻ, thảo luận, chơi game và mua bán source code.',
  footerText: '© {year} ForumHub · NestJS + Next.js',
};

export function useSiteConfig(): SiteConfig {
  const { data } = useSWR<Partial<SiteConfig>>('/site-config', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return { ...DEFAULTS, ...(data || {}) };
}
