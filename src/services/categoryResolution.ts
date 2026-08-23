import { Category, OperationType, RecipientMapping } from '../types';
import { recipientRepository } from '../db/repositories/recipientRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';

export async function resolveTransactionCategory(
  operationType: OperationType,
  recipientOrSender?: string,
  categories: Category[] = []
): Promise<{ categoryId: string; confidence: 'HIGH' | 'MEDIUM' | 'FALLBACK' }> {
  const allCategories = categories.length > 0 ? categories : await categoryRepository.getAllCategories();

  // Find standard category IDs by type or name keywords
  const findCategory = (keywords: string[]): Category | undefined => {
    return allCategories.find(c =>
      keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase()))
    );
  };

  const telecomCat = findCategory(['télécom', 'internet', 'forfait']) || allCategories[0];
  const feeCat = findCategory(['frais', 'service']) || allCategories[0];
  const fixedChargesCat = findCategory(['charges', 'factures', 'loyer']) || allCategories[0];
  const salaryCat = findCategory(['revenus', 'salaire', 'entrées']) || allCategories[0];
  const unforeseenCat = findCategory(['imprévus', 'dépannage']) || allCategories[0];

  // Niveau 1 : Mémoire des contacts
  if (recipientOrSender) {
    const mapping = await recipientRepository.getMappingByPhoneNumber(recipientOrSender);
    if (mapping) {
      return { categoryId: mapping.categoryId, confidence: 'HIGH' };
    }
  }

  // Niveau 2 : Détection par type d'opération explicite
  switch (operationType) {
    case 'TOPUP_AIRTIME':
      return { categoryId: telecomCat.id, confidence: 'HIGH' };
    case 'WITHDRAWAL_CASH':
      return { categoryId: feeCat.id, confidence: 'HIGH' };
    case 'BILL_PAYMENT':
      return { categoryId: fixedChargesCat.id, confidence: 'HIGH' };
    case 'SALARY':
    case 'INCOME_TRANSFER':
      return { categoryId: salaryCat.id, confidence: 'HIGH' };
    case 'MERCHANT_PAYMENT': {
      const foodCat = findCategory(['nourriture', 'marché', 'courses']) || allCategories[0];
      return { categoryId: foodCat.id, confidence: 'MEDIUM' };
    }
    default:
      break;
  }

  // Niveau 3 : Tiers inconnu -> Fallback Dépannages & Imprévus
  return { categoryId: unforeseenCat.id, confidence: 'FALLBACK' };
}
