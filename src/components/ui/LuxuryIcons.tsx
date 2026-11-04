import React, { useId } from 'react';

export interface LuxuryIconProps {
  size?: number;
  className?: string;
}

export interface LuxuryIconBadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'cyan' | 'crimson' | 'obsidian';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

/**
 * Claymorphic Obsidian-Glass Squircle Container (`LuxuryIconBadge`)
 * Wraps major card header icons and sub-tab icons with an obsidian glass squircle (`rounded-xl`),
 * soft inner top highlight (`shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]`), subtle border glow,
 * and smooth hover/tap micro-interactions (`transition-transform duration-200 active:scale-95`).
 */
export const LuxuryIconBadge: React.FC<LuxuryIconBadgeProps> = ({
  children,
  variant = 'gold',
  size = 'md',
  glow = false,
  className = '',
}) => {
  const sizeClassMap: Record<NonNullable<LuxuryIconBadgeProps['size']>, string> = {
    xs: 'w-6 h-6 rounded-lg p-1',
    sm: 'w-8 h-8 rounded-xl p-1.5',
    md: 'w-10 h-10 rounded-xl p-2',
    lg: 'w-12 h-12 rounded-2xl p-2.5',
  };

  const variantClassMap: Record<NonNullable<LuxuryIconBadgeProps['variant']>, string> = {
    gold: 'bg-gradient-to-br from-[#23190B]/95 via-[#130D22]/95 to-[#0B0816]/95 border border-[#FDE047]/45 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_6px_16px_rgba(245,158,11,0.22)]',
    emerald:
      'bg-gradient-to-br from-[#0A221B]/95 via-[#101826]/95 to-[#090612]/95 border border-[#34D399]/45 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_6px_16px_rgba(16,185,129,0.22)]',
    cyan: 'bg-gradient-to-br from-[#092132]/95 via-[#0E1326]/95 to-[#080612]/95 border border-[#0098EA]/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_6px_16px_rgba(0,152,234,0.25)]',
    crimson:
      'bg-gradient-to-br from-[#2A0B18]/95 via-[#160B1E]/95 to-[#090510]/95 border border-[#F43F5E]/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_6px_16px_rgba(244,63,94,0.25)]',
    obsidian:
      'bg-gradient-to-br from-[#19132E]/95 via-[#0F0B1D]/95 to-[#080510]/95 border border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_6px_14px_rgba(0,0,0,0.45)]',
  };

  const glowClass = glow ? 'ring-1 ring-[#FDE047]/35' : '';

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none transition-transform duration-200 hover:scale-105 active:scale-95 ${sizeClassMap[size]} ${variantClassMap[variant]} ${glowClass} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * 1. `TonCrystalIcon`
 * Official TON diamond vector with cyan/gold metallic gradient and 3D internal facets.
 */
export const TonCrystalIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`tonBody_${uid}`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="45%" stopColor="#0098EA" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id={`tonRim_${uid}`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id={`tonGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#0098EA" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#tonGlow_${uid})`}>
        <path
          d="M6.4 3.5H17.6C19.5 3.5 20.7 5.5 19.7 7.2L13.5 19.3C12.8 20.5 11.2 20.5 10.5 19.3L4.3 7.2C3.3 5.5 4.5 3.5 6.4 3.5Z"
          fill={`url(#tonBody_${uid})`}
          stroke={`url(#tonRim_${uid})`}
          strokeWidth="1.25"
        />
        {/* 3D Inner Facets */}
        <path
          d="M12 3.8V19.6M4.8 6.4H19.2"
          stroke="#E0F2FE"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        <path
          d="M6.4 3.8L12 6.4L17.6 3.8"
          stroke="#FEF08A"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />
      </g>
    </svg>
  );
};

/**
 * 2. `TelegramStarIcon`
 * Official 3D-faceted golden Telegram Star vector with inner highlight.
 */
export const TelegramStarIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`starGold_${uid}`} x1="3" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="75%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={`starFacet_${uid}`} x1="12" y1="2" x2="12" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
        </linearGradient>
        <filter id={`starGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#F59E0B" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#starGlow_${uid})`}>
        <path
          d="M12 2.2L14.95 8.18L21.55 9.14L16.77 13.8L17.9 20.37L12 17.27L6.1 20.37L7.23 13.8L2.45 9.14L9.05 8.18L12 2.2Z"
          fill={`url(#starGold_${uid})`}
          stroke="#FEF08A"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {/* Inner 3D Ridge Highlight */}
        <path
          d="M12 3.6L14.2 8.5L19.4 9.25L12 12.3V3.6Z"
          fill={`url(#starFacet_${uid})`}
        />
      </g>
    </svg>
  );
};

