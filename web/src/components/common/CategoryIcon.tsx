import {
  CartLarge4BoldIcon,
  CartLarge4LinearIcon,
  Home2BoldIcon,
  Home2LinearIcon,
  BusBoldIcon,
  BusLinearIcon,
  WiFiBoldIcon,
  WiFiLinearIcon,
  WineglassTriangleBoldIcon,
  WineglassTriangleLinearIcon,
  DangerTriangleBoldIcon,
  DangerTriangleLinearIcon,
  CardTransferBoldIcon,
  CardTransferLinearIcon,
  ShieldCheckBoldIcon,
  ShieldCheckLinearIcon,
  Banknote2BoldIcon,
  Banknote2LinearIcon,
  LaptopBoldIcon,
  LaptopLinearIcon,
  TagBoldIcon,
  TagLinearIcon,
} from '@solar-icons/react';

interface CategoryIconProps {
  name?: string;
  weight?: 'Bold' | 'Linear';
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function CategoryIcon({
  name = 'TagIcon',
  weight = 'Bold',
  size = 16,
  className = '',
  style,
}: CategoryIconProps) {
  const lower = (name || '').toLowerCase();
  const isBold = weight === 'Bold';

  const props = {
    size,
    className,
    style,
  };

  // 1. Food / Market
  if (lower.includes('cart') || lower.includes('shop') || lower.includes('nourriture') || lower.includes('marché')) {
    return isBold ? <CartLarge4BoldIcon {...props} /> : <CartLarge4LinearIcon {...props} />;
  }

  // 2. Home / Bills / Rent
  if (lower.includes('home') || lower.includes('charge') || lower.includes('facture') || lower.includes('house')) {
    return isBold ? <Home2BoldIcon {...props} /> : <Home2LinearIcon {...props} />;
  }

  // 3. Transport
  if (lower.includes('truck') || lower.includes('bus') || lower.includes('transport') || lower.includes('car')) {
    return isBold ? <BusBoldIcon {...props} /> : <BusLinearIcon {...props} />;
  }

  // 4. Telecom / Internet / Wifi
  if (lower.includes('wifi') || lower.includes('signal') || lower.includes('transmission') || lower.includes('télécom') || lower.includes('telecom') || lower.includes('internet')) {
    return isBold ? <WiFiBoldIcon {...props} /> : <WiFiLinearIcon {...props} />;
  }

  // 5. Outings / Restaurants / Leisure / Drinks
  if (lower.includes('wine') || lower.includes('sortie') || lower.includes('restaurant') || lower.includes('cuphot') || lower.includes('sparkle') || lower.includes('star') || lower.includes('bar')) {
    return isBold ? <WineglassTriangleBoldIcon {...props} /> : <WineglassTriangleLinearIcon {...props} />;
  }

  // 6. Emergency / Issues
  if (lower.includes('danger') || lower.includes('triangle') || lower.includes('exclamation') || lower.includes('dépannage') || lower.includes('imprévu')) {
    return isBold ? <DangerTriangleBoldIcon {...props} /> : <DangerTriangleLinearIcon {...props} />;
  }

  // 7. Mobile Fees / Banking charges
  if (lower.includes('card') || lower.includes('credit') || lower.includes('frais')) {
    return isBold ? <CardTransferBoldIcon {...props} /> : <CardTransferLinearIcon {...props} />;
  }

  // 8. Savings / Reserve
  if (lower.includes('shield') || lower.includes('safe') || lower.includes('épargne') || lower.includes('epargne') || lower.includes('reserve')) {
    return isBold ? <ShieldCheckBoldIcon {...props} /> : <ShieldCheckLinearIcon {...props} />;
  }

  // 9. Salary / Money
  if (lower.includes('banknote') || lower.includes('salaire') || lower.includes('money')) {
    return isBold ? <Banknote2BoldIcon {...props} /> : <Banknote2LinearIcon {...props} />;
  }

  // 10. Freelance / Work / Tech
  if (lower.includes('laptop') || lower.includes('freelance') || lower.includes('code')) {
    return isBold ? <LaptopBoldIcon {...props} /> : <LaptopLinearIcon {...props} />;
  }

  // Default Tag
  return isBold ? <TagBoldIcon {...props} /> : <TagLinearIcon {...props} />;
}
