export type CategoryType = 'EXPENSE' | 'INCOME';

/** Groupes d'affichage des catégories (sélecteurs, Paramètres). */
export type CategoryGroup = 'ESSENTIALS' | 'DAILY' | 'COMMITMENTS' | 'MONEY' | 'INCOME';

export const CATEGORY_GROUPS: Array<{ id: CategoryGroup; label: string; type: CategoryType }> = [
  { id: 'ESSENTIALS', label: 'Essentiels', type: 'EXPENSE' },
  { id: 'DAILY', label: 'Vie courante', type: 'EXPENSE' },
  { id: 'COMMITMENTS', label: 'Engagements', type: 'EXPENSE' },
  { id: 'MONEY', label: 'Argent', type: 'EXPENSE' },
  { id: 'INCOME', label: 'Revenus', type: 'INCOME' },
];

export const CATEGORY_GROUP_IDS = CATEGORY_GROUPS.map(g => g.id);

/** Groupe par défaut d'une catégorie personnelle. */
export function defaultGroupFor(type: CategoryType): CategoryGroup {
  return type === 'INCOME' ? 'INCOME' : 'DAILY';
}

export function isGroupOfType(group: CategoryGroup, type: CategoryType): boolean {
  return CATEGORY_GROUPS.find(g => g.id === group)?.type === type;
}

export interface SystemCategoryDefinition {
  id: string;
  name: string;
  type: CategoryType;
  group: CategoryGroup;
  color: string;
  icon: string;
}

/**
 * Identifiants stables des catégories système. Certains datent de la première liste
 * (par exemple `cat_restaurants_cafes` pour « Repas & sorties ») : ils sont conservés
 * pour ne pas réécrire l'historique.
 */
export const SYSTEM_CATEGORY_IDS = {
  // Essentiels
  HOUSING: 'cat_housing',
  BILLS: 'cat_housing_bills',
  GROCERIES: 'cat_food_groceries',
  TRANSPORT: 'cat_transport',
  HEALTH: 'cat_health',

  // Vie courante
  MEALS_OUTINGS: 'cat_restaurants_cafes',
  HOME_HYGIENE: 'cat_home_hygiene',
  PERSONAL_CARE: 'cat_personal_care',
  SHOPPING: 'cat_shopping',
  LEISURE: 'cat_leisure_outings',

  // Engagements
  FAMILY_GIFTS: 'cat_family_gifts',
  SUBSCRIPTIONS_DIGITAL: 'cat_subscriptions',
  EDUCATION_WORK: 'cat_education_work',

  // Argent
  FEES_MOBILE_MONEY: 'cat_fees_mobile_money',
  MONEY_TRANSFERS: 'cat_money_transfers',
  MISC: 'cat_uncategorized',

  // Revenus
  SALARY: 'cat_salary',
  BONUS: 'cat_bonus',
  SIDE_INCOME: 'cat_freelance',
  TRANSFERS_RECEIVED: 'cat_transfers_received',
  REFUNDS: 'cat_refunds',
  OTHER_INCOME: 'cat_other_income',
} as const;

const C = SYSTEM_CATEGORY_IDS;

