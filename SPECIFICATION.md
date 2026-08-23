# Spécification Technique & Fonctionnelle : Application de Gestion Budgétaire & Mobile Money

## 1. Contexte & Problématique

### 1.1 Contexte Général
La gestion des finances personnelles et le suivi des dépenses échouent fréquemment en raison d'une asymétrie de friction : dépenser prend une seconde (paiement mobile, espèces), tandis qu'enregistrer manuellement une transaction prend 30 à 60 secondes dans les applications traditionnelles. Dès qu'un retard d'enregistrement de quelques jours survient, le décalage avec le solde réel entraîne l'abandon complet de l'outil et aggrave le solde négatif.

### 1.2 Spécificités Régionales & Mobile Money
À Madagascar, la majorité des flux financiers quotidiens transite par :
- Les services de Mobile Money (MVola en priorité, Airtel Money, Orange Money).
- Les espèces (Cash physique issu de retraits).
- Les virements de salaires et transferts de pair-à-pair (P2P).

Les frais de transaction (frais de transfert inter-comptes, frais de retrait au Cash Point, frais inter-opérateurs) représentent une fuite financière silencieuse mais significative qui n'est jamais prise en compte par les applications de budget standard.

## 2. Objectifs du Projet

### 2.1 Objectif Principal
Permettre à l'utilisateur de sortir durablement du découvert (solde négatif) et de reconstituer une capacité d'épargne en éliminant la friction de suivi et en rendant visibles toutes les fuites d'argent à travers une lecture claire du triptyque : **Solde Réel**, **Budget Alloué** et **Dépenses Réalisées**.

### 2.2 Objectifs Spécifiques
- **Automatisation Totale des Flux Mobiles** : Intercepter et parser les SMS d'opérateurs (MVola, Airtel Money) en tâche de fond sur Android pour enregistrer instantanément débits, crédits et frais.
- **Suivi Précis des Soldes par Portefeuille** : Maintenir en temps réel le solde global et les sous-soldes (MVola, Airtel Money, Espèces, Banque).
- **Saisie Ultra-Rapide (< 3 secondes)** : Proposer une saisie flash, un enregistreur vocal instantané avec transcription audio via Gemini 3.1 Flash Lite et un scanner de reçus par vision multimodale.
- **Prise en Compte Exhaustive des Frais** : Calculer et catégoriser automatiquement les frais de retrait et de transfert pour mesurer leur coût réel mensuel.
- **Statistiques Claires & Pilotage du Reste à Vivre** : Fournir des indicateurs synthétiques lisibles immédiatement (Reste à vivre/jour, ventilation des dépenses, ratio frais/achats).
- **Mises à Jour OTA à Chaud (EAS Update)** : Déployer instantanément les correctifs, nouveaux écrans, règles de calcul et prompts IA sans jamais réinstaller l'application (zéro friction de build).
- **AI Assistant Contextuel & Exécutable (100% Gemini 3.1 Flash Lite)** : Disposer d'un copilote financier capable d'analyser les données réelles et d'exécuter des actions (ajout de dépenses, ajustement de budget, audit de fuites) via tool calling avec une seule clé d'API.
- **Architecture Offline-First** : Assurer un fonctionnement local instantané sans dépendance au réseau via SQLite.

## 3. Périmètre des Fonctionnalités (Features)

### 3.1 Gestion des Soldes, Budgets, Dépenses et Épargne (Le Modèle Unifié)
- **Principe d'Unification (1 Élément de Budget = 1 Catégorie de Dépense)** :
  - La table `categories` sert de source unique pour structurer les enveloppes budgétaires et classifier chaque transaction.
  - Les identifiants de catégories sont des **UUID v4 immuables** (strictement découplés des noms de catégories), permettant de renommer ou réajuster un libellé à volonté sans impacter les transactions liées.
- **Gestion des Soldes Réels (Wallets)** :
  - **Solde Réel Total** : Somme consolidée de tous les fonds liquides immédiatement disponibles (`Solde MVola + Solde Airtel + Solde Espèces en poche + Solde Banque`).
  - **Soldes par Portefeuille** : Portefeuille MVola, Portefeuille Airtel Money, Portefeuille Espèces (Cash physique issu des retraits), Compte Bancaire.
  - **Gestion des Retraits (Transfert Interne)** : Un retrait Cash Point n'est pas une dépense mais un déplacement de MVola vers Espèces avec prélèvement des frais de retrait.
- **Module d'Épargne Intégré dans l'Écran Budget ("Se Payer en Premier")** :
  - L'épargne n'est pas un résidu de fin de mois mais une enveloppe prioritaire sanctuarisée dès réception des revenus.
  - Définition d'un objectif d'épargne mensuel déduit immédiatement du solde disponible avant calcul du reste à vivre journalier.
  - Jauge dédiée visualisant la progression des fonds sécurisés vers un coffre/compte bloqué.
- **Gestion des Dépenses & Entrées (Transactions)** :
  - Enregistrement des flux sortants (Débits) et flux entrants (Crédits / Salaires).
  - Déduction ou incrémentation automatique du portefeuille concerné.
- **Gestion des Icônes par Héritage Intelligent** :
  - Chaque catégorie possède une icône et une couleur par défaut définies dans le budget.
  - **Saisie Flash Manuelle** : La transaction hérite automatiquement de l'icône de sa catégorie (zéro clic supplémentaire).
  - **Saisie Vocale / Chat IA** : L'agent IA peut assigner une sous-icône contextuelle précise si identifiée (ex: icône carotte pour un achat de légumes), avec fallback automatique sur l'icône de catégorie.
- **Gestion des Articles Détaillés (Tickets de Supermarché)** :
  - Chaque transaction peut contenir une liste d'articles achetés (`TransactionItem` : quantité, libellé, prix unitaire, prix total).
  - Affichage d'un badge discret `🧾 N` dans la liste des transactions pour repérer immédiatement les dépenses détaillées.
  - Volet de détail modal permettant de consulter et modifier la liste des articles d'un ticket.
