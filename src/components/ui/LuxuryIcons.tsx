import React, { useId } from 'react';

export interface LuxuryIconProps {
  size?: number;
  className?: string;
}

export interface LuxuryIconBadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'cyan' | 'obsidian';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Claymorphic Obsidian-Glass Squircle Container (`LuxuryIconBadge`)
 * Wraps major card header icons and sub-tab icons with an obsidian glass squircle (`rounded-xl`),
 * soft inner top highlight (`shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]`), and subtle border glow.
 */
export const LuxuryIconBadge: React.FC<LuxuryIconBadgeProps> = ({
  children,
  variant = 'gold',
  size = 'md',
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
    obsidian:
      'bg-gradient-to-br from-[#19132E]/95 via-[#0F0B1D]/95 to-[#080510]/95 border border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_6px_14px_rgba(0,0,0,0.45)]',
  };

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${sizeClassMap[size]} ${variantClassMap[variant]} ${className}`}
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