/**
 * 3. `VipTicketIcon`
 * Golden perforated lottery ticket with glowing star emblem (replaces 🎟️).
 */
export const VipTicketIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`tktGold_${uid}`} x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id={`tktEmerald_${uid}`} x1="8" y1="7" x2="16" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id={`tktGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.1" floodColor="#F59E0B" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter={`url(#tktGlow_${uid})`}>
        <path
          d="M2.5 7.5C2.5 6.12 3.62 5 5 5H19C20.38 5 21.5 6.12 21.5 7.5V9.5C20.12 9.5 19 10.62 19 12C19 13.38 20.12 14.5 21.5 14.5V16.5C21.5 17.88 20.38 19 19 19H5C3.62 19 2.5 17.88 2.5 16.5V14.5C3.88 14.5 5 13.38 5 12C5 10.62 3.88 9.5 2.5 9.5V7.5Z"
          fill={`url(#tktGold_${uid})`}
          stroke="#FEF9C3"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        {/* Perforation Line */}
        <path
          d="M8.2 6.5V17.5"
          stroke="#1E1B4B"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />
        {/* Glowing Center Star Emblem */}
        <path
          d="M14.5 8.3L15.55 10.45L17.9 10.8L16.2 12.45L16.6 14.8L14.5 13.7L12.4 14.8L12.8 12.45L11.1 10.8L13.45 10.45L14.5 8.3Z"
          fill={`url(#tktEmerald_${uid})`}
          stroke="#ECFDF5"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
};

/**
 * 4. `RoyalJackpotCrownIcon`
 * Multi-jewel 3D golden crown with ambient glow (replaces 👑).
 */
export const RoyalJackpotCrownIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`crownGold_${uid}`} x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="40%" stopColor="#FDE047" />
          <stop offset="80%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <filter id={`crownGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#F59E0B" floodOpacity="0.48" />
        </filter>
      </defs>
      <g filter={`url(#crownGlow_${uid})`}>
        <path
          d="M3.2 16.8L2.2 7.5L7.6 11.4L12 5.2L16.4 11.4L21.8 7.5L20.8 16.8H3.2Z"
          fill={`url(#crownGold_${uid})`}
          stroke="#FEF08A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <rect
          x="3.2"
          y="18"
          width="17.6"
          height="2.6"
          rx="1.3"
          fill={`url(#crownGold_${uid})`}
          stroke="#FEF08A"
          strokeWidth="1"
        />
        {/* Emerald & Cyan Crown Jewels */}
        <circle cx="12" cy="13.2" r="1.5" fill="#10B981" stroke="#ECFDF5" strokeWidth="0.6" />
        <circle cx="7.2" cy="14" r="1.1" fill="#0098EA" stroke="#E0F2FE" strokeWidth="0.5" />
        <circle cx="16.8" cy="14" r="1.1" fill="#0098EA" stroke="#E0F2FE" strokeWidth="0.5" />
        <circle cx="12" cy="3.6" r="1.2" fill="#FDE047" />
      </g>
    </svg>
  );
};

/**
 * 5. `WelcomeGiftVaultIcon`
 * Luxury obsidian-and-gold treasure chest / gift box (replaces 🎉/🎁).
 */
export const WelcomeGiftVaultIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`giftBox_${uid}`} x1="3" y1="8" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="50%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id={`giftRibbon_${uid}`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id={`giftGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#F59E0B" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter={`url(#giftGlow_${uid})`}>
        {/* Lower Vault Chest */}
        <rect
          x="3.5"
          y="10.5"
          width="17"
          height="10"
          rx="2.5"
          fill={`url(#giftBox_${uid})`}
          stroke={`url(#giftRibbon_${uid})`}
          strokeWidth="1.25"
        />
        {/* Upper Lid */}
        <rect
          x="2.5"
          y="7"
          width="19"
          height="4"
          rx="1.8"
          fill={`url(#giftRibbon_${uid})`}
          stroke="#FEF9C3"
          strokeWidth="1"
        />
        {/* Vertical & Horizontal Gold Ribbons */}
        <path d="M12 7V20.5" stroke="#FDE047" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M3.8 15H20.2" stroke="#34D399" strokeWidth="1.4" strokeOpacity="0.85" />
        {/* Luxury Bow Loops */}
        <path
          d="M12 7C12 7 9.5 3.2 7.4 4.2C5.5 5.1 6.8 7 9.8 7H12ZM12 7C12 7 14.5 3.2 16.6 4.2C18.5 5.1 17.2 7 14.2 7H12Z"
          fill="#FDE047"
          stroke="#FEF9C3"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