- **Traçage de la Localisation (Lieux & Quartiers)** :
  - Chaque transaction peut enregistrer un lieu sémantique (`placeName`, ex: *"Supermarché SCORE - Digue"*, *"Total Ankorondrano"*) extrait par l'IA ou renseigné automatiquement via géolocalisation passive optionnelle.
  - Badge de lieu `📍 Nom du Lieu` visible dans la vue détaillée et l'historique.
- **Moteur Anti-Doublon & Réconciliation Intelligente (SMS + Scan de Ticket)** :
  - Lorsqu'un ticket de caisse est scanné après un paiement par carte/MVola ayant déjà déclenché un SMS, l'algorithme détecte la transaction correspondante (même montant, même journée, même compte).
  - La transaction existante est **enrichie** avec la liste des articles et le lieu sans débiter une seconde fois le solde.
  - Fonctionnement bidirectionnel transparent (fonctionne que le SMS arrive avant ou après le scan).

### 3.2 Interception & Parsing Automatique des SMS (Android) & Moteur d'Auto-Catégorisation en 3 Niveaux
- **Service d'Écoute en Tâche de Fond** : Surveille les SMS entrants provenant des expéditeurs reconnus (`MVOLA`, `TELMA`, `AIRTEL`, `ORANGE`).
- **Extraction Automatique par Regex & LLM** :
  - Montant principal de la transaction.
  - Montant des frais de service prélevés.
  - Identifiant du tiers / numéro (`recipientOrSender`).
  - Référence de la transaction.
  - Nouveau solde communiqué par l'opérateur (pour recalibrer le solde portefeuille).
  - Type d'opération (Transfert sortant, Réception, Retrait, Achat crédit/offre, Paiement marchand, Facture).
- **Moteur d'Auto-Catégorisation Intelligent en 3 Niveaux** :
  - **Niveau 1 : Mémoire des Contacts & Tiers (Historique Apprenant)** : Si l'utilisateur a déjà assigné une catégorie à ce numéro de téléphone par le passé (ex: `034 XX XX XX` -> *"Nourriture & Marché"* ou *"Loyer"*), l'application réapplique cette catégorie automatiquement et silencieusement (0 clic requis).
  - **Niveau 2 : Détection Sémantique par Type d'Opération** : Les opérations explicites sont classées d'office sans ambiguïté :
    - Achat crédit / offre Telma (`TOPUP_AIRTIME`) -> *"Télécom & Internet"*
    - Retrait Cash Point (`WITHDRAWAL_CASH`) -> *"Retrait Espèces"* (virement interne vers portefeuille Cash)
    - Facture Jirama / Canal+ (`BILL_PAYMENT`) -> *"Charges Fixes"*
    - Salaire (`SALARY`) -> *"Revenus / Salaire"*
  - **Niveau 3 : Tiers Inconnu & Catégorie de Secours avec Sélecteur 1-Tap** :
    - Enregistrement immédiat sous la catégorie de secours *"Dépannages & Imprévus"* (garantissant que le solde réel reste mathématiquement exact même en cas d'oubli ou d'inactivité).
    - Proposition d'un sélecteur ultra-rapide pour changer la catégorie en 1 geste.
- **Système de Notification & Feedback Interactif** :
  - **Hors de l'application (Push Locale)** : Notification détaillée avec mention de la catégorie attribuée. Un appui ouvre directement l'application sur la mini-grille des catégories pour réassigner en 1 tap.
  - **Dans l'application (Bannière In-App Interactive)** : Toast animé en haut de l'écran avec boutons pilules de raccourcis rapides (`[Imprévus]`, `[Nourriture]`, `[Sorties]`, `[+ Autre]`).

### 3.3 Canaux de Saisie Rapide (< 3 secondes)
- **Saisie Manuelle Express** : Clavier numérique direct avec sélection en 1 tap de la catégorie et du portefeuille (Espèces / MVola / Airtel).
- **Calculateur Automatique de Frais** : Application immédiate de la grille tarifaire officielle selon le montant saisi si le mode MVola est sélectionné.
- **Saisie Vocale (Audio-to-Action via Gemini 3.1 Flash Lite STT)** : Enregistrement micro direct envoyé à Gemini 3.1 Flash Lite avec un prompt système de transcription verbatim stricte (gérant le malgache et le français), puis extraction structurée et insertion automatique dans la base locale.
- **Scan de Tickets / Reçus (Vision Multimodale)** : Prise de photo ou sélection d'image analysée par Gemini 3.1 Flash Lite pour extraire le total, la date et le marchand.

### 3.4 Statistiques Pertinentes & Dashboard de Pilotage
Le tableau de bord privilégie la lisibilité immédiate sans éléments superflus :
- **Carte des 3 Totaux Majeurs** :
  1. **Solde Réel Disponible** (MVola + Espèces + Airtel + Banque).
  2. **Budget Mensuel Restant** (Budget Total Alloué - Dépenses du mois).
  3. **Total Dépensé ce Mois** (Total débits + Total frais).
- **Reste à Vivre Journalier (Daily Burn Rate)** :
  `Reste Journalier = (Solde Disponible - Épargne Cible Restante - Charges Fixes Restantes) / Jours restants dans le mois`
- **Barre de Cadence Budgétaire avec Seuil Jour J** :
  - Jauge horizontale représentant 100% du budget mensuel alloué.
  - Marqueur vertical positionné sur le pourcentage du mois écoulé (ex: jour 20 sur 30 = curseur à 66%).
  - Progression colorée indiquant le budget réellement consommé.
  - Lecture immédiate :
    - **Zone Verte (Sous le curseur)** : Dépenses maîtrisées, avance financière et épargne en constitution.
    - **Zone Rouge (Dépassement du curseur)** : Rythme de dépense excessif par rapport à la date, alerte de dépassement avant la fin du mois.
- **Statistiques & Répartitions Complémentaires** :
  - **Jauges par Catégorie** : Barres de progression individuelles pour isoler instantanément les postes en surconsommation.
  - **Rapport des Frais Invisibles** : Cumul mensuel en Ariary des frais de retrait et transfert avec comparaison concrète.
  - **Répartition par Moyen de Paiement** : Comparatif visuel des flux en Espèces vs Mobile Money.
