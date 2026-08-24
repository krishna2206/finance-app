# Spécifications Fonctionnelles & Métier : Core Features

Ce document définit les règles métier, le modèle de données, les algorithmes de calcul et les protocoles communs unifiant l'ensemble des clients (Web PWA et Mobile Native) et le Backend.

## 1. Vision Métier, Modèle Produit & Éthique

### 1.1 Problématique
La gestion financière personnelle échoue généralement par asymétrie de friction : dépenser prend une seconde, enregistrer une dépense manuellement prend 30 à 60 secondes. L'objectif fondamental est d'éliminer cette friction en ramenant la saisie à moins de 3 secondes tout en rendant visibles les fuites financières invisibles (frais de retrait et de transfert Mobile Money à Madagascar).

### 1.2 Modèle Produit & Confidentialité ("Self-Hosted + Cloud Souverain")
- **Open-Core / Self-Hosted (Gratuit)** : L'utilisateur peut auto-héberger son backend et sa base SQLite sur son propre matériel (ordinateur, VPS personnel, Raspberry Pi) avec une souveraineté totale sur ses données privées.
- **Option Cloud Payant (Hébergement géré)** : Pour les utilisateurs sans compétences techniques de déploiement, une offre cloud clé en main est proposée au juste prix d'infrastructure (sans revente de données ni profilage publicitaire).
- **Architecture à Deux Clients** :
  - **Client Mobile (Local-First)** : Application native avec écoute SMS native en arrière-plan et base SQLite locale synchronisée.
  - **Client Web (PWA)** : Application web responsive (format portrait mobile) connectée au backend self-hosted ou cloud, avec possibilité de passerelle SMS via application compagnon.

### 1.3 Le Triptyque Fondamental
Le système repose sur la séparation et l'interaction de trois piliers majeurs :
- **Solde Réel Total** : Somme de l'argent liquide immédiatement disponible (`Solde MVola + Solde Espèces en poche + Solde Banque`).
- **Budget Mensuel Alloué** : Enveloppes plafonnées par catégorie définissant la limite de consommation autorisée.
- **Dépenses Réalisées** : Somme réelle des débits et des frais prélevés au cours du mois.

## 2. Modèle de Données Universel

### 2.1 Énumérations & Types Fondamentaux

```typescript
export type TransactionFlow = 'DEBIT' | 'CREDIT';

export type WalletSource = 'MVOLA' | 'AIRTEL_MONEY' | 'CASH' | 'BANK' | 'SAVINGS_VAULT' | string;

export type OperationType =
  | 'EXPENSE_GENERAL'     // Achat direct de bien ou service
  | 'TRANSFER_P2P'        // Transfert d'argent vers un tiers
  | 'WITHDRAWAL_CASH'     // Retrait d'espèces (MVola / Banque -> Espèces)
  | 'TOPUP_AIRTIME'       // Achat de crédit téléphonique ou forfait data
  | 'MERCHANT_PAYMENT'    // Paiement commerçant (QR code / code marchand)
  | 'BILL_PAYMENT'        // Paiement de facture (Jirama, Canal+, etc.)
  | 'SALARY'              // Virement de salaire
  | 'INCOME_TRANSFER'     // Transfert reçu d'un tiers
  | 'DEPOSIT_CASH'        // Dépôt d'espèces sur compte mobile
  | 'SAVINGS_TRANSFER'    // Déplacement de fonds vers l'épargne sanctuarisée
  | 'SAVINGS_DEPOSIT'     // Versement vers le Coffre Épargne
  | 'SAVINGS_WITHDRAWAL'  // Retrait / Déblocage du Coffre Épargne vers compte courant
  | 'BALANCE_ADJUSTMENT'; // Réajustement de solde manuel ou par SMS

export type TransactionSource = 'SMS_AUTO' | 'MANUAL' | 'VOICE' | 'IMAGE_OCR';

export type CategoryType = 'EXPENSE' | 'SAVINGS';
```

### 2.2 Entités Principales