export const DEFAULT_SYSTEM_CATEGORIES: SystemCategoryDefinition[] = [
  // Essentiels
  { id: C.HOUSING, name: 'Logement', type: 'EXPENSE', group: 'ESSENTIALS', color: '#7C3AED', icon: 'Home2BoldIcon' },
  { id: C.BILLS, name: 'Factures & charges', type: 'EXPENSE', group: 'ESSENTIALS', color: '#8B5CF6', icon: 'LightbulbBoltBoldIcon' },
  { id: C.GROCERIES, name: 'Courses', type: 'EXPENSE', group: 'ESSENTIALS', color: '#F59E0B', icon: 'CartLarge4BoldIcon' },
  { id: C.TRANSPORT, name: 'Transport', type: 'EXPENSE', group: 'ESSENTIALS', color: '#3B82F6', icon: 'BusBoldIcon' },
  { id: C.HEALTH, name: 'Santé', type: 'EXPENSE', group: 'ESSENTIALS', color: '#EF4444', icon: 'HeartBoldIcon' },

  // Vie courante
  { id: C.MEALS_OUTINGS, name: 'Repas & sorties', type: 'EXPENSE', group: 'DAILY', color: '#D97706', icon: 'CupBoldIcon' },
  { id: C.HOME_HYGIENE, name: 'Maison & hygiène', type: 'EXPENSE', group: 'DAILY', color: '#0D9488', icon: 'BroomBoldIcon' },
  { id: C.PERSONAL_CARE, name: 'Soins personnels', type: 'EXPENSE', group: 'DAILY', color: '#DB2777', icon: 'ScissorsBoldIcon' },
  { id: C.SHOPPING, name: 'Shopping', type: 'EXPENSE', group: 'DAILY', color: '#A855F7', icon: 'TShirtBoldIcon' },
  { id: C.LEISURE, name: 'Loisirs', type: 'EXPENSE', group: 'DAILY', color: '#F97316', icon: 'GamepadBoldIcon' },

  // Engagements
  { id: C.FAMILY_GIFTS, name: 'Famille & dons', type: 'EXPENSE', group: 'COMMITMENTS', color: '#E11D48', icon: 'HandHeartBoldIcon' },
  { id: C.SUBSCRIPTIONS_DIGITAL, name: 'Abonnements & numérique', type: 'EXPENSE', group: 'COMMITMENTS', color: '#EC4899', icon: 'RepeatBoldIcon' },
  { id: C.EDUCATION_WORK, name: 'Éducation & travail', type: 'EXPENSE', group: 'COMMITMENTS', color: '#6366F1', icon: 'SquareAcademicCapBoldIcon' },

  // Argent
  { id: C.FEES_MOBILE_MONEY, name: 'Frais bancaires & Mobile Money', type: 'EXPENSE', group: 'MONEY', color: '#64748B', icon: 'SmartphoneBoldIcon' },
  { id: C.MONEY_TRANSFERS, name: 'Envois d’argent', type: 'EXPENSE', group: 'MONEY', color: '#0EA5E9', icon: 'SendSquareBoldIcon' },
  { id: C.MISC, name: 'Divers', type: 'EXPENSE', group: 'MONEY', color: '#94A3B8', icon: 'MenuDotsBoldIcon' },

  // Revenus
  { id: C.SALARY, name: 'Salaire', type: 'INCOME', group: 'INCOME', color: '#22C55E', icon: 'Banknote2BoldIcon' },
  { id: C.BONUS, name: 'Primes & bonus', type: 'INCOME', group: 'INCOME', color: '#16A34A', icon: 'StarsBoldIcon' },
  { id: C.SIDE_INCOME, name: 'Revenus annexes', type: 'INCOME', group: 'INCOME', color: '#14B8A6', icon: 'LaptopBoldIcon' },
  { id: C.TRANSFERS_RECEIVED, name: 'Virements reçus', type: 'INCOME', group: 'INCOME', color: '#0EA5E9', icon: 'HandMoneyBoldIcon' },
  { id: C.REFUNDS, name: 'Remboursements', type: 'INCOME', group: 'INCOME', color: '#65A30D', icon: 'RestartBoldIcon' },
  { id: C.OTHER_INCOME, name: 'Autres revenus', type: 'INCOME', group: 'INCOME', color: '#84CC16', icon: 'AddCircleBoldIcon' },
];

/** Anciennes catégories système fusionnées dans une autre (migration 0002). */
export const RETIRED_SYSTEM_CATEGORIES: Record<string, string> = {
  cat_tools_business: C.SUBSCRIPTIONS_DIGITAL,
  cat_cash_withdrawal: C.FEES_MOBILE_MONEY,
};

const SYSTEM_CATEGORY_ID_SET = new Set<string>(Object.values(SYSTEM_CATEGORY_IDS));

export function isSystemCategory(categoryId: string): boolean {
  return SYSTEM_CATEGORY_ID_SET.has(categoryId);
}

/**
 * Catégorie imposée à un transfert entre ses propres comptes (dont un retrait Cash Point) :
 * seuls ses frais comptent comme dépense, ils vont donc dans les frais.
 */
export const TRANSFER_CATEGORY_ID = C.FEES_MOBILE_MONEY;