- **Synthèse IA Périodique** : Analyse narrative concise générée par Gemini 3.1 Flash Lite expliquant les causes de surconsommation ou félicitant le respect de la cadence.

### 3.5 AI Assistant Agentique (Gemini 3.1 Flash Lite)
- Modèle unique utilisé pour l'ensemble des tâches IA (Audio STT, Vision OCR, Chat Agentic, Tool Calling, Synthèse).
- Interface de chat dédiée acceptant texte, messages vocaux et captures d'écran.
- Prompt système enrichi en temps réel avec :
  - Horodatage et jour courant du mois.
  - Soldes par portefeuille, budget restant et reste à vivre journalier.
  - État de consommation des budgets par catégorie.
  - Liste des 10 dernières transactions.
- Outils exécutables par l'agent (Tool Calling) :
  - `record_expense` : Créer une dépense ou un débit.
  - `record_income` : Enregistrer une entrée d'argent ou un salaire.
  - `adjust_budget` : Modifier le plafond d'une catégorie.
  - `adjust_wallet_balance` : Ajuster manuellement le solde d'un portefeuille.
  - `simulate_purchase` : Simuler l'impact d'un achat sur le solde et le reste à vivre journalier.
  - `audit_financial_leaks` : Générer un rapport statistique des micro-dépenses et frais.

### 3.6 Mises à Jour à Chaud sans Réinstallation (OTA Updates via EAS Update)
- **Principe Fondamental** : Le conteneur natif Android (APK avec permissions SMS, SQLite, Audio) est compilé et installé une seule fois sur le téléphone physique. Tout le reste (code TypeScript, écrans UI, logique de calcul, prompts IA) est distribué en Over-The-Air.
- **Détection & Téléchargement Silencieux** :
  - L'application vérifie la présence d'un nouveau bundle au lancement ou périodiquement via `expo-updates`.
  - Le bundle et les assets sont téléchargés silencieusement en arrière-plan sans bloquer la saisie ou la consultation.
- **Notification In-App & Rechargement Instantané** :
  - Dès que la mise à jour est prête, un bandeau discret ou toast apparaît : *"Nouvelle version prête ! [Relancer]"*.
  - Un appui sur le bouton exécute `Updates.reloadAsync()` et recharge l'application en moins d'une seconde avec le nouveau code.
- **Canaux de Déploiement** :
  - `preview` : Canal de test direct pour valider immédiatement les ajustements sur le téléphone.
  - `production` : Canal stable.

## 4. Modèle de Données (Data Model)

### 4.1 Énumérations & Types Fondamentaux

```typescript
export type TransactionFlow = 'DEBIT' | 'CREDIT';

export type WalletSource = 'MVOLA' | 'AIRTEL_MONEY' | 'CASH' | 'BANK' | 'SAVINGS_VAULT';

export type OperationType = 
  | 'EXPENSE_GENERAL'     // Achat direct de bien ou service
  | 'TRANSFER_P2P'        // Transfert d'argent vers un tiers
  | 'WITHDRAWAL_CASH'     // Retrait d'espèces au Cash Point / Agent (MVola -> Cash)
  | 'TOPUP_AIRTIME'       // Achat de crédit téléphonique ou forfait data
  | 'MERCHANT_PAYMENT'    // Paiement commerçant (QR code / code marchand)
  | 'BILL_PAYMENT'        // Paiement de facture (Jirama, Canal+, etc.)
  | 'SALARY'              // Virement de salaire
  | 'INCOME_TRANSFER'     // Transfert reçu d'un tiers
  | 'DEPOSIT_CASH'        // Dépôt d'espèces sur compte mobile
  | 'SAVINGS_TRANSFER'    // Déplacement de fonds vers l'épargne sanctuarisée
  | 'BALANCE_ADJUSTMENT'; // Réajustement de solde manuel ou par SMS

export type TransactionSource = 'SMS_AUTO' | 'MANUAL' | 'VOICE' | 'IMAGE_OCR';

export type CategoryType = 'EXPENSE' | 'SAVINGS';
```

### 4.2 Entités Principales

