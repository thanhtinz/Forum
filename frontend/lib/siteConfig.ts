'use client';

import useSWR from 'swr';
import { fetcher } from './api';

export interface HomeWidget { key: string; label: string; enabled: boolean }

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  contactEmail: string;
  logo: string;
  logoSmall: string;
  favicon: string;
  primaryColor: string;
  customCss: string;
  homeWidgets: HomeWidget[];
  heroTitle: string;
  heroDescription: string;
  footerText: string;
  googleLoginEnabled: boolean;
  googleClientId: string;
}

export const DEFAULT_HOME_WIDGETS: HomeWidget[] = [
  { key: 'community', label: 'Cộng đồng', enabled: true },
  { key: 'stats', label: 'Thống kê', enabled: true },
  { key: 'trending', label: 'Nổi bật', enabled: true },
  { key: 'newMembers', label: 'Thành viên mới', enabled: true },
];

const DEFAULTS: SiteConfig = {
  name: 'Trạm GenZ',
  tagline: 'Cộng đồng mạng xã hội Việt Nam',
  description: 'Diễn đàn thảo luận, kết nối cộng đồng tại Trạm GenZ.',
  contactEmail: '',
  logo: '',
  logoSmall: '',
  favicon: '',
  primaryColor: '',
  customCss: '',
  homeWidgets: DEFAULT_HOME_WIDGETS,
  heroTitle: 'Chào mừng đến Trạm GenZ',
  heroDescription: 'Cộng đồng diễn đàn — kết nối, thảo luận cùng bạn bè.',
  footerText: '© {year} Trạm GenZ',
  googleLoginEnabled: false,
  googleClientId: '',
};

export function useSiteConfig(): SiteConfig {
  const { data } = useSWR<Partial<SiteConfig>>('/site-config', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return {
    ...DEFAULTS,
    ...(data || {}),
    // Danh sách rỗng (config chưa seed xong) không nên xoá hết widget mặc định.
    homeWidgets: data?.homeWidgets?.length ? data.homeWidgets : DEFAULTS.homeWidgets,
  };
}