/**
 * 6. `SquadSyndicateIcon`
 * Interlocking golden/emerald shield & nodes emblem (replaces 🤝).
 */
export const SquadSyndicateIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`synShield_${uid}`} x1="4" y1="2.5" x2="20" y2="21.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id={`synGold_${uid}`} x1="5" y1="4" x2="19" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id={`synGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#10B981" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#synGlow_${uid})`}>
        {/* Royal Syndicate Shield */}
        <path
          d="M12 2.5L19.5 5.8V11.6C19.5 16.4 16.3 20.1 12 21.6C7.7 20.1 4.5 16.4 4.5 11.6V5.8L12 2.5Z"
          fill={`url(#synShield_${uid})`}
          stroke={`url(#synGold_${uid})`}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Interlocking Squad Nodes */}
        <path
          d="M8.5 13.8L12 8.2L15.5 13.8H8.5Z"
          stroke="#FEF08A"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="8" r="1.8" fill="#FDE047" stroke="#FFFFFF" strokeWidth="0.7" />
        <circle cx="8.3" cy="14" r="1.6" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.7" />
        <circle cx="15.7" cy="14" r="1.6" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.7" />
      </g>
    </svg>
  );
};

/**
 * 7. `CashbackEmeraldVaultIcon`
 * Glowing emerald diamond vault / cashback emblem (replaces 💎).
 */
export const CashbackEmeraldVaultIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`emGem_${uid}`} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id={`emRim_${uid}`} x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id={`emGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#10B981" floodOpacity="0.48" />
        </filter>
      </defs>
      <g filter={`url(#emGlow_${uid})`}>
        {/* Outer Cut Emerald Gem */}
        <path
          d="M7.2 3.5H16.8L21.2 9.2L12 20.6L2.8 9.2L7.2 3.5Z"
          fill={`url(#emGem_${uid})`}
          stroke={`url(#emRim_${uid})`}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        {/* Internal Crown & Pavilion Facets */}
        <path
          d="M3.2 9.2H20.8M7.2 3.8L9.6 9.2L12 20.1M16.8 3.8L14.4 9.2L12 20.1"
          stroke="#ECFDF5"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.8"
        />
        <path d="M9.6 9.2L12 3.8L14.4 9.2" stroke="#FEF08A" strokeWidth="0.95" strokeOpacity="0.85" />
      </g>
    </svg>
  );
};

/**
 * 8. `AmbassadorRocketIcon`
 * Sleek duotone gold/emerald growth rocket & trophy star (replaces 🚀).
 */
export const AmbassadorRocketIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`rkBody_${uid}`} x1="5" y1="2" x2="19" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="45%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={`rkFin_${uid}`} x1="3" y1="12" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id={`rkGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#F59E0B" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#rkGlow_${uid})`}>
        {/* Side Thruster Fins */}
        <path
          d="M7.5 12.5L4.2 15.2C3.8 15.6 4 16.3 4.6 16.4L7.8 16.8L7.5 12.5ZM16.5 12.5L19.8 15.2C20.2 15.6 20 16.3 19.4 16.4L16.2 16.8L16.5 12.5Z"
          fill={`url(#rkFin_${uid})`}
          stroke="#A7F3D0"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        {/* Rocket Hull */}
        <path
          d="M12 2.4C15.2 5.2 16.8 9.2 16.4 15.2H7.6C7.2 9.2 8.8 5.2 12 2.4Z"
          fill={`url(#rkBody_${uid})`}
          stroke="#FEF08A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Emerald Porthole Window */}
        <circle cx="12" cy="9.5" r="2.1" fill="#065F46" stroke="#6EE7B7" strokeWidth="1.1" />
        {/* Exhaust Flame */}
        <path
          d="M9.8 16.2L12 21.4L14.2 16.2H9.8Z"
          fill="#34D399"
          stroke="#FEF08A"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