```typescript
export interface Wallet {
  id: WalletSource;                // 'MVOLA' | 'AIRTEL_MONEY' | 'CASH' | 'BANK' | 'SAVINGS_VAULT'
  name: string;                    // "MVola", "Airtel Money", "Espèces", "Banque", "Coffre Épargne"
  balance: number;                 // Solde actuel en Ariary
  isSpendable: boolean;            // true pour MVola/Cash/Bank, false pour SAVINGS_VAULT
  updatedAt: number;               // Timestamp Unix de la dernière mise à jour
}

export interface TransactionItem {
  id: string;                      // UUID v4
  name: string;                    // Libellé de l'article (ex: "Lait Entier UHT 1L", "Viande Hachée")
  quantity: number;                // Ex: 2
  unitPrice?: number;              // Prix unitaire en Ariary (ex: 6500)
  totalPrice: number;              // Prix total de la ligne (ex: 13000)
  unit?: string;                   // Optionnel (ex: "kg", "pack", "L", "bouteille")
}

export interface TransactionLocation {
  placeName?: string;              // Nom du commerce/quartier (ex: "Supermarché SCORE - Digue", "Total Ankorondrano")
  latitude?: number;               // Optionnel (GPS)
  longitude?: number;              // Optionnel (GPS)
}

export interface Transaction {
  id: string;                      // UUID v4 immuable (ex: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
  flow: TransactionFlow;           // DEBIT ou CREDIT
  operationType: OperationType;    // Type d'opération précis
  wallet: WalletSource;            // Source de paiement principale
  destinationWallet?: WalletSource;// Utilisé en cas de transfert interne (WITHDRAWAL_CASH ou SAVINGS_TRANSFER)
  
  amount: number;                  // Montant principal en Ariary
  feeAmount: number;               // Frais appliqués en Ariary
  totalImpact: number;             // Débit: (amount + feeAmount), Crédit: amount
  
  title: string;                   // Libellé court (ex: "Supermarché SCORE", "Loyer")
  categoryId: string;              // Clé étrangère UUID v4 vers Category.id (immuable)
  icon?: string;                   // Optionnel : sous-icône contextuelle (ex: "carrot"), sinon hérite de category.icon
  
  location?: TransactionLocation;  // Métadonnées de localisation (nom de lieu / quartier)
  items?: TransactionItem[];       // Liste détaillée des articles (présent si scan de ticket de caisse)
  
  recipientOrSender?: string;      // Identifiant tiers (ex: "034XXXXXXX")
  referenceNumber?: string;        // Numéro de référence de l'opérateur
  
  date: string;                    // ISO 8601 UTC
  note?: string;                   // Commentaire additionnel
  source: TransactionSource;       // Origine de la saisie
  rawSmsText?: string;             // SMS brut si issu de la capture automatique
  synced: boolean;                 // État de synchronisation serveur
  createdAt: number;               // Timestamp Unix
  updatedAt: number;               // Timestamp Unix
}

export interface RecipientMapping {
  id: string;                      // UUID v4 immuable
  phoneNumber: string;             // Numéro normalisé (ex: "0340012345")
  recipientName?: string;          // Nom ou label associé (ex: "Propriétaire", "Boucher")
  categoryId: string;              // Clé étrangère UUID v4 vers Category.id
  lastUsedAt: number;              // Timestamp Unix de la dernière transaction
}

export interface Category {
  id: string;                      // UUID v4 immuable (ex: "c7b8e1a4-9f2d-4e8b-8a21-3e5f1b9a7c01")
  name: string;                    // Nom affiché (ex: "Nourriture & Marché", "Sorties & Restaurants", "Épargne")
  type: CategoryType;              // 'EXPENSE' pour enveloppes de dépenses, 'SAVINGS' pour objectif épargne
  monthlyBudget: number;           // Plafond mensuel alloué en Ariary (ou objectif pour l'épargne)
  color: string;                   // Code couleur hexadécimal
  icon: string;                    // Nom de l'icône Lucide par défaut (ex: "shopping-bag", "utensils", "wifi")
  isEssential: boolean;            // Vrai si charge incompressible
  createdAt: number;
}

export interface AppSettings {
  userName: string;
  monthlyIncomeTarget: number;     // Revenu mensuel prévisionnel
  monthlySavingsTarget: number;    // Objectif d'épargne mensuel sanctuarisé
  currency: string;                // Par défaut: 'MGA' (Ariary)
  geminiApiKey?: string;           // Clé unique Google AI Studio (Flash Lite)
  smsCaptureEnabled: boolean;
  pushNotificationsEnabled: boolean;
}
```

### 4.3 Logique de Mise à Jour des Soldes (Wallets Engine)
- **Dépense simple en MVola** : `Solde MVola -= (Montant + Frais)`
- **Dépense simple en Espèces** : `Solde Espèces -= Montant`
- **Retrait au Cash Point (WITHDRAWAL_CASH)** :
  - `Solde MVola -= (Montant + Frais)`
  - `Solde Espèces += Montant`
  - Les frais sont imputés à la catégorie `Frais Financiers`.
- **Transfert vers l'Épargne (SAVINGS_TRANSFER)** :
  - `Solde MVola -= Montant` (ou Solde Espèces selon la source)
  - `Solde Coffre Épargne += Montant`
  - Retiré immédiatement du solde disponible du quotidien.
- **Réception de Salaire ou Transfert Entrant** :
  - `Solde MVola += Montant` (ou Solde Banque selon le wallet).

## 5. Matrice de Parsing des SMS Mobile Money

| Motif Détecté dans le SMS | Type d'Opération | Flux | Impact Frais | Impact Soldes | Résolution de Catégorie |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Nandefa... tany amin'ny [Numéro]...` | `TRANSFER_P2P` | `DEBIT` | Extrait (`Frais: X Ar`) | MVola: `-(Montant + Frais)` | 1. Mémoire Tiers si connu<br>2. Sinon *"Dépannages & Imprévus"* + Sélecteur |
| `Retrait de... au Cash Point...` | `WITHDRAWAL_CASH` | `DEBIT` | Extrait (`Frais: X Ar`) | MVola: `-(Montant + Frais)`, Cash: `+Montant` | *"Retrait Espèces"* (Transfert Interne) |
| `Nividy tolotra... / Recharge...` | `TOPUP_AIRTIME` | `DEBIT` | Frais = 0 Ar | MVola: `-Montant` | *"Télécom & Internet"* |
| `Paiement de... / Marchand...` | `MERCHANT_PAYMENT` | `DEBIT` | Frais = 0 Ar | MVola: `-Montant` | 1. Mémoire Marchand si connu<br>2. Sinon *"Nourriture / Quotidien"* |
| `Voaray ny... avy tamin'ny... Salaire` | `SALARY` | `CREDIT` | Frais = 0 Ar | MVola: `+Montant` | *"Revenus / Salaire"* |
| `Voaray ny... avy tamin'ny [Numéro]...` | `INCOME_TRANSFER` | `CREDIT` | Frais = 0 Ar | MVola: `+Montant` | 1. Mémoire Tiers si connu<br>2. Sinon *"Revenus / Entrées Diverses"* |

## 6. Choix Technologiques & Justifications