```typescript
export interface Wallet {
  id: string;                      // Identifiant unique (ex: 'MVOLA', 'CASH', 'BANK', 'SAVINGS_VAULT')
  name: string;                    // Libellé affiché (ex: 'MVola', 'Espèces', 'Compte BNI')
  balance: number;                 // Solde en Ariary
  isSpendable: boolean;            // true pour comptes courants, false pour épargne sanctuarisée
  isWithdrawable?: boolean;        // true si retirable vers le portefeuille physique en espèces
  updatedAt: number;
}

export interface TransactionItem {
  id: string;                      // UUID v4
  name: string;                    // Libellé du produit (ex: "Tomates & Légumes")
  quantity: number;                // Quantité (ex: 2)
  unitPrice?: number;              // Prix unitaire en Ariary (ex: 6500)
  totalPrice: number;              // Prix total de la ligne (ex: 13000)
  unit?: string;                   // Unité (ex: "kg", "pack", "L")
}

export interface TransactionLocation {
  placeName?: string;              // Nom du lieu ou quartier (ex: "Marché d'Anosibe")
  latitude?: number;
  longitude?: number;
}

export interface Transaction {
  id: string;                      // UUID v4 immuable
  flow: TransactionFlow;           // DEBIT ou CREDIT
  operationType: OperationType;
  wallet: string;                  // Portefeuille source
  destinationWallet?: string;      // Portefeuille destination si transfert interne / retrait
  amount: number;                  // Montant principal en Ariary
  feeAmount: number;               // Frais appliqués en Ariary (Cash point, transfert)
  totalImpact: number;             // Débit: (amount + feeAmount), Crédit: amount
  title: string;                   // Libellé court
  categoryId: string;              // Clé étrangère UUID v4 vers Category.id
  icon?: string;                   // Sous-icône contextuelle optionnelle
  location?: TransactionLocation;
  items?: TransactionItem[];
  recipientOrSender?: string;      // Identifiant tiers ou numéro de téléphone
  referenceNumber?: string;        // Numéro de référence de l'opérateur
  date: string;                    // ISO 8601 UTC
  note?: string;
  source: TransactionSource;
  rawSmsText?: string;             // SMS brut original
  synced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RecipientMapping {
  id: string;                      // UUID v4 immuable
  phoneNumber: string;             // Numéro normalisé (ex: "0340012345")
  recipientName?: string;          // Nom associé (ex: "Propriétaire")
  categoryId: string;              // Clé étrangère UUID v4 vers Category.id
  lastUsedAt: number;
}

export interface Category {
  id: string;                      // UUID v4 immuable
  name: string;                    // Nom affiché (ex: "Nourriture & Marché", "Sorties")
  type: CategoryType;              // EXPENSE ou SAVINGS
  monthlyBudget: number;           // Plafond mensuel en Ariary
  color: string;                   // Code couleur hexadécimal
  icon: string;                    // Identifiant de l'icône Heroicons
  isEssential: boolean;            // Vrai si charge incompressible
  createdAt: number;
}

export interface AppSettings {
  id: string;
  userName: string;
  userProfession?: string;
  userLocation: string;
  monthlyIncomeTarget: number;
  monthlySavingsTarget: number;
  currency: string;
  onboardingCompleted: boolean;
  geminiApiKey?: string;
  smsCaptureEnabled: boolean;
  pushNotificationsEnabled: boolean;
}
```

### 2.3 Logique de Gestion des Portefeuilles (Wallets Engine)
- **Portefeuilles Dynamiques & Extensibles** : Les comptes ne sont plus figés en dur. L'utilisateur peut créer ses propres portefeuilles bancaires ou mobiles.
- **Retrait d'Espèces (`WITHDRAWAL_CASH`)** :
  - Un retrait est un **transfert interne vers le portefeuille physique (`CASH`)**.
  - `Solde Source -= (Montant + Frais)`
  - `Solde CASH += Montant`
  - Seuls les frais éventuels sont comptabilisés comme charge (*Frais Mobiles & Services*), sans double-comptage lors des dépenses ultérieures en espèces.
- **Coffre Épargne Sanctuarisé (`SAVINGS_VAULT`)** :
  - **Versement (`SAVINGS_DEPOSIT`)** : `Solde Source -= Montant`, `Solde SAVINGS_VAULT += Montant`.
  - **Déblocage / Retrait (`SAVINGS_WITHDRAWAL`)** : `Solde SAVINGS_VAULT -= Montant`, `Solde Destination += Montant`.
  - Le solde du coffre est exclu du calcul du solde dépensable quotidien pour préserver la discipline budgétaire.