/**
 * 9. `LuxuryDiceCubeIcon`
 * Isometric 3D obsidian-and-gold casino die with glowing emerald pips and metallic bevel highlights (replaces 🎲).
 */
export const LuxuryDiceCubeIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`diceTop_${uid}`} x1="4" y1="3" x2="20" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={`diceLeft_${uid}`} x1="3" y1="8" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#090612" />
        </linearGradient>
        <linearGradient id={`diceRight_${uid}`} x1="12" y1="8" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#171230" />
          <stop offset="100%" stopColor="#07040E" />
        </linearGradient>
        <linearGradient id={`diceGoldEdge_${uid}`} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <filter id={`diceGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#F59E0B" floodOpacity="0.42" />
        </filter>
      </defs>
      <g filter={`url(#diceGlow_${uid})`}>
        {/* Top Isometric Face */}
        <path
          d="M12 2.4L20.4 7.2L12 12L3.6 7.2L12 2.4Z"
          fill={`url(#diceTop_${uid})`}
          stroke={`url(#diceGoldEdge_${uid})`}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Left Isometric Face */}
        <path
          d="M3.6 7.2L12 12V21.4L3.6 16.6V7.2Z"
          fill={`url(#diceLeft_${uid})`}
          stroke={`url(#diceGoldEdge_${uid})`}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right Isometric Face */}
        <path
          d="M20.4 7.2L12 12V21.4L20.4 16.6V7.2Z"
          fill={`url(#diceRight_${uid})`}
          stroke={`url(#diceGoldEdge_${uid})`}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Glowing Emerald & Gold Pips */}
        <ellipse cx="12" cy="7.2" rx="1.45" ry="0.95" fill="#FDE047" />
        <circle cx="6.8" cy="12.2" r="1.15" fill="#34D399" />
        <circle cx="9.2" cy="15.8" r="1.15" fill="#34D399" />
        <circle cx="14.6" cy="12.3" r="1.05" fill="#FDE047" />
        <circle cx="16.2" cy="14.5" r="1.05" fill="#10B981" />
        <circle cx="17.8" cy="16.5" r="1.05" fill="#FDE047" />
      </g>
    </svg>
  );
};

/**
 * 10. `LuxuryMineBombIcon`
 * Sleek 3D metallic obsidian naval/casino mine with golden spikes and a glowing ruby fuse spark (replaces 💣 / 💥).
 */
