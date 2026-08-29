import { Category } from '../types';

export const SYSTEM_CATEGORY_IDS = {
  // INCOME (4)
  TRANSFERS_RECEIVED: 'cat_transfers_received',
  SALARY: 'cat_salary',
  FREELANCE: 'cat_freelance',
  OTHER_INCOME: 'cat_other_income',

  // EXPENSE (12)
  FOOD_GROCERIES: 'cat_food_groceries',
  RESTAURANTS_CAFES: 'cat_restaurants_cafes',
  TRANSPORT: 'cat_transport',
  HOUSING_BILLS: 'cat_housing_bills',
  SUBSCRIPTIONS: 'cat_subscriptions',
  TOOLS_BUSINESS: 'cat_tools_business',
  HEALTH: 'cat_health',
  SHOPPING: 'cat_shopping',
  LEISURE_OUTINGS: 'cat_leisure_outings',
  CASH_WITHDRAWAL: 'cat_cash_withdrawal',
  FEES_MOBILE_MONEY: 'cat_fees_mobile_money',
  UNCATEGORIZED: 'cat_uncategorized',
} as const;

export const DEFAULT_SYSTEM_CATEGORIES: Array<Omit<Category, 'createdAt'>> = [
  // 1. REVENUS (INCOME)
  {
    id: SYSTEM_CATEGORY_IDS.TRANSFERS_RECEIVED,
    name: 'Virements reçus',
    type: 'INCOME',
    color: '#0EA5E9',
    icon: 'HandMoneyBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.SALARY,
    name: 'Salaire',
    type: 'INCOME',
    color: '#22C55E',
    icon: 'Banknote2BoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.FREELANCE,
    name: 'Freelance / Prestations',
    type: 'INCOME',
    color: '#14B8A6',
    icon: 'LaptopBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.OTHER_INCOME,
    name: 'Autres revenus',
    type: 'INCOME',
    color: '#84CC16',
    icon: 'AddCircleBoldIcon',
  },

  // 2. DÉPENSES (EXPENSE)
  {
    id: SYSTEM_CATEGORY_IDS.FOOD_GROCERIES,
    name: 'Alimentation & Courses',
    type: 'EXPENSE',
    color: '#F59E0B',
    icon: 'CartLarge4BoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.RESTAURANTS_CAFES,
    name: 'Restaurants & Cafés',
    type: 'EXPENSE',
    color: '#D97706',
    icon: 'CupBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.TRANSPORT,
    name: 'Transport',
    type: 'EXPENSE',
    color: '#3B82F6',
    icon: 'BusBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.HOUSING_BILLS,
    name: 'Logement & Factures',
    type: 'EXPENSE',
    color: '#8B5CF6',
    icon: 'Home2BoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.SUBSCRIPTIONS,
    name: 'Abonnements',
    type: 'EXPENSE',
    color: '#EC4899',
    icon: 'RepeatBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.TOOLS_BUSINESS,
    name: 'Outils & Business',
    type: 'EXPENSE',
    color: '#6366F1',
    icon: 'CodeBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.HEALTH,
    name: 'Santé',
    type: 'EXPENSE',
    color: '#EF4444',
    icon: 'HeartBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.SHOPPING,
    name: 'Shopping',
    type: 'EXPENSE',
    color: '#A855F7',
    icon: 'TShirtBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.LEISURE_OUTINGS,
    name: 'Loisirs & Sorties',
    type: 'EXPENSE',
    color: '#F97316',
    icon: 'WineglassTriangleBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.CASH_WITHDRAWAL,
    name: "Retrait d'espèces",
    type: 'EXPENSE',
    color: '#475569',
    icon: 'HandMoneyBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.FEES_MOBILE_MONEY,
    name: 'Frais & Mobile Money',
    type: 'EXPENSE',
    color: '#64748B',
    icon: 'SmartphoneBoldIcon',
  },
  {
    id: SYSTEM_CATEGORY_IDS.UNCATEGORIZED,
    name: 'Non catégorisé',
    type: 'EXPENSE',
    color: '#94A3B8',
    icon: 'MenuDotsBoldIcon',
  },
];