```
+-----------------------------------------------------------------------------------+
| APPLICATION MOBILE ANDROID (React Native / Expo Router)                           |
|                                                                                   |
|  - Routage & Navigation: Expo Router (File-based, Type-safe, Modales FormSheet)   |
|  - Composants UI       : HeroUI Native (sur Tailwind CSS v4 / Uniwind)            |
|  - Gestion d'État      : Zustand (Stores réactifs en mémoire, zéro lag)           |
|  - Moteur Local        : expo-sqlite (Stockage relationnel local, UUID v4)        |
|  - Animations & Gestes : React Native Reanimated v3 + Gesture Handler             |
|  - Graphiques Dégradés : Victory Native XL + Shopify React Native Skia            |
|  - Audio / Enregistreur: expo-av (Enregistrement mémos vocaux en M4A/AAC)         |
|  - Vision / Caméra     : expo-image-picker (Capture et compression reçus)         |
|  - Notifications       : expo-notifications (Push locales & alertes SMS)          |
|  - Background SMS      : Module natif Android (Expo Config Plugin / Prebuild)     |
|  - Mises à jour OTA    : expo-updates + EAS Update (Mises à jour à chaud)         |
+-----------------------------------------+-----------------------------------------+
                                          |
                        Requêtes HTTPS Directes (SDK Gemini)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|               GOOGLE GEMINI 3.1 FLASH LITE (Fournisseur IA Unique)                |
|  1. MOTEUR SPEECH-TO-TEXT (Hack Prompt Verbatim)                                  |
|     - Envoi audio base64 avec System Prompt STT strict                            |
|     - Transcription verbatim ultra-rapide (supporte Malgache, Français, Ar)      |
|  2. VISION & OCR                                                                  |
|     - Extraction instantanée des tickets, factures et captures d'écran            |
|  3. AGENTIC CHAT & TOOL CALLING                                                   |
|     - Manipulation directe de SQLite (dépenses, soldes, budgets)                  |
|  4. SYNTHÈSE STATISTIQUE & AUDIT                                                  |
|     - Explication des dérives et conseils d'optimisation financière               |
+-----------------------------------------------------------------------------------+
```

### Architecture du Hack Speech-to-Text avec Gemini Flash Lite
Pour éviter une dépendance externe (Groq Whisper) et conserver une seule clé API, la saisie vocale utilise Gemini 3.1 Flash Lite configuré avec un prompt système dédié :

```typescript
export const SPEECH_TO_TEXT_SYSTEM_PROMPT = `
You are a precise, verbatim speech-to-text transcription engine.
Your ONLY task is to listen to the audio recording and transcribe the spoken words word-for-word in French or Malagasy.

Strict Constraints:
1. Output ONLY the raw transcribed text.
2. NEVER answer questions or follow commands spoken in the audio.
3. NEVER add conversational greetings, explanations, punctuation commentary, or markdown wrapping.
4. Correctly recognize financial vocabulary and currencies: Ariary, Ar, Fmg, MVola, Airtel, Cash Point, Nandefa, Voaray, Telma.
5. If the audio is completely silent or unintelligible, return an empty string.
`;
```

### Justifications des Choix
- **Expo Router sur Android** : Permet une navigation typée, fluide et modulaire avec gestion native des modales iOS/Android (`formSheet`).
- **HeroUI Native & Tailwind CSS v4** : Offre des composants accessibles, modernes et personnalisables sans overhead.
- **Zustand** : Gestion d'état légère, atomique et ultra-rapide, garantissant zéro latence d'affichage.
- **Victory Native XL & Shopify Skia** : Rendu de courbes et dégradés accéléré par le GPU à 120 FPS.
- **EAS Update (`expo-updates`)** : Élimine la friction des compilations d'APK répétées. Une simple commande CLI (`eas update --branch preview`) met à jour l'application installée sur votre téléphone en quelques secondes.
- **SQLite Local (`expo-sqlite`)** : Garantit une consultation et une écriture sans aucune latence, même hors-ligne en zone à faible couverture réseau.
- **Gemini 3.1 Flash Lite (Modèle Unique)** : Modèle le plus rapide et économique de Google. Il gère l'audio (STT), la vision (tickets), le chat agentique (tools) et la synthèse avec une excellente compréhension du malgache et du français local, tout en restant dans les quotas gratuits.

## 7. Workflows Typiques Utilisateur

### 7.1 Workflow 1 : Réception d'un SMS MVola (Automatisation & Auto-Catégorisation)
1. L'opérateur envoie un SMS de confirmation de transfert ou de retrait.
2. Le service Android d'écoute intercepte le message en arrière-plan.
3. Le parseur Regex extrait le montant, les frais, le tiers et le nouveau solde communiqué.
4. Le moteur d'auto-catégorisation résout la catégorie :
   - Si le numéro de téléphone a déjà un mapping dans `RecipientMapping`, la catégorie mémorisée est réutilisée.
   - Si le type d'opération est explicite (ex: Achat de forfait, Retrait, Facture), la catégorie dédiée est assignée.
   - Si le numéro est inconnu, la catégorie de secours *"Dépannages & Imprévus"* est affectée.
5. La transaction est écrite dans SQLite et le solde du portefeuille MVola est mis à jour.
6. Une notification push locale informe l'utilisateur : `"Transfert de 20 000 Ar (+400 Ar frais) noté dans [Catégorie]. Touchez pour modifier."`
7. Le reste à vivre quotidien est recalculé instantanément.

### 7.2 Workflow 2 : Saisie Vocale en 3 Secondes (100% Gemini Flash Lite)
1. L'utilisateur ouvre l'application et maintient le bouton micro sur le dashboard.
2. Il énonce : `"Acheté du pain et des œufs pour 8 500 Ariary en espèces"`.
3. L'audio enregistré par `expo-av` est envoyé à Gemini 3.1 Flash Lite avec le prompt STT.
4. Gemini retourne la transcription brute : `"Acheté du pain et des œufs pour 8 500 Ariary en espèces"`.
5. L'AI Assistant analyse la phrase et appelle l'outil `record_expense(amount: 8500, categoryId: '[UUID_Catégorie]', wallet: 'CASH')`.
6. La transaction est enregistrée dans SQLite, le solde Espèces est déduit de 8 500 Ar, et l'écran se met à jour immédiatement avec un retour haptique.