export const LuxuryMineBombIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`mineCore_${uid}`} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#090612" />
        </radialGradient>
        <linearGradient id={`mineSpike_${uid}`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
        <filter id={`mineGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" floodColor="#F43F5E" floodOpacity="0.55" />
        </filter>
      </defs>
      <g filter={`url(#mineGlow_${uid})`}>
        {/* Golden/Ruby Naval Mine Spikes */}
        <path
          d="M12 2.2V5.2M12 18.8V21.8M2.2 12H5.2M18.8 12H21.8M5.1 5.1L7.3 7.3M16.7 16.7L18.9 18.9M18.9 5.1L16.7 7.3M7.3 16.7L5.1 18.9"
          stroke={`url(#mineSpike_${uid})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* 3D Metallic Obsidian Sphere */}
        <circle
          cx="12"
          cy="12.5"
          r="6.6"
          fill={`url(#mineCore_${uid})`}
          stroke={`url(#mineSpike_${uid})`}
          strokeWidth="1.25"
        />
        {/* Specular Highlight Arc */}
        <path
          d="M8.5 9.5C9.3 8.4 10.6 7.8 12 7.8"
          stroke="#F8FAFC"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
        {/* Glowing Ruby Danger Core & Spark */}
        <circle cx="12" cy="12.5" r="2.3" fill="#F43F5E" stroke="#FFE4E6" strokeWidth="0.8" />
        <circle cx="17.8" cy="4.8" r="1.6" fill="#FDE047" stroke="#F43F5E" strokeWidth="0.8" />
      </g>
    </svg>
  );
};

/**
 * 11. `MinesEmeraldGemIcon`
 * Faceted 3D emerald/gold gemstone with inner specular reflection for safe tile reveals inside the Mines grid.
 */
export const MinesEmeraldGemIcon: React.FC<LuxuryIconProps> = ({ size = 18, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`mgCrown_${uid}`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="40%" stopColor="#10B981" />
          <stop offset="85%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id={`mgGoldBevel_${uid}`} x1="3" y1="3" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id={`mgGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor="#10B981" floodOpacity="0.6" />
        </filter>
      </defs>
      <g filter={`url(#mgGlow_${uid})`}>
        {/* Octagonal Brilliant Cut Outer Gem */}
        <path
          d="M7 3.2H17L21.4 8.8L12 20.8L2.6 8.8L7 3.2Z"
          fill={`url(#mgCrown_${uid})`}
          stroke={`url(#mgGoldBevel_${uid})`}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        {/* Inner Specular Table & Star Facets */}
        <path
          d="M7.2 3.5L9.4 8.8L12 20.2L14.6 8.8L16.8 3.5"
          stroke="#ECFDF5"
          strokeWidth="1.05"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />
        <path
          d="M2.9 8.8H21.1"
          stroke="#FEF08A"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        <polygon points="12,4.4 14.3,8.6 9.7,8.6" fill="#FEF08A" fillOpacity="0.45" />
      </g>
    </svg>
  );
};

/**
 * 12. `LuxuryPlinkoPyramidIcon`
 * Illuminated pyramid of golden pegs with a glowing orb cascading into high-multiplier buckets (replaces 🎯 / 🟢).
 */
export const LuxuryPlinkoPyramidIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`plkGold_${uid}`} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id={`plkGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#10B981" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#plkGlow_${uid})`}>
        {/* Cascading Trajectory Path */}
        <path
          d="M12 3.2L9.2 7.5L13.2 11.8L15.8 16.5"
          stroke={`url(#plkGold_${uid})`}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1.5 1.5"
        />
        {/* Glowing Plinko Ball */}
        <circle cx="13.2" cy="11.5" r="2.2" fill="#FDE047" stroke="#FFFFFF" strokeWidth="0.8" />
        {/* Pyramid of Golden & Pearl Pegs */}
        <circle cx="12" cy="4" r="1.2" fill="#FDE047" />
        <circle cx="9" cy="8" r="1.2" fill="#E2E8F0" />
        <circle cx="15" cy="8" r="1.2" fill="#E2E8F0" />
        <circle cx="6.5" cy="12" r="1.2" fill="#E2E8F0" />
        <circle cx="18" cy="12" r="1.2" fill="#E2E8F0" />
        <circle cx="4.5" cy="15.8" r="1.15" fill="#34D399" />
        <circle cx="9.5" cy="15.8" r="1.15" fill="#E2E8F0" />
        <circle cx="14.5" cy="15.8" r="1.15" fill="#FDE047" />
        <circle cx="19.5" cy="15.8" r="1.15" fill="#F43F5E" />
        {/* Bottom High-Multiplier Buckets */}
        <rect x="3" y="18.5" width="4.8" height="3" rx="1" fill="#F43F5E" stroke="#FDA4AF" strokeWidth="0.6" />
        <rect x="9.6" y="18.5" width="4.8" height="3" rx="1" fill="#F59E0B" stroke="#FEF08A" strokeWidth="0.6" />
        <rect x="16.2" y="18.5" width="4.8" height="3" rx="1" fill="#10B981" stroke="#A7F3D0" strokeWidth="0.7" />
      </g>
    </svg>
  );
};

/**
 * 13. `LuxuryCrashMultiplierIcon`
 * Ascending neon-emerald parabolic trajectory curve with a golden twin-thruster spacecraft/rocket (replaces 🚀 / 📈).
 */
export const LuxuryCrashMultiplierIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`crCurve_${uid}`} x1="3" y1="19" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="60%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>
        <linearGradient id={`crShip_${uid}`} x1="12" y1="3" x2="21" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id={`crGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" floodColor="#10B981" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter={`url(#crGlow_${uid})`}>
        {/* Subtle Grid Base */}
        <path
          d="M3 5V20H20"
          stroke="#475569"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.65"
        />
        {/* Parabolic Exponential Multiplier Curve */}
        <path
          d="M3.5 19.2C8.8 18.8 13.2 15.6 17.6 6.8"
          stroke={`url(#crCurve_${uid})`}
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        {/* Golden Twin-Thruster Spacecraft Tip */}
        <path
          d="M20.8 3.2L18.9 10.4L16.8 8.3L14.7 6.2L20.8 3.2Z"
          fill={`url(#crShip_${uid})`}
          stroke="#FEF08A"
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        {/* Afterburner Spark */}
        <circle cx="15.2" cy="9.2" r="1.3" fill="#F43F5E" />
      </g>
    </svg>
  );
};

