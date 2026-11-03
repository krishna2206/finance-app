import React from 'react';
import {
  CartLarge4BoldIcon,
  CartLarge4LinearIcon,
  Home2BoldIcon,
  Home2LinearIcon,
  BusBoldIcon,
  BusLinearIcon,
  WiFiBoldIcon,
  WiFiLinearIcon,
  DangerTriangleBoldIcon,
  DangerTriangleLinearIcon,
  Banknote2BoldIcon,
  Banknote2LinearIcon,
  LaptopBoldIcon,
  LaptopLinearIcon,
  TagBoldIcon,
  TagLinearIcon,
  HandMoneyBoldIcon,
  HandMoneyLinearIcon,
  CupBoldIcon,
  CupLinearIcon,
  RepeatBoldIcon,
  RepeatLinearIcon,
  CodeBoldIcon,
  CodeLinearIcon,
  HeartBoldIcon,
  HeartLinearIcon,
  TShirtBoldIcon,
  TShirtLinearIcon,
  MenuDotsBoldIcon,
  MenuDotsLinearIcon,
  AddCircleBoldIcon,
  AddCircleLinearIcon,
  SmartphoneBoldIcon,
  SmartphoneLinearIcon,
  WineglassTriangleBoldIcon,
  WineglassTriangleLinearIcon,
  LightbulbBoltBoldIcon,
  LightbulbBoltLinearIcon,
  BroomBoldIcon,
  BroomLinearIcon,
  ScissorsBoldIcon,
  ScissorsLinearIcon,
  GamepadBoldIcon,
  GamepadLinearIcon,
  HandHeartBoldIcon,
  HandHeartLinearIcon,
  SquareAcademicCapBoldIcon,
  SquareAcademicCapLinearIcon,
  SendSquareBoldIcon,
  SendSquareLinearIcon,
  StarsBoldIcon,
  StarsLinearIcon,
  RestartBoldIcon,
  RestartLinearIcon,
  TransferHorizontalBoldIcon,
  TransferHorizontalLinearIcon,
  CashOutBoldIcon,
  CashOutLinearIcon,
  GiftBoldIcon,
  GiftLinearIcon,
  PillBoldIcon,
  PillLinearIcon,
  BookBoldIcon,
  BookLinearIcon,
  WaterdropBoldIcon,
  WaterdropLinearIcon,
  TicketBoldIcon,
  TicketLinearIcon,
  PaletteBoldIcon,
  PaletteLinearIcon,
  UsersGroupRoundedBoldIcon,
  UsersGroupRoundedLinearIcon,
  CaseBoldIcon,
  CaseLinearIcon,
} from '@solar-icons/react';

type SolarIconComponent = React.ComponentType<{
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}>;

interface IconPair {
  Bold: SolarIconComponent;
  Linear: SolarIconComponent;
}

const SOLAR_ICON_REGISTRY: Record<string, IconPair> = {
  // Official System Icons
  HandMoneyBoldIcon: { Bold: HandMoneyBoldIcon, Linear: HandMoneyLinearIcon },
  Banknote2BoldIcon: { Bold: Banknote2BoldIcon, Linear: Banknote2LinearIcon },
  LaptopBoldIcon: { Bold: LaptopBoldIcon, Linear: LaptopLinearIcon },
  AddCircleBoldIcon: { Bold: AddCircleBoldIcon, Linear: AddCircleLinearIcon },
  CartLarge4BoldIcon: { Bold: CartLarge4BoldIcon, Linear: CartLarge4LinearIcon },
  CupBoldIcon: { Bold: CupBoldIcon, Linear: CupLinearIcon },
  BusBoldIcon: { Bold: BusBoldIcon, Linear: BusLinearIcon },
  Home2BoldIcon: { Bold: Home2BoldIcon, Linear: Home2LinearIcon },
  RepeatBoldIcon: { Bold: RepeatBoldIcon, Linear: RepeatLinearIcon },
  CodeBoldIcon: { Bold: CodeBoldIcon, Linear: CodeLinearIcon },
  HeartBoldIcon: { Bold: HeartBoldIcon, Linear: HeartLinearIcon },
  TShirtBoldIcon: { Bold: TShirtBoldIcon, Linear: TShirtLinearIcon },
  WineglassTriangleBoldIcon: { Bold: WineglassTriangleBoldIcon, Linear: WineglassTriangleLinearIcon },
  SmartphoneBoldIcon: { Bold: SmartphoneBoldIcon, Linear: SmartphoneLinearIcon },
  MenuDotsBoldIcon: { Bold: MenuDotsBoldIcon, Linear: MenuDotsLinearIcon },
  WiFiBoldIcon: { Bold: WiFiBoldIcon, Linear: WiFiLinearIcon },
  DangerTriangleBoldIcon: { Bold: DangerTriangleBoldIcon, Linear: DangerTriangleLinearIcon },
  TagBoldIcon: { Bold: TagBoldIcon, Linear: TagLinearIcon },
  LightbulbBoltBoldIcon: { Bold: LightbulbBoltBoldIcon, Linear: LightbulbBoltLinearIcon },
  BroomBoldIcon: { Bold: BroomBoldIcon, Linear: BroomLinearIcon },
  ScissorsBoldIcon: { Bold: ScissorsBoldIcon, Linear: ScissorsLinearIcon },
  GamepadBoldIcon: { Bold: GamepadBoldIcon, Linear: GamepadLinearIcon },
  HandHeartBoldIcon: { Bold: HandHeartBoldIcon, Linear: HandHeartLinearIcon },
  SquareAcademicCapBoldIcon: { Bold: SquareAcademicCapBoldIcon, Linear: SquareAcademicCapLinearIcon },
  SendSquareBoldIcon: { Bold: SendSquareBoldIcon, Linear: SendSquareLinearIcon },
  StarsBoldIcon: { Bold: StarsBoldIcon, Linear: StarsLinearIcon },
  RestartBoldIcon: { Bold: RestartBoldIcon, Linear: RestartLinearIcon },
  TransferHorizontalBoldIcon: { Bold: TransferHorizontalBoldIcon, Linear: TransferHorizontalLinearIcon },
  CashOutBoldIcon: { Bold: CashOutBoldIcon, Linear: CashOutLinearIcon },
  GiftBoldIcon: { Bold: GiftBoldIcon, Linear: GiftLinearIcon },
  PillBoldIcon: { Bold: PillBoldIcon, Linear: PillLinearIcon },
  BookBoldIcon: { Bold: BookBoldIcon, Linear: BookLinearIcon },
  WaterdropBoldIcon: { Bold: WaterdropBoldIcon, Linear: WaterdropLinearIcon },
  TicketBoldIcon: { Bold: TicketBoldIcon, Linear: TicketLinearIcon },
  PaletteBoldIcon: { Bold: PaletteBoldIcon, Linear: PaletteLinearIcon },
  UsersGroupRoundedBoldIcon: { Bold: UsersGroupRoundedBoldIcon, Linear: UsersGroupRoundedLinearIcon },
  CaseBoldIcon: { Bold: CaseBoldIcon, Linear: CaseLinearIcon },
};

interface CategoryIconProps {
  name?: string;
  weight?: 'Bold' | 'Linear';
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function CategoryIcon({
  name = 'TagBoldIcon',
  weight = 'Bold',
  size = 16,
  className = '',
  style,
}: CategoryIconProps) {
  const iconPair = SOLAR_ICON_REGISTRY[name] || SOLAR_ICON_REGISTRY.TagBoldIcon;
  const Component = iconPair[weight] || iconPair.Bold;

  return <Component size={size} className={className} style={style} />;
}