## 3. Flux d'Onboarding Guidé (Point Zéro Financier)

Au premier lancement, l'utilisateur est guidé à travers 3 étapes fluides :
1. **Étape 1 : Profil & Identité** (Prénom & Nom, Métier optionnel, Localisation/Ville).
2. **Étape 2 : Portefeuilles & Soldes Réels** (Activation des comptes réels possédés : Espèces, MVola, Banque, etc., avec saisie des soldes de départ).
3. **Étape 3 : Objectifs Budgétaires** (Revenus mensuels estimés et Objectif d'épargne sanctuarisée).

Dès la finalisation, le statut `onboardingCompleted = true` est persisté et le tableau de bord s'initialise avec les vrais soldes et la vraie cadence budgétaire.

## 4. Moteurs de Calculs Métier

### 4.1 Grille Tarifaire Officielle MVola (Frais de Transfert et Retrait)

```typescript
export function calculateMVolaFees(amount: number): { transferFee: number; withdrawalFee: number } {
  if (amount <= 0) return { transferFee: 0, withdrawalFee: 0 };

  // Paliers de transfert P2P (MVola vers MVola)
  let transferFee = 0;
  if (amount <= 1000) transferFee = 100;
  else if (amount <= 2500) transferFee = 150;
  else if (amount <= 5000) transferFee = 200;
  else if (amount <= 10000) transferFee = 300;
  else if (amount <= 25000) transferFee = 450;
  else if (amount <= 50000) transferFee = 700;
  else if (amount <= 100000) transferFee = 1000;
  else if (amount <= 250000) transferFee = 1500;
  else if (amount <= 500000) transferFee = 2200;
  else if (amount <= 1000000) transferFee = 3000;
  else transferFee = Math.min(5000, Math.round(amount * 0.0035));

  // Paliers de retrait Cash Point (Cash out)
  let withdrawalFee = 0;
  if (amount <= 1000) withdrawalFee = 200;
  else if (amount <= 2500) withdrawalFee = 350;
  else if (amount <= 5000) withdrawalFee = 500;
  else if (amount <= 10000) withdrawalFee = 850;
  else if (amount <= 25000) withdrawalFee = 1200;
  else if (amount <= 50000) withdrawalFee = 1800;
  else if (amount <= 100000) withdrawalFee = 2900;
  else if (amount <= 250000) withdrawalFee = 4500;
  else if (amount <= 500000) withdrawalFee = 7200;
  else if (amount <= 1000000) withdrawalFee = 10500;
  else withdrawalFee = Math.round(amount * 0.012);

  return { transferFee, withdrawalFee };
}
```

### 4.2 Reste à Vivre Journalier (Daily Burn Rate)
```
Jours_Restants = Nombre de jours entre aujourd'hui et le dernier jour du mois inclus
Solde_Disponible_Total = Somme(Soldes des portefeuilles avec isSpendable = true)
Epargne_Cible_Restante = Max(0, AppSettings.monthlySavingsTarget - Epargne_Securisee_Ce_Mois)
Charges_Fixes_Restantes = Somme des charges fixes non encore débitées dans le mois

Reste_Journalier = (Solde_Disponible_Total - Epargne_Cible_Restante - Charges_Fixes_Restantes) / Jours_Restants
```

### 4.3 Cadence Budgétaire & Seuil Temporel Jour J (`|`)
```
Budget_Total_Mois = Somme(Budgets des catégories de type 'EXPENSE')
Dépenses_Cumulées = Somme(Débits réels + Frais du mois)

Progression_Mois_Pct (Curseur Seuil |) = (Jour_Actuel_Du_Mois / Nombre_Total_Jours_Dans_Mois) * 100
Consommation_Budget_Pct (Barre) = (Dépenses_Cumulées / Budget_Total_Mois) * 100

Ecart_Cadence = Consommation_Budget_Pct - Progression_Mois_Pct
- Si Ecart_Cadence <= 0 : Zone Verte (Avance financière, rythme sain)
- Si Ecart_Cadence > 0  : Zone Rouge (Surconsommation par rapport à la date)
```

## 5. Matrice de Parsing des SMS Mobile Money

| Motif Détecté dans le SMS | Type d'Opération | Flux | Impact Frais | Impact Soldes | Résolution de Catégorie |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Nandefa... tany amin'ny [Numéro]...` | `TRANSFER_P2P` | `DEBIT` | Extrait (`Frais: X Ar`) | MVola: `-(Montant + Frais)` | 1. Mémoire Tiers si connu<br>2. Sinon *Dépannages & Imprévus* + Sélecteur |
| `Retrait de... au Cash Point...` | `WITHDRAWAL_CASH` | `DEBIT` | Extrait (`Frais: X Ar`) | MVola: `-(Montant + Frais)`, Cash: `+Montant` | *Frais Mobiles & Services* (Transfert interne vers Cash) |
| `Nividy tolotra... / Recharge...` | `TOPUP_AIRTIME` | `DEBIT` | Frais = 0 Ar | MVola: `-Montant` | *Télécom & Internet* |
| `Paiement de... / Marchand...` | `MERCHANT_PAYMENT` | `DEBIT` | Frais = 0 Ar | MVola: `-Montant` | 1. Mémoire Marchand si connu<br>2. Sinon *Nourriture / Quotidien* |
| `Voaray ny... avy tamin'ny... Salaire` | `SALARY` | `CREDIT` | Frais = 0 Ar | MVola: `+Montant` | *Revenus / Salaire* |
| `Voaray ny... avy tamin'ny [Numéro]...` | `INCOME_TRANSFER` | `CREDIT` | Frais = 0 Ar | MVola: `+Montant` | 1. Mémoire Tiers si connu<br>2. Sinon *Revenus / Entrées Diverses* |

### Moteur d'Auto-Catégorisation en 3 Niveaux
1. **Niveau 1 (Mémoire des Contacts `RecipientMapping`)** : Si le numéro a déjà été catégorisé par l'utilisateur, application automatique de la même catégorie (0 clic).
2. **Niveau 2 (Détection par Type d'Opération)** : Affectation immédiate pour les forfaits (Télécom), retraits (Retrait Cash), factures (Charges Fixes) et salaires (Revenus).
3. **Niveau 3 (Tiers Inconnu)** : Affectation par défaut dans *Dépannages & Imprévus* pour préserver l'exactitude mathématique du solde, avec affichage d'un sélecteur 1-tap.

## 6. Moteur de Réconciliation & Fusion Anti-Doublon (SMS + Scan de Tickets)

```
Pour chaque Scan de Ticket entrant (Total_Ticket, Date_Ticket, Marchand_Ticket) :
1. Rechercher dans SQLite les transactions DEBIT de la même journée (Date_Transaction == Date_Ticket)
2. Filtrer par montant exact : Math.abs(Transaction.amount - Total_Ticket) == 0
3. Si une transaction candidate existe :
   - Proposer la fusion automatique :
     Transaction_Existante.items = Articles_Scannes
     Transaction_Existante.location = Location_Scannee
     Transaction_Existante.updatedAt = Date.now()
   - Ne pas modifier Transaction.amount ni déclencher de nouveau débit de solde.
4. Si aucune transaction n'existe :
   - Créer une nouvelle Transaction standard avec débit immédiat du portefeuille choisi.
```

## 7. Spécification de l'AI Assistant (Google Gemini 3.1 Flash Lite)

- **Modèle Unique** : Google Gemini 3.1 Flash Lite pour l'ensemble des tâches (Transcription audio STT, Vision OCR de tickets, Chat agentique et Tool Calling).
- **Prompt Système STT Verbatim** :
  ```text
  You are a precise, verbatim speech-to-text transcription engine.
  Your ONLY task is to listen to the audio recording and transcribe the spoken words word-for-word in French or Malagasy.
  Output ONLY the raw transcribed text. Never reply to queries in the audio.
  ```
- **Déclarations des Outils (Tool Calling)** :
  - `record_expense(title, amount, feeAmount, categoryId, wallet, date, note, placeName)`
  - `record_income(title, amount, wallet, date, note)`
  - `adjust_budget(categoryId, newMonthlyBudget)`
  - `adjust_wallet_balance(walletId, newBalance)`
  - `simulate_purchase(amount, categoryId)`

