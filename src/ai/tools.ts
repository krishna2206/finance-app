export const AI_TOOLS_DECLARATIONS = [
  {
    name: 'record_expense',
    description: 'Enregistre une nouvelle dépense ou un débit dans la base de données.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Titre ou description courte de la dépense' },
        amount: { type: 'NUMBER', description: 'Montant en Ariary' },
        feeAmount: { type: 'NUMBER', description: 'Frais appliqués en Ariary (optionnel, 0 par défaut)' },
        categoryId: { type: 'STRING', description: 'Identifiant UUID v4 de la catégorie' },
        wallet: { type: 'STRING', enum: ['MVOLA', 'CASH', 'AIRTEL_MONEY', 'BANK'], description: 'Portefeuille utilisé' },
        date: { type: 'STRING', description: 'Date au format ISO 8601' },
        note: { type: 'STRING', description: 'Note ou commentaire additionnel' },
        placeName: { type: 'STRING', description: 'Nom du commerce ou quartier' },
      },
      required: ['title', 'amount', 'categoryId', 'wallet'],
    },
  },
  {
    name: 'record_income',
    description: 'Enregistre une entrée d argent ou un salaire dans la base de données.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Titre ou origine du revenu' },
        amount: { type: 'NUMBER', description: 'Montant en Ariary' },
        wallet: { type: 'STRING', enum: ['MVOLA', 'CASH', 'AIRTEL_MONEY', 'BANK'], description: 'Portefeuille récepteur' },
        date: { type: 'STRING', description: 'Date ISO 8601' },
        note: { type: 'STRING', description: 'Note additionnelle' },
      },
      required: ['title', 'amount', 'wallet'],
    },
  },
  {
    name: 'adjust_budget',
    description: 'Modifie le plafond mensuel alloué à une catégorie de budget.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoryId: { type: 'STRING', description: 'Identifiant UUID v4 de la catégorie' },
        newMonthlyBudget: { type: 'NUMBER', description: 'Nouveau plafond mensuel en Ariary' },
      },
      required: ['categoryId', 'newMonthlyBudget'],
    },
  },
  {
    name: 'adjust_wallet_balance',
    description: 'Recalibre le solde réel actuel d un portefeuille.',
    parameters: {
      type: 'OBJECT',
      properties: {
        walletId: { type: 'STRING', enum: ['MVOLA', 'CASH', 'AIRTEL_MONEY', 'BANK', 'SAVINGS_VAULT'], description: 'Identifiant du portefeuille' },
        newBalance: { type: 'NUMBER', description: 'Nouveau solde réel en Ariary' },
      },
      required: ['walletId', 'newBalance'],
    },
  },
  {
    name: 'simulate_purchase',
    description: 'Simule l impact d un achat futur sur le reste à vivre journalier et la cadence budgétaire.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: { type: 'NUMBER', description: 'Montant de l achat simulé en Ariary' },
        categoryId: { type: 'STRING', description: 'Identifiant de catégorie' },
      },
      required: ['amount'],
    },
  },
];
