import {
  Banknote2BoldIcon,
  Buildings2BoldIcon,
  ShieldCheckBoldIcon,
  CardBoldIcon,
} from '@solar-icons/react';

interface WalletLogoProps {
  id?: string;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WalletLogo({ id = '', name = '', className = '', size = 'md' }: WalletLogoProps) {
  const upperId = (id || '').toUpperCase();
  const lowerName = (name || '').toLowerCase();

  const sizeClasses = {
    sm: 'w-6 h-6 rounded-lg text-xs',
    md: 'w-8 h-8 rounded-xl text-sm',
    lg: 'w-10 h-10 rounded-2xl text-base',
  }[size];

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  }[size];

  // 1. MVola (Official Logo - Full bleed object-cover)
  if (upperId === 'MVOLA' || lowerName.includes('mvola')) {
    return (
      <div className={`${sizeClasses} overflow-hidden flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <img
          src="/logos/mvola.png"
          alt="MVola"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 2. Orange Money (Official Logo)
  if (upperId === 'ORANGE_MONEY' || upperId === 'OM' || lowerName.includes('orange')) {
    return (
      <div className={`${sizeClasses} overflow-hidden flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <img
          src="/logos/orange.png"
          alt="Orange Money"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 3. Airtel Money (Official Logo)
  if (upperId === 'AIRTEL_MONEY' || upperId === 'AIRTEL' || upperId === 'AM' || lowerName.includes('airtel')) {
    return (
      <div className={`${sizeClasses} overflow-hidden flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <img
          src="/logos/airtel.png"
          alt="Airtel Money"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 4. Espèces / Cash (Solid Green background with crisp white Solar icon)
  if (upperId === 'CASH' || lowerName.includes('cash') || lowerName.includes('espèce') || lowerName.includes('espece')) {
    return (
      <div className={`${sizeClasses} bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <Banknote2BoldIcon size={iconSizes} />
      </div>
    );
  }

  // 5. Compte Bancaire / Banque (Solid Blue background with crisp white Solar icon)
  if (
    upperId === 'BANK' ||
    upperId.startsWith('BANK_') ||
    lowerName.includes('banque') ||
    lowerName.includes('bank') ||
    lowerName.includes('compte bancaire') ||
    lowerName.includes('compte banque') ||
    lowerName.includes('bni') ||
    lowerName.includes('boa') ||
    lowerName.includes('sg') ||
    lowerName.includes('bfv') ||
    lowerName.includes('bgfi') ||
    lowerName.includes('access')
  ) {
    return (
      <div className={`${sizeClasses} bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <Buildings2BoldIcon size={iconSizes} />
      </div>
    );
  }

  // 6. Coffre Épargne (Solid Teal background with crisp white Solar icon)
  if (
    upperId === 'SAVINGS_VAULT' ||
    lowerName.includes('saving') ||
    lowerName.includes('épargne') ||
    lowerName.includes('epargne') ||
    lowerName.includes('coffre')
  ) {
    return (
      <div className={`${sizeClasses} bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <ShieldCheckBoldIcon size={iconSizes} />
      </div>
    );
  }

  // 7. Custom Default Account (Solid Indigo background with crisp white Solar icon)
  return (
    <div className={`${sizeClasses} bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
      <CardBoldIcon size={iconSizes} />
    </div>
  );
}
