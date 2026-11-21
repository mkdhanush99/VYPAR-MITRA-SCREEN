import { useState } from 'react';
import { CategoryIcon } from './CategoryIcon';

interface StorefrontVisualProps {
  photo: string;
  name: string;
  town?: string;
  categoryIcon?: string;
  className?: string;
  compact?: boolean;
}

const THEME_CONFIG: Record<
  string,
  { bg: string; awningA: string; awningB: string; accent: string; label: string; icon: string }
> = {
  kirana: {
    bg: '#F3F7F2',
    awningA: '#0E5E1F',
    awningB: '#FDB902',
    accent: '#1A5B0B',
    label: 'KIRANA & MART',
    icon: 'ShoppingBasket',
  },
  agro: {
    bg: '#EFF6ED',
    awningA: '#1A5B0B',
    awningB: '#84CC16',
    accent: '#0E5E1F',
    label: 'AGRO CENTRE',
    icon: 'Sprout',
  },
  digital: {
    bg: '#F2F5F9',
    awningA: '#0F4C5C',
    awningB: '#FDB902',
    accent: '#0E5E1F',
    label: 'DIGITAL & PRINT',
    icon: 'Megaphone',
  },
  hotel: {
    bg: '#FAF5EC',
    awningA: '#9A3412',
    awningB: '#FDB902',
    accent: '#B45309',
    label: 'TIFFINS & MEALS',
    icon: 'Utensils',
  },
  handloom: {
    bg: '#F9F3F5',
    awningA: '#7F1D1D',
    awningB: '#FDB902',
    accent: '#991B1B',
    label: 'HANDLOOM HOUSE',
    icon: 'Sparkles',
  },
  medical: {
    bg: '#F0F8F7',
    awningA: '#0F766E',
    awningB: '#CCFBF1',
    accent: '#0D9488',
    label: '24/7 PHARMACY',
    icon: 'Stethoscope',
  },
  hardware: {
    bg: '#F4F4F5',
    awningA: '#334155',
    awningB: '#F59E0B',
    accent: '#1E293B',
    label: 'STEEL & HARDWARE',
    icon: 'HardHat',
  },
  services: {
    bg: '#EFF6FF',
    awningA: '#1E40AF',
    awningB: '#FDB902',
    accent: '#1D4ED8',
    label: 'HOME SERVICES',
    icon: 'Hammer',
  },
  jewellery: {
    bg: '#FCF8EC',
    awningA: '#78350F',
    awningB: '#FDB902',
    accent: '#B45309',
    label: '916 JEWELLERS',
    icon: 'Gem',
  },
  mobile: {
    bg: '#F1F5F9',
    awningA: '#0E5E1F',
    awningB: '#38BDF8',
    accent: '#0F172A',
    label: 'MOBILE & SOLAR',
    icon: 'Smartphone',
  },
  dairy: {
    bg: '#F3F8F1',
    awningA: '#15803D',
    awningB: '#FDE047',
    accent: '#166534',
    label: 'FARM DAIRY',
    icon: 'Fish',
  },
  professional: {
    bg: '#F4F6F9',
    awningA: '#1E3A5F',
    awningB: '#FDB902',
    accent: '#0E5E1F',
    label: 'TAX & ADVISORY',
    icon: 'Briefcase',
  },
  wholesale: {
    bg: '#F6F3E1',
    awningA: '#0E5E1F',
    awningB: '#D97706',
    accent: '#1A5B0B',
    label: 'WHOLESALE',
    icon: 'Package',
  },
};

export function StorefrontVisual({
  photo,
  name,
  town,
  categoryIcon,
  className = '',
  compact = false,
}: StorefrontVisualProps) {
  const [imgError, setImgError] = useState(false);

  const isRealImage =
    photo &&
    !photo.startsWith('storefront:') &&
    (photo.startsWith('data:') || photo.startsWith('/') || photo.startsWith('http'));

  if (isRealImage && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
        <img
          src={photo}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const themeKey = photo?.startsWith('storefront:') ? photo.replace('storefront:', '') : 'kirana';
  const cfg = THEME_CONFIG[themeKey] ?? THEME_CONFIG.kirana;
  const iconToUse = categoryIcon || cfg.icon;

  return (
    <div
      className={`relative overflow-hidden select-none flex flex-col justify-between ${className}`}
      style={{ backgroundColor: cfg.bg }}
      aria-label={`${name} storefront visual`}
    >
      {/* Storefront Awning Stripes */}
      <svg
        viewBox="0 0 320 44"
        preserveAspectRatio="none"
        className="w-full h-7 shrink-0"
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <path
            key={i}
            d={`M${i * 40},0 L${(i + 1) * 40},0 L${(i + 1) * 40},28 Q${i * 40 + 20},42 ${i * 40},28 Z`}
            fill={i % 2 === 0 ? cfg.awningA : cfg.awningB}
            opacity={i % 2 === 0 ? 0.94 : 0.85}
          />
        ))}
      </svg>

      {/* Center Signboard & Architectural Shopfront */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-2 text-center">
        <div
          className={`flex items-center justify-center rounded-xl border border-black/10 bg-white/95 shadow-xs ${
            compact ? 'w-9 h-9' : 'w-12 h-12 mb-2'
          }`}
          style={{ color: cfg.accent }}
        >
          <CategoryIcon name={iconToUse} className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
        </div>
        {!compact && (
          <>
            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              {cfg.label}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-800 line-clamp-1 max-w-[90%]">
              {name}
            </p>
          </>
        )}
      </div>

      {/* Subtle Shop Floor Bar */}
      {!compact && (
        <div className="px-3 py-1.5 bg-white/80 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-600">
          <span className="truncate font-medium">{town || 'AP & Telangana'}</span>
          <span className="font-medium text-[#0E5E1F] shrink-0">vyaparamitra.in</span>
        </div>
      )}
    </div>
  );
}