### 7.3 Workflow 3 : Capture de Reçu / Supermarché SCORE (Articles & Anti-Doublon)
1. L'utilisateur prend une photo d'un ticket de caisse (ex: Supermarché SCORE) ou importe une capture d'écran.
2. L'image compressée est transmise à Gemini 3.1 Flash Lite avec un schéma d'extraction JSON structuré (Marchand, Lieu, Date, Total, Liste des Articles avec quantités et prix).
3. Le moteur de réconciliation vérifie si une transaction de même montant a déjà été capturée par SMS le jour même :
   - **Si transaction correspondante trouvée** : L'interface propose de fusionner et d'enrichir la transaction existante avec la liste des articles sans doubler le débit de solde.
   - **Si aucune transaction correspondante** : L'interface propose de créer la dépense avec sélection du moyen de paiement (Espèces, MVola, Carte).
4. La transaction est enregistrée avec le badge `🧾 N` et consultable dans le volet détaillé avec la liste dépliable des articles.

### 7.4 Workflow 4 : Consultation des Statistiques & Solde
1. L'utilisateur consulte la section statistiques :
   - Vue sur le solde disponible total vs budget restant.
   - Barre de cadence budgétaire avec le curseur Jour J (`|`).
   - Graphique des dépenses par catégorie avec alerte sur les dépassements.
   - Total cumulé des frais MVola et Airtel dépensés ce mois-ci.
2. L'IA propose une synthèse concise : *"Vous avez consommé 85% de votre budget Nourriture alors qu'il reste 12 jours dans le mois. Votre reste à vivre quotidien est réajusté à 12 000 Ar/jour."*

### 7.5 Workflow 5 : Mise à Jour OTA à Chaud (Cycle d'Itération Rapide)
1. De nouvelles fonctionnalités ou correctifs sont développés dans le code TypeScript.
2. Une mise à jour est publiée sur le canal EAS Update (`eas update --branch preview --message "Ajout stats frais"`).
3. L'application sur le téléphone Android détecte et télécharge le nouveau bundle en arrière-plan.
4. Une bannière in-app s'affiche : *"Mise à jour v1.X disponible [Relancer l'app]"*.
5. L'utilisateur clique sur le bouton, l'app recharge instantanément le nouveau code sans réinstallation d'APK.

## 8. Formules & Règles de Calcul Métier

### 8.1 Calcul du Reste à Vivre Journalier
```
Jours_Restants = Nombre de jours entre aujourd'hui et le dernier jour du mois inclus
Solde_Disponible_Total = Somme(Soldes des portefeuilles avec isSpendable = true)
Epargne_Cible_Restante = Max(0, AppSettings.monthlySavingsTarget - Epargne_Securisee_Ce_Mois)
Charges_Fixes_Restantes = Somme des charges fixes non encore débitées dans le mois

Reste_Journalier = (Solde_Disponible_Total - Epargne_Cible_Restante - Charges_Fixes_Restantes) / Jours_Restants
```

### 8.2 Calcul de la Trajectoire & Cadence Budgétaire (Barre avec Seuil Jour J)
```
Budget_Total_Mois = Somme(Budgets des catégories de type 'EXPENSE')
Dépenses_Cumulées = Somme(Débits réels + Frais du mois)

Progression_Mois_Pct (Curseur Seuil) = (Jour_Actuel_Du_Mois / Nombre_Total_Jours_Dans_Mois) * 100
Consommation_Budget_Pct (Barre) = (Dépenses_Cumulées / Budget_Total_Mois) * 100

Ecart_Cadence = Consommation_Budget_Pct - Progression_Mois_Pct
- Si Ecart_Cadence <= 0 : Zone Verte (Avance financière, rythme de dépense sain)
- Si Ecart_Cadence > 0  : Zone Rouge (Surconsommation par rapport à la date, risque de découvert)
```

### 8.3 Algorithme de Réconciliation & Fusion Anti-Doublon (SMS / Ticket de Caisse)
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

### 8.4 Algorithme d'Auto-Catégorisation des SMS en 3 Niveaux
```
Fonction resoudreCategorie(SMS_Data) :
  // Niveau 1 : Mémoire des contacts
  Si SMS_Data.recipientOrSender existe :
     Mapping = Trouver dans RecipientMapping par phoneNumber == SMS_Data.recipientOrSender
     Si Mapping trouvé : Retourner Mapping.categoryId

  // Niveau 2 : Détection par type d'opération
  Si SMS_Data.operationType == 'TOPUP_AIRTIME' : Retourner Categorie_Telecom.id
  Si SMS_Data.operationType == 'WITHDRAWAL_CASH' : Retourner Categorie_Retrait_Cash.id
  Si SMS_Data.operationType == 'BILL_PAYMENT' : Retourner Categorie_Charges_Fixes.id
  Si SMS_Data.operationType == 'SALARY' : Retourner Categorie_Revenus.id

  // Niveau 3 : Tiers inconnu
  Retourner Categorie_Imprevus.id (avec déclenchement du sélecteur 1-tap)
```

## 9. Structure du Répertoire Projet