/**
 * 14. `ProvablyFairShieldIcon`
 * Golden cryptographic shield with an emerald checkmark/keyhole emblem for Provably Fair verification badges (replaces 🛡️ / 🔒).
 */
export const ProvablyFairShieldIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`pfShield_${uid}`} x1="4" y1="2.5" x2="20" y2="21.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="55%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id={`pfRim_${uid}`} x1="4" y1="2" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id={`pfGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#10B981" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#pfGlow_${uid})`}>
        <path
          d="M12 2.4L19.6 5.6V11.5C19.6 16.4 16.3 20.2 12 21.6C7.7 20.2 4.4 16.4 4.4 11.5V5.6L12 2.4Z"
          fill={`url(#pfShield_${uid})`}
          stroke={`url(#pfRim_${uid})`}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        {/* Glowing Emerald Cryptographic Checkmark */}
        <path
          d="M8.6 12.2L10.9 14.5L15.6 9.4"
          stroke="#34D399"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="5.5" r="0.9" fill="#FDE047" />
      </g>
    </svg>
  );
};

/**
 * 15. `AiNeuralCoreIcon`
 * Glowing 3D obsidian-and-gold neural core / diamond AI brain emblem (for AI Concierge & Executive Copilot headers).
 */
export const AiNeuralCoreIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`aiHex_${uid}`} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id={`aiCore_${uid}`} x1="7" y1="7" x2="17" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id={`aiRim_${uid}`} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <filter id={`aiGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor="#F59E0B" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#aiGlow_${uid})`}>
        {/* Outer 3D Octagonal Neural Chassis */}
        <path
          d="M12 2.2L19.8 6.7V17.3L12 21.8L4.2 17.3V6.7L12 2.2Z"
          fill={`url(#aiHex_${uid})`}
          stroke={`url(#aiRim_${uid})`}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        {/* Synaptic Neural Pathways */}
        <path
          d="M12 5.2V8.2M12 15.8V18.8M6.2 8.6L8.8 10.1M15.2 13.9L17.8 15.4M17.8 8.6L15.2 10.1M8.8 13.9L6.2 15.4"
          stroke="#34D399"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        {/* Inner Faceted Diamond Brain Core */}
        <path
          d="M12 7.5L16.5 12L12 16.5L7.5 12L12 7.5Z"
          fill={`url(#aiCore_${uid})`}
          stroke="#FEF9C3"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {/* Specular Neural Nodes */}
        <circle cx="12" cy="12" r="1.45" fill="#0F172A" stroke="#FEF08A" strokeWidth="0.9" />
        <circle cx="12" cy="4.8" r="1" fill="#FDE047" />
        <circle cx="12" cy="19.2" r="1" fill="#34D399" />
        <circle cx="5.8" cy="8.4" r="0.95" fill="#38BDF8" />
        <circle cx="18.2" cy="8.4" r="0.95" fill="#FDE047" />
        <circle cx="5.8" cy="15.6" r="0.95" fill="#34D399" />
        <circle cx="18.2" cy="15.6" r="0.95" fill="#38BDF8" />
      </g>
    </svg>
  );
};

/**
 * 16. `TelemetryChartIcon`
 * Ascending 3D emerald-and-gold financial bar/line analytics emblem (for balance sheet & profit reports).
 */
