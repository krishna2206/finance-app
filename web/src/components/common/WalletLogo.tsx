import {
  BanknotesIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

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
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
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

  // 2. Orange Money (Official Logo - Exact match, will NOT match "compte")
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

  // 3. Airtel Money (Official Logo - Exact match)
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

  // 4. Espèces / Cash (Solid Green background with crisp white icon)
  if (upperId === 'CASH' || lowerName.includes('cash') || lowerName.includes('espèce') || lowerName.includes('espece')) {
    return (
      <div className={`${sizeClasses} bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <BanknotesIcon className={iconSizes} />
      </div>
    );
  }

  // 5. Compte Bancaire / Banque (Solid Blue background with crisp white icon)
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
        <BuildingLibraryIcon className={iconSizes} />
      </div>
    );
  }

  // 6. Coffre Épargne (Solid Teal background with crisp white icon)
  if (
    upperId === 'SAVINGS_VAULT' ||
    lowerName.includes('saving') ||
    lowerName.includes('épargne') ||
    lowerName.includes('epargne') ||
    lowerName.includes('coffre')
  ) {
    return (
      <div className={`${sizeClasses} bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
        <ShieldCheckIcon className={iconSizes} />
      </div>
    );
  }

  // 7. Custom Default Account (Solid Indigo background with crisp white icon)
  return (
    <div className={`${sizeClasses} bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}>
      <CreditCardIcon className={iconSizes} />
    </div>
  );
}