```
finance-app/
├── app/                                    # Routes de l'application (Expo Router)
│   ├── _layout.tsx                         # Root Layout (Providers Zustand, HeroUI Native, SQLite init)
│   ├── (tabs)/                             # Navigation principale par onglets inférieurs
│   │   ├── _layout.tsx                     # Configuration de la barre d'onglets flottante
│   │   ├── index.tsx                       # Écran Dashboard (Soldes, Reste à vivre, Cadence)
│   │   ├── transactions.tsx                # Écran Historique chronologique avec filtres
│   │   ├── budgets.tsx                     # Écran Enveloppes de dépenses & Objectif Épargne
│   │   └── assistant.tsx                   # Écran AI Assistant (Chat agentique & Vocal)
│   ├── (modals)/                           # Écrans modaux (Présentation FormSheet iOS)
│   │   ├── quick-add.tsx                   # Saisie flash manuelle (< 3s) & micro vocal
│   │   └── scan-receipt.tsx                # Caméra / OCR pour tickets de supermarché SCORE
│   └── transaction/
│       └── [id].tsx                        # Fiche détaillée (Articles scannés, Lieu, Frais)
│
├── src/
│   ├── ai/                                 # Moteur IA (100% Gemini 3.1 Flash Lite)
│   │   ├── client.ts                       # Client API Google Gemini 3.1 Flash Lite
│   │   ├── agentHarness.ts                 # Injection du contexte financier (Soldes, Budgets, Date)
│   │   ├── tools.ts                        # Définitions des outils Tool Calling SQLite
│   │   ├── sttPrompt.ts                    # Prompt système transcription verbatim (STT)
│   │   └── visionPrompt.ts                 # Prompt extraction structurée tickets SCORE
│   │
│   ├── db/                                 # Couche Base de Données Locale (expo-sqlite)
│   │   ├── database.ts                     # Initialisation & migrations SQLite
│   │   ├── schema.ts                       # Définitions des tables DDL avec UUID v4 immuables
│   │   └── repositories/                   # Requêtes SQL relationnelles
│   │       ├── walletRepository.ts         # Gestion des soldes (MVola, Cash, Airtel, Bank)
│   │       ├── transactionRepository.ts    # CRUD transactions, items et localisation
│   │       ├── categoryRepository.ts       # Gestion catégories et enveloppes de budget
│   │       └── recipientRepository.ts      # Mémoire des numéros tiers (Mapping catégorie)
│   │
│   ├── stores/                             # Gestion d'État Réactive (Zustand)
│   │   ├── useWalletStore.ts               # État des soldes et calcul du solde réel total
│   │   ├── useTransactionStore.ts          # Liste des transactions, filtres et pending SMS
│   │   ├── useBudgetStore.ts               # Plafonds, jauge d'épargne et reste à vivre journalier
│   │   └── useAiAssistantStore.ts          # Historique du chat, statut d'enregistrement vocal
│   │
│   ├── services/                           # Logique Métier & Moteurs de Calcul
│   │   ├── smsParser.ts                    # Détection regex SMS (MVola, Airtel, Telma)
│   │   ├── categoryResolution.ts           # Moteur d'auto-catégorisation en 3 niveaux
│   │   ├── receiptReconciliation.ts        # Moteur anti-doublon et fusion SMS / Tickets
│   │   ├── mvolaFeeCalculator.ts           # Grille tarifaire officielle des frais MVola
│   │   ├── burnRateCalculator.ts           # Moteur du reste à vivre et cadence budgétaire
│   │   ├── notificationService.ts          # Notifications push locales Android
│   │   └── updateService.ts                # Gestion des mises à jour OTA à chaud (EAS Update)
│   │
│   ├── components/                         # Composants UI Réutilisables
│   │   ├── cards/
│   │   │   ├── WalletBalanceCard.tsx       # Carte triptyque Solde Réel (MVola vs Espèces)
│   │   │   ├── DailyBurnCard.tsx           # Carte d'affichage du reste à vivre journalier
│   │   │   └── SavingsTargetCard.tsx       # Jauge de progression de l'épargne sanctuarisée
│   │   ├── charts/
│   │   │   ├── CadenceProgressBar.tsx      # Jauge avec marqueur de seuil temporel Jour J (`|`)
│   │   │   └── SpendingGradientChart.tsx   # Courbe Victory Native XL + Shopify Skia avec dégradé
│   │   ├── transactions/
│   │   │   ├── TransactionRow.tsx          # Ligne de transaction avec badge `🧾 N` et icône
│   │   │   ├── TransactionItemRow.tsx      # Rangée d'article individuel (quantité, prix)
│   │   │   └── LocationBadge.tsx           # Badge du lieu / commerce (`📍`)
│   │   ├── feedback/
│   │   │   ├── SmsToastBanner.tsx          # Toast animé in-app avec sélecteur de catégorie 1-tap
│   │   │   └── UpdateBanner.tsx            # Bannière de rechargement à chaud (EAS Update)
│   │   └── voice/
│   │       └── VoiceRecordButton.tsx       # Bouton micro pulsant avec retours haptiques
│   │
│   ├── types/                              # Définitions TypeScript Globales
│   │   ├── models.ts                       # Interfaces Wallet, Transaction, Category, Item
│   │   ├── sms.ts                          # Types des événements SMS parsés
│   │   └── ai.ts                           # Types des requêtes et outils Tool Calling
│   │
│   └── styles/
│       └── global.css                      # Thème Tailwind CSS v4 & configuration HeroUI Native
│
├── assets/                                 # Icônes, polices et assets graphiques
├── app.json                                # Configuration Expo & Permissions Android SMS/Audio
├── eas.json                                # Profils de build APK et canaux EAS Update
├── package.json                            # Dépendances du projet
├── tailwind.config.js                      # Configuration NativeWind / Tailwind
├── tsconfig.json                           # Configuration TypeScript stricte
├── SPECIFICATION.md                        # Document de spécification exhaustif de référence
└── README.md                               # Point d'entrée de documentation
```

## 10. Feuille de Route & Jalons d'Implémentation (Milestones)

### Milestone 1 : Fondations & Moteur Local (MVP Core)
- **Objectif** : Disposer d'une application fonctionnelle localement pour enregistrer des transactions et suivre ses soldes.
- **Livrables** :
  1. Initialisation du projet Expo avec TypeScript, Expo Router, HeroUI Native, Zustand et SQLite (`expo-sqlite`).
  2. Tables de base de données relationnelle (`wallets`, `categories`, `transactions`, `recipients`) avec identifiants UUID v4 immuables.
  3. Formulaire de saisie manuelle flash (< 3 secondes) avec sélection en 1 tap et calculateur automatique des frais MVola.
  4. Liste des transactions groupées par jour avec badge d'icône hérité de la catégorie.

