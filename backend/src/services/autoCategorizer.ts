import { recipientRepository } from '../db/repositories/recipientRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { ParsedSMSResult } from './smsParser';

export const autoCategorizer = {
  /**
   * Resolves the most accurate category for a parsed SMS transaction.
   * 1. Check Recipient Memory (RecipientMapping)
   * 2. Heuristic rules based on operation type, merchant, and reason keywords
   * 3. Fallback to appropriate default category
   */
  resolveCategory(parsed: ParsedSMSResult): string {
    const allCategories = categoryRepository.getAllCategories();
    const expenseCategories = allCategories.filter(c => c.type === 'EXPENSE');
    const incomeCategories = allCategories.filter(c => c.type === 'INCOME');

    // 1. Recipient Memory (Level 1)
    if (parsed.phoneNumber) {
      const memory = recipientRepository.getMappingByPhoneNumber(parsed.phoneNumber);
      if (memory && allCategories.some(c => c.id === memory.categoryId)) {
        return memory.categoryId;
      }
    }

    const lowerTitle = (parsed.title || '').toLowerCase();
    const lowerNote = (parsed.note || '').toLowerCase();
    const lowerRecipient = (parsed.recipient || parsed.sender || '').toLowerCase();
    const fullTextSearch = `${lowerTitle} ${lowerNote} ${lowerRecipient}`;

    // Helper to find category matching keywords
    const findCategory = (keywords: string[], list = allCategories): string | undefined => {
      const match = list.find(c => {
        const catName = c.name.toLowerCase();
        return keywords.some(k => catName.includes(k));
      });
      return match?.id;
    };

    // 2. Specific Operation Rules (Level 2)
    if (parsed.operationType === 'TOPUP_AIRTIME') {
      const catId = findCategory(['télécom', 'telecom', 'crédit', 'internet', 'forfait'], expenseCategories);
      if (catId) return catId;
    }

    if (parsed.operationType === 'WITHDRAWAL_CASH') {
      const catId = findCategory(['frais', 'mobile', 'services'], expenseCategories);
      if (catId) return catId;
    }

    if (parsed.operationType === 'SALARY' || parsed.flow === 'CREDIT') {
      if (parsed.operationType === 'SALARY' || fullTextSearch.includes('salaire') || fullTextSearch.includes('societe')) {
        const catId = findCategory(['salaire', 'salary'], incomeCategories);
        if (catId) return catId;
      }
      return incomeCategories[0]?.id || allCategories[0]?.id || '';
    }

    // 3. Keyword Heuristics (Merchant & Reason)
    // A. Food / Supermarket / Restaurant / Sandwich
    if (
      fullTextSearch.includes('score') ||
      fullTextSearch.includes('supermkt') ||
      fullTextSearch.includes('jumbo') ||
      fullTextSearch.includes('leader') ||
      fullTextSearch.includes('marché') ||
      fullTextSearch.includes('marche') ||
      fullTextSearch.includes('sandwich') ||
      fullTextSearch.includes('pain') ||
      fullTextSearch.includes('dejeuner') ||
      fullTextSearch.includes('diner') ||
      fullTextSearch.includes('gouter') ||
      fullTextSearch.includes('food') ||
      fullTextSearch.includes('repas')
    ) {
      const catId = findCategory(['nourriture', 'marché', 'marche', 'repas', 'courses'], expenseCategories);
      if (catId) return catId;
    }

    // B. Bills & Utilities (Jirama, Canal, Rent)
    if (
      fullTextSearch.includes('jirama') ||
      fullTextSearch.includes('canal') ||
      fullTextSearch.includes('loyer') ||
      fullTextSearch.includes('eau') ||
      fullTextSearch.includes('electricite')
    ) {
      const catId = findCategory(['charge', 'facture', 'loyer', 'maison'], expenseCategories);
      if (catId) return catId;
    }

    // C. Transport & Fuel
    if (
      fullTextSearch.includes('total') ||
      fullTextSearch.includes('shell') ||
      fullTextSearch.includes('jollys') ||
      fullTextSearch.includes('station') ||
      fullTextSearch.includes('essence') ||
      fullTextSearch.includes('gasoil') ||
      fullTextSearch.includes('taxi') ||
      fullTextSearch.includes('bus')
    ) {
      const catId = findCategory(['transport', 'carburant', 'auto'], expenseCategories);
      if (catId) return catId;
    }

    // D. Outings & Drinks
    if (
      fullTextSearch.includes('bar') ||
      fullTextSearch.includes('resto') ||
      fullTextSearch.includes('restaurant') ||
      fullTextSearch.includes('pizza') ||
      fullTextSearch.includes('cafe') ||
      fullTextSearch.includes('glace')
    ) {
      const catId = findCategory(['sortie', 'restaurant', 'loisir', 'bar'], expenseCategories);
      if (catId) return catId;
    }

    // 4. Default Fallback (Level 3: Dépannages & Imprévus or first expense category)
    const fallbackId = findCategory(['dépannage', 'depannage', 'imprévu', 'imprevu', 'autre'], expenseCategories) ||
      expenseCategories[0]?.id ||
      allCategories[0]?.id ||
      '';

    return fallbackId;
  },
};
