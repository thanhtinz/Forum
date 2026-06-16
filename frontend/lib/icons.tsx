'use client';

// Bộ icon CSS dùng chung (lucide). Toàn hệ thống (trừ chat + reaction diễn đàn)
// dùng icon ở đây thay cho emoji. Badge/level lưu TÊN icon (string) trong DB,
// admin chọn từ ICON_OPTIONS; <Icon name="..."/> render ra component lucide.

import {
  Award, Shield, ShieldCheck, BadgeCheck, Star, Crown, Trophy, Medal,
  Gem, Coins, Wallet, Flame, Heart, ThumbsUp, MessageSquare, MessageCircle,
  Pen, PenLine, FileText, Sprout, Leaf, Zap, Rocket, Sparkles, Gift,
  Store, ShoppingBag, Tag, Users, User, Bookmark, Bell, CheckCircle2,
  Target, Swords, Wand2, Brain, BookOpen, Gamepad2, Fish, Anchor,
  Lock, Key, Sun, Moon, Droplet, Diamond, Hexagon, Circle, ShieldHalf,
  TrendingUp, Handshake, Megaphone, Clock, Eye, Calendar, type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  Award, Shield, ShieldCheck, ShieldHalf, BadgeCheck, Star, Crown, Trophy, Medal,
  Gem, Coins, Wallet, Flame, Heart, ThumbsUp, MessageSquare, MessageCircle,
  Pen, PenLine, FileText, Sprout, Leaf, Zap, Rocket, Sparkles, Gift,
  Store, ShoppingBag, Tag, Users, User, Bookmark, Bell, CheckCircle2,
  Target, Swords, Wand2, Brain, BookOpen, Gamepad2, Fish, Anchor,
  Lock, Key, Sun, Moon, Droplet, Diamond, Hexagon, Circle,
  TrendingUp, Handshake, Megaphone, Clock, Eye, Calendar,
};

// Danh sách tên cho bộ chọn icon trong admin.
export const ICON_OPTIONS = Object.keys(ICONS);

export function Icon({
  name,
  size = 16,
  className,
}: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const Cmp = (name && ICONS[name]) || Award;
  return <Cmp size={size} className={className} />;
}

// Render icon của badge: nếu là URL ảnh (admin tải lên) -> <img>;
// nếu là tên icon lucide (badge hệ thống / mặc định) -> <Icon>.
export function isAssetIcon(icon?: string | null): boolean {
  return !!icon && /^(https?:\/\/|\/)/.test(icon);
}

export function BadgeIcon({
  icon,
  size = 16,
  className,
}: {
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  if (isAssetIcon(icon)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon as string} alt="" width={size} height={size} className={`inline-block rounded object-cover ${className || ''}`} style={{ width: size, height: size }} />;
  }
  return <Icon name={icon} size={size} className={className} />;
}

// Bộ chọn icon cho admin: lưới các icon, bấm để chọn.
export function IconPicker({
  value,
  onChange,
  className = '',
}: {
  value?: string;
  onChange: (name: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-ink-200 p-2 dark:border-ink-800 ${className}`}>
      {ICON_OPTIONS.map((n) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            title={n}
            onClick={() => onChange(n)}
            className={`grid h-8 w-8 place-items-center rounded-md ${active ? 'bg-brand-600 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-800'}`}
          >
            <Icon name={n} size={16} />
          </button>
        );
      })}
    </div>
  );
}

export default Icon;