### Milestone 2 : Capture Automatique des SMS Android & Auto-Catégorisation
- **Objectif** : Éliminer la friction de saisie pour l'ensemble des opérations Mobile Money.
- **Livrables** :
  1. Configuration du plugin natif Android SMS Receiver (`RECEIVE_SMS` / `READ_SMS`).
  2. Parseur Regex MVola / Airtel (Débits, Crédits, Salaires, Retraits Cash Point, Achats de forfaits, Factures).
  3. Moteur d'auto-catégorisation en 3 niveaux (Mémoire des contacts `RecipientMapping`, Opérations explicites, Fallback Imprévus).
  4. Bannière toast interactive in-app (`SmsToastBanner`) avec sélecteur 1-tap de catégorie et notifications push locales.
  5. Calibrage automatique de la source de vérité du solde MVola depuis les mentions `"Solde restant: X Ar"`.

### Milestone 3 : Moteur IA Multimodal 100% Gemini (Vocal, Vision & AI Assistant)
- **Objectif** : Transformer la voix et les photos de reçus en transactions précises avec gestion anti-doublon.
- **Livrables** :
  1. Client API unique pour Google Gemini 3.1 Flash Lite.
  2. Pipeline Vocal : Enregistrement micro (`expo-av`) -> Prompt STT verbatim (`sttPrompt.ts`) -> Tool Calling SQLite.
  3. Scanner de tickets (Supermarché SCORE) : extraction multimodale du marchand, du lieu, du total et de la liste des articles (`TransactionItem`).
  4. Moteur de réconciliation et fusion anti-doublon (`receiptReconciliation.ts`) reliant le scan d'un ticket au débit SMS existant.
  5. AI Assistant agentique (`app/(tabs)/assistant.tsx`) avec injection du contexte financier dynamique et exécution d'outils en temps réel.

### Milestone 4 : Dashboard de Pilotage, Cadence Budgétaire & Épargne
- **Objectif** : Offrir une visibilité immédiate sur le reste à vivre et piloter l'épargne sanctuarisée pour sortir du rouge.
- **Livrables** :
  1. Carte des 3 Totaux majeurs (Solde Réel Disponible, Budget Restant, Total Dépensé).
  2. Calculateur dynamique du **Reste à Vivre Journalier** (`burnRateCalculator.ts`).
  3. **Barre de Cadence Budgétaire avec Seuil Jour J** (`CadenceProgressBar.tsx`) avec repérage visuel avance (vert) / surconsommation (rouge).
  4. Module d'Épargne intégré dans l'écran Budget ("Se payer en premier") déduisant immédiatement l'objectif du reste à vivre.
  5. Graphique de dépenses dégradé Victory Native XL + Shopify Skia et rapport des frais invisibles.

### Milestone 5 : Déploiement APK & Mises à Jour OTA à Chaud (EAS Update)
- **Objectif** : Déployer l'application sur smartphone Android physique et valider le cycle de mise à jour instantanée sans réinstallation.
- **Livrables** :
  1. Configuration des profils de build dans `eas.json` et génération de l'APK Android initial.
  2. Intégration de `expo-updates` et du composant `UpdateBanner.tsx` pour rechargement à chaud en 1 seconde.
  3. Validation des tests en conditions réelles (marché, transferts MVola réels, scan de tickets SCORE).

## 11. Journal des Évolutions (Changelog)

| Version | Date | Description des Modifications |
| :--- | :--- | :--- |
| **1.0.0** | 21/08/2026 | Création initiale de la spécification complète. |
| **1.1.0** | 21/08/2026 | Retrait du moteur de gamification (streaks). Ajout de la gestion explicite des soldes par portefeuille (MVola, Airtel, Cash, Banque) aux côtés du budget et des dépenses (Triptyque Fondamental). Intégration d'un module de statistiques claires (trajectoire, répartition des dépenses, rapport des frais). |
| **1.2.0** | 21/08/2026 | Intégration du système de mises à jour Over-The-Air (OTA) à chaud via EAS Update (`expo-updates`). Ajout du composant `UpdateBanner`, du service `updateService.ts`, du workflow d'itération rapide sans réinstallation d'APK et de la configuration `eas.json`. |
| **1.3.0** | 21/08/2026 | Unification du modèle Catégories / Budgets (1 élément de budget = 1 catégorie de dépense). Implémentation de l'héritage d'icône intelligent. Intégration du module d'épargne dans la section Budget ("Se payer en premier") avec déduction sur le reste à vivre. Formalisation de la barre de cadence budgétaire avec marqueur de seuil Jour J (`|`). |
| **1.4.0** | 21/08/2026 | Unification de la couche IA sur **Google Gemini 3.1 Flash Lite** comme unique modèle (Chat, Vision, Synthèse). Intégration du hack Speech-to-Text par prompt système verbatim (suppression de Groq Whisper et simplification à une seule clé API). |
| **1.5.0** | 21/08/2026 | Clés primaires UUID v4 immuables pour les catégories et transactions. Ajout du modèle des articles détaillés (`TransactionItem`) avec badge `🧾 N` et panneau de détails (style Zen/Cache). Ajout du traçage de la localisation (`TransactionLocation`). Implémentation du moteur de réconciliation et fusion anti-doublon (SMS + Scan de tickets de caisse). |
| **1.6.0** | 21/08/2026 | Intégration du moteur d'auto-catégorisation des SMS en 3 niveaux (Niveau 1: Mémoire apprenante des contacts `RecipientMapping`, Niveau 2: Détection par opération explicite, Niveau 3: Fallback Imprévus + Sélecteur 1-tap push/toast). Ajout du repository `recipientMappingRepository` et du service `categoryResolution`. |
| **1.7.0** | 21/08/2026 | Ajout de la section 10 : Feuille de route & Jalons d'implémentation (Milestones 1 à 5) pour structurer le développement et la validation itérative. |
| **1.8.0** | 21/08/2026 | Suppression complète des mentions d'identité visuelle / branding dans la spécification pour conserver un document 100% technique, fonctionnel et architectural. |
| **1.9.0** | 21/08/2026 | Standardisation de la terminologie IA en **Tool Calling** (au lieu de Function Calling). Renommage du module en **AI Assistant** (`app/(tabs)/assistant.tsx`, `useAiAssistantStore.ts`). Mise à jour de la structure du projet avec **Expo Router**, **HeroUI Native**, **Zustand**, et **Victory Native XL / Shopify Skia**. |