export const TelemetryChartIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`tcBarGold_${uid}`} x1="0" y1="6" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={`tcBarEm_${uid}`} x1="0" y1="4" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="55%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id={`tcLine_${uid}`} x1="4" y1="14" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>
        <filter id={`tcGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor="#10B981" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter={`url(#tcGlow_${uid})`}>
        {/* Base Platform Line */}
        <path
          d="M3 20.4H21"
          stroke="#475569"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* 3D Bar 1 */}
        <rect
          x="4.5"
          y="13.5"
          width="3.4"
          height="6.8"
          rx="1"
          fill={`url(#tcBarGold_${uid})`}
          stroke="#FEF08A"
          strokeWidth="0.6"
        />
        {/* 3D Bar 2 */}
        <rect
          x="10.3"
          y="10"
          width="3.4"
          height="10.3"
          rx="1"
          fill={`url(#tcBarEm_${uid})`}
          stroke="#A7F3D0"
          strokeWidth="0.6"
        />
        {/* 3D Bar 3 */}
        <rect
          x="16.1"
          y="6.2"
          width="3.4"
          height="14.1"
          rx="1"
          fill={`url(#tcBarGold_${uid})`}
          stroke="#FEF9C3"
          strokeWidth="0.7"
        />
        {/* Ascending Telemetry Trend Curve */}
        <path
          d="M5.5 11.2L11.5 7.4L17.8 3.6"
          stroke={`url(#tcLine_${uid})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="5.5" cy="11.2" r="1.3" fill="#38BDF8" />
        <circle cx="11.5" cy="7.4" r="1.4" fill="#34D399" />
        <circle cx="17.8" cy="3.6" r="1.7" fill="#FDE047" stroke="#0F172A" strokeWidth="0.6" />
      </g>
    </svg>
  );
};

/**
 * 17. `VipConciergeHeadsetIcon`
 * Luxury golden VIP support headset with emerald status pulse (for 24/7 live support & human escalation).
 */
export const VipConciergeHeadsetIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`vhGold_${uid}`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={`vhCup_${uid}`} x1="3" y1="11" x2="21" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <filter id={`vhGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#F59E0B" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter={`url(#vhGlow_${uid})`}>
        {/* Golden Acoustic Band */}
        <path
          d="M4.8 12.5V11C4.8 6.8 8.02 3.4 12 3.4C15.98 3.4 19.2 6.8 19.2 11V12.5"
          stroke={`url(#vhGold_${uid})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Left & Right Obsidian-Gold Ear Cups */}
        <rect
          x="3.2"
          y="11.2"
          width="3.8"
          height="6.4"
          rx="1.9"
          fill={`url(#vhCup_${uid})`}
          stroke={`url(#vhGold_${uid})`}
          strokeWidth="1.35"
        />
        <rect
          x="17"
          y="11.2"
          width="3.8"
          height="6.4"
          rx="1.9"
          fill={`url(#vhCup_${uid})`}
          stroke={`url(#vhGold_${uid})`}
          strokeWidth="1.35"
        />
        {/* Boom Microphone Arm */}
        <path
          d="M18.8 17.4C18.2 19.6 16.2 20.8 13.2 20.8H11.5"
          stroke={`url(#vhGold_${uid})`}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* Live Emerald Status Pulse Mic Tip */}
        <circle
          cx="11.2"
          cy="20.8"
          r="1.75"
          fill="#10B981"
          stroke="#A7F3D0"
          strokeWidth="0.9"
        />
        {/* VIP Crown Gem at Top of Band */}
        <circle cx="12" cy="3.4" r="1.2" fill="#FDE047" />
      </g>
    </svg>
  );
};

/**
 * 18. `SecurityAuditRadarIcon`
 * Golden cryptographic radar/shield emblem (for live PAM wallet reconciliation & anti-bot audits).
 */
export const SecurityAuditRadarIcon: React.FC<LuxuryIconProps> = ({
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`srBg_${uid}`} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="60%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id={`srRim_${uid}`} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id={`srSweep_${uid}`} x1="12" y1="12" x2="19" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FDE047" stopOpacity="0.1" />
        </linearGradient>
        <filter id={`srGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.3" floodColor="#10B981" floodOpacity="0.42" />
        </filter>
      </defs>
      <g filter={`url(#srGlow_${uid})`}>
        {/* Outer Cryptographic Radar Ring */}
        <circle
          cx="12"
          cy="12"
          r="9.2"
          fill={`url(#srBg_${uid})`}
          stroke={`url(#srRim_${uid})`}
          strokeWidth="1.4"
        />
        {/* Inner Concentric Audit Rings */}
        <circle
          cx="12"
          cy="12"
          r="5.6"
          stroke="#34D399"
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeDasharray="2.5 2"
        />
        {/* Radar Sweep Sector */}
        <path
          d="M12 12L18.2 6.8A8.8 8.8 0 0 0 12 3.2V12Z"
          fill={`url(#srSweep_${uid})`}
        />
        {/* Radar Sweep Hand */}
        <path
          d="M12 12L18.1 6.7"
          stroke="#FDE047"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* Center PAM Lock Core & Verified Blip */}
        <circle cx="12" cy="12" r="2" fill="#10B981" stroke="#FEF08A" strokeWidth="1" />
        <circle cx="15.4" cy="8.8" r="1.2" fill="#FDE047" />
        <circle cx="8.6" cy="15.2" r="1.1" fill="#38BDF8" />
      </g>
    </svg>
  );
};

export interface LuxuryFlagIconProps extends LuxuryIconProps {
  lang: 'fa' | 'en' | 'ru' | 'ar' | 'es' | string;
}

/**
 * 19. `LuxuryFlagIcon`
 * Bespoke rounded-rectangle SVG vector flags for the 5 Global Telegram Languages (`fa`, `en`, `ru`, `ar`, `es`)
 * with subtle inner glass reflection and golden-obsidian rim (Zero Unicode Flag Emojis).
 */
export const LuxuryFlagIcon: React.FC<LuxuryFlagIconProps> = ({
  lang,
  size = 18,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const code = String(lang || 'fa')
    .trim()
    .toLowerCase()
    .slice(0, 2);

  const height = Math.round(size * 0.75);

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 24 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 rounded-[4px] ${className}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`flagClip_${uid}`}>
          <rect x="0.75" y="0.75" width="22.5" height="16.5" rx="3.2" />
        </clipPath>
        <linearGradient id={`flagGloss_${uid}`} x1="0" y1="0" x2="0" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#flagClip_${uid})`}>
        {code === 'en' ? (
          /* United Kingdom / International English Vector Flag */
          <g>
            <rect width="24" height="18" fill="#012169" />
            <path d="M0 0L24 18M24 0L0 18" stroke="#FFFFFF" strokeWidth="3.2" />
            <path d="M0 0L24 18M24 0L0 18" stroke="#C8102E" strokeWidth="1.6" />
            <path d="M12 0V18M0 9H24" stroke="#FFFFFF" strokeWidth="5.2" />
            <path d="M12 0V18M0 9H24" stroke="#C8102E" strokeWidth="3" />
          </g>
        ) : code === 'ru' ? (
          /* Russian Tricolor Vector Flag */
          <g>
            <rect y="0" width="24" height="6" fill="#FFFFFF" />
            <rect y="6" width="24" height="6" fill="#0039A6" />
            <rect y="12" width="24" height="6" fill="#D52B1E" />
          </g>
        ) : code === 'ar' ? (
          /* MENA / Pan-Arab Emerald & Gold Vector Flag */
          <g>
            <rect width="24" height="18" fill="#065F46" />
            <rect x="3" y="3" width="18" height="12" rx="2" fill="#047857" />
            <path
              d="M7 11.5H17M8.5 8.5C9.8 7.3 14.2 7.3 15.5 8.5"
              stroke="#FDE047"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="6.8" r="1.1" fill="#FDE047" />
          </g>
        ) : code === 'es' ? (
          /* Spain Red-Gold-Red Vector Flag */
          <g>
            <rect y="0" width="24" height="4.5" fill="#AA151B" />
            <rect y="4.5" width="24" height="9" fill="#F1BF00" />
            <rect y="13.5" width="24" height="4.5" fill="#AA151B" />
            <rect x="5.2" y="6.8" width="2.6" height="4.2" rx="0.8" fill="#AA151B" stroke="#FFFFFF" strokeWidth="0.5" />
          </g>
        ) : (
          /* Persian / Iran Green-White-Red Vector Flag with Golden Emblem */
          <g>
            <rect y="0" width="24" height="6" fill="#10B981" />
            <rect y="6" width="24" height="6" fill="#FFFFFF" />
            <rect y="12" width="24" height="6" fill="#EF4444" />
            <circle cx="12" cy="9" r="1.9" stroke="#D97706" strokeWidth="1.2" />
            <path d="M12 7.2V10.8" stroke="#D97706" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        )}

        {/* Inner Specular Glass Reflection Overlay */}
        <rect width="24" height="18" fill={`url(#flagGloss_${uid})`} />
      </g>

      {/* Luxury Golden-Obsidian Rounded Rim */}
      <rect
        x="0.75"
        y="0.75"
        width="22.5"
        height="16.5"
        rx="3.2"
        stroke="#FDE047"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
    </svg>
  );
};

