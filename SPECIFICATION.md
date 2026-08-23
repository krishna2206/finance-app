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

## 6. Architecture Web App PWA (Vite + React 19 + Tailwind v4)

```
+-----------------------------------------------------------------------------------+
|                        APPLICATION WEB PWA (Vite + React 19)                      |
|                                                                                   |
|  - Framework UI        : React 19 + TypeScript + Tailwind CSS v4                  |
|  - Animations & Ressorts: Framer Motion (Physique iOS, transitions feutrées)      |
|  - Graphiques Dégradés : Recharts / SVG interactif avec gradients estompés        |
|  - Gestion d'État      : Zustand v5 (Stores réactifs ultra-légers)                |
|  - Persistance Locale  : IndexedDB (Dexie.js / LocalStorage) pour mode offline   |
|  - Audio & Voix        : Web Audio API / MediaRecorder -> Gemini 3.1 Flash Lite   |
|  - Vision / Scan Reçus : HTML5 File / Camera Capture -> Gemini 3.1 Flash Lite     |
|  - Temps Réel SSE      : EventSource connecté sur `GET /api/events` (Toast instant)|
|  - Notifications Push  : Service Worker (Web Push API + actions directes)         |
+-----------------------------------------------------------------------------------+
```

### Caractéristiques de la Web App PWA
- **Installable en 1 Clic** : Installable sur l'écran d'accueil du smartphone (iOS/Android) et sur macOS/Windows via le `manifest.json` (mode standalone plein écran, zéro barre d'URL).
- **Zéro Latence de Saisie** : Toutes les écritures sont enregistrées instantanément en local et synchronisées avec le backend.
- **Réception SSE en Direct** : Dès qu'un SMS MVola est reçu par le backend, un événement SSE réveille l'écran et fait descendre le toast animé avec les boutons de catégorisation 1-tap.
- **Service Worker pour Push d'Arrière-Plan** : Même si le navigateur est fermé ou l'application réduite, le Service Worker intercepte les pushs et affiche les alertes de dépenses sur l'écran de verrouillage.

## 7. Architecture Backend API, SSE & Web Push (Hono / Bun)

```
+-----------------------------------------------------------------------------------+
|                          BACKEND API (Hono / Bun + SQLite)                        |
|                                                                                   |
|  - Framework Serveur   : Hono (TypeScript, ultra-léger, < 1ms d'overhead)         |
|  - Runtime & BDD       : Bun + bun:sqlite (Performances maximales, transactions)  |
|  - Base de Données     : SQLite locale (`finance.db`) avec UUID v4 immuables      |
|                                                                                   |
|  [ ENDPOINTS CLÉS ]                                                               |
|  - `POST /api/sms/webhook` : Point d'entrée pour la passerelle SMS (MacroDroid/Tasker)
|  - `GET  /api/events`      : Flux Server-Sent Events (SSE) temps réel             |
|  - `POST /api/push/subscribe` : Enregistrement des souscriptions Web Push VAPID  |
|  - `GET/POST /api/transactions` : Synchronisation et CRUD transactions            |
|  - `GET/POST /api/wallets`      : Gestion des soldes (MVola, Cash, Banque)        |
|  - `GET/POST /api/budgets`      : Enveloppes budgétaires et objectif épargne      |
|  - `POST /api/ai/chat`          : Agent Gemini 3.1 Flash Lite avec Tool Calling   |
+-----------------------------------------------------------------------------------+
```

### Mécanique de la Passerelle SMS & Push
1. **Interception Mobile** : Une règle simple sur le smartphone (via MacroDroid ou Tasker) écoute les SMS de `MVOLA` / `TELMA` et effectue un `POST` HTTP vers `/api/sms/webhook` avec le texte du message.
2. **Traitement Backend Instantané** :
   - Le backend exécute le parseur regex (`smsParser.ts`) et le moteur d'auto-catégorisation en 3 niveaux (`categoryResolution.ts`).
   - Il insère la transaction et met à jour le solde dans la base SQLite locale.
3. **Diffusion Double-Canal** :
   - **Canal 1 (Écran Actif)** : Émission d'un événement SSE vers la Web App PWA ouverte pour déclencher le toast in-app.
   - **Canal 2 (App Réduite / Écran Éteint)** : Envoi d'une notification Web Push chiffrée (VAPID) réveillant le Service Worker sur le téléphone.

## 8. Choix Technologiques & Justifications

```
+-----------------------------------------------------------------------------------+
|               ARCHITECTURE DU MONOREPO (mobile/ · web/ · backend/)                |
|                                                                                   |
|  [ 1. FRONTEND WEB PWA : web/ ]                                                   |
|  - Vite + React 19 + Tailwind CSS v4 + Framer Motion                              |
|  - Recharts / Custom SVG Gradients pour graphiques de cadence                     |
|  - Zustand v5 + Client SSE + Web Audio API                                        |
|                                                                                   |
|  [ 2. BACKEND API : backend/ ]                                                    |
|  - Hono sur runtime Bun + SQLite natif (`bun:sqlite`)                             |
|  - Webhook SMS entrant, Flux SSE temps réel, Web Push (VAPID)                     |
|  - Orchestration de l'AI Assistant (Google Gemini 3.1 Flash Lite)                 |
|                                                                                   |
|  [ 3. APPLICATION MOBILE NATIVE : mobile/ ]                                       |
|  - React Native / Expo Router (Prêt pour build APK natif futur)                   |
+-----------------------------------------------------------------------------------+
```

### Justifications des Choix
- **PWA (Vite + React 19)** : Permet de tester et d'utiliser immédiatement l'application sans friction de compilation mobile, tout en conservant une interface soignée au pixel près.
- **Backend Hono + Bun** : Vitesse d'exécution maximale, démarrage à froid instantané (< 10 ms), et gestion native du streaming SSE sans dépendance lourde.
- **SQLite Unique (`bun:sqlite`)** : Source de vérité centrale pour synchroniser instantanément l'ordinateur et le smartphone.
- **Gemini 3.1 Flash Lite (Modèle Unique)** : Utilisé pour le Speech-to-Text verbatim, la Vision OCR des tickets de supermarché et le Tool Calling agentique.

## 9. Workflows Typiques Utilisateur

### 9.1 Workflow 1 : Réception d'un SMS MVola (Passerelle Webhook & Temps Réel)
1. Le smartphone reçoit un SMS de confirmation de transfert ou de retrait MVola.
2. L'application passerelle (MacroDroid) transmet le SMS au webhook `POST /api/sms/webhook`.
3. Le backend parse le SMS, résout la catégorie via la mémoire des contacts, et met à jour SQLite.
4. Le backend diffuse l'événement via SSE et envoie un Web Push.
5. Sur la PWA, la bannière toast animée descend immédiatement avec le montant et le sélecteur 1-tap.

### 9.2 Workflow 2 : Saisie Vocale en 3 Secondes (Web Audio + Gemini Flash Lite)
1. L'utilisateur clique sur le micro du dashboard dans son navigateur ou sa PWA.
2. La Web Audio API enregistre le flux audio et l'envoie au endpoint IA.
3. Gemini 3.1 Flash Lite transcrit le mémo mot à mot avec le prompt STT verbatim.
4. L'AI Assistant analyse la phrase et appelle l'outil `record_expense(amount: X, categoryId: Y, wallet: 'CASH')`.
5. La transaction est enregistrée en base et l'écran se met à jour immédiatement.

### 9.3 Workflow 3 : Capture de Reçu / Supermarché SCORE (Articles & Anti-Doublon)
1. L'utilisateur prend en photo un ticket de caisse depuis la PWA ou importe une image.
2. L'image est transmise à Gemini 3.1 Flash Lite pour extraction de la liste des articles et du total.
3. Le moteur de réconciliation vérifie si une transaction de même montant existe déjà aujourd'hui.
4. L'interface propose de fusionner les articles scannés avec la transaction existante sans doubler le débit.

### 9.4 Workflow 4 : Consultation du Reste à Vivre & Cadence Budgétaire
1. L'utilisateur ouvre le Dashboard sur mobile ou ordinateur.
2. Il consulte le Solde Réel Disponible, le Reste à Vivre Quotidien calculé en temps réel, et la Barre de Cadence Budgétaire avec son marqueur Jour J (`|`).
3. L'AI Assistant propose une synthèse concise des axes d'optimisation financière.

## 10. Formules & Règles de Calcul Métier

### 10.1 Calcul du Reste à Vivre Journalier
```
Jours_Restants = Nombre de jours entre aujourd'hui et le dernier jour du mois inclus
Solde_Disponible_Total = Somme(Soldes des portefeuilles avec isSpendable = true)
Epargne_Cible_Restante = Max(0, AppSettings.monthlySavingsTarget - Epargne_Securisee_Ce_Mois)
Charges_Fixes_Restantes = Somme des charges fixes non encore débitées dans le mois

Reste_Journalier = (Solde_Disponible_Total - Epargne_Cible_Restante - Charges_Fixes_Restantes) / Jours_Restants
```

### 10.2 Calcul de la Trajectoire & Cadence Budgétaire (Barre avec Seuil Jour J)
```
Budget_Total_Mois = Somme(Budgets des catégories de type 'EXPENSE')
Dépenses_Cumulées = Somme(Débits réels + Frais du mois)

Progression_Mois_Pct (Curseur Seuil) = (Jour_Actuel_Du_Mois / Nombre_Total_Jours_Dans_Mois) * 100
Consommation_Budget_Pct (Barre) = (Dépenses_Cumulées / Budget_Total_Mois) * 100

Ecart_Cadence = Consommation_Budget_Pct - Progression_Mois_Pct
- Si Ecart_Cadence <= 0 : Zone Verte (Avance financière, rythme de dépense sain)
- Si Ecart_Cadence > 0  : Zone Rouge (Surconsommation par rapport à la date, risque de découvert)
```

### 10.3 Algorithme de Réconciliation & Fusion Anti-Doublon (SMS / Ticket de Caisse)
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

### 10.4 Algorithme d'Auto-Catégorisation des SMS en 3 Niveaux
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

## 11. Structure Globale du Répertoire

```
finance-app/
├── SPECIFICATION.md                        # Document de référence exhaustif (ce fichier)
├── README.md                               # Point d'entrée de documentation
├── .gitignore                              # Configuration globale git
│
├── web/                                    # Frontend Web App PWA (Vite + React 19)
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/
│   │   ├── manifest.json                   # Configuration PWA Installable
│   │   ├── service-worker.js               # Service Worker (Web Push & Offline)
│   │   └── icons/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                         # Navigation & Layout principal
│       ├── styles/                         # Tailwind CSS v4 & variables de thème
│       ├── stores/                         # Stores Zustand (wallets, transactions, budgets, ai)
│       ├── services/                       # Client SSE, Web Push subscriber, API client
│       ├── components/                     # Composants UI (Cards, Charts, Modals, Voice, Toast)
│       └── types/                          # Types TypeScript
│
├── backend/                                # Backend API, SSE & Webhook (Hono / Bun)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                        # Serveur HTTP Hono + SSE broadcaster
│       ├── db/
│       │   ├── schema.ts                   # Tables SQLite avec UUID v4
│       │   ├── database.ts                 # Connexion native bun:sqlite
│       │   └── repositories/               # CRUD wallets, transactions, categories, recipients
│       ├── services/
│       │   ├── smsParser.ts                # Parseur regex MVola / Airtel
│       │   ├── categoryResolution.ts       # Moteur d'auto-catégorisation 3 niveaux
│       │   ├── receiptReconciliation.ts    # Fusion anti-doublon SMS/Tickets
│       │   ├── mvolaFeeCalculator.ts       # Grille tarifaire des frais
│       │   ├── burnRateCalculator.ts       # Calcul reste à vivre et cadence
│       │   └── pushNotificationService.ts  # Envoi des Web Push VAPID
│       ├── ai/
│       │   ├── client.ts                   # SDK Gemini 3.1 Flash Lite
│       │   ├── agentHarness.ts             # Contexte dynamique pour l'AI Assistant
│       │   └── tools.ts                    # Outils Tool Calling
│       └── routes/
│           ├── sms.ts                      # Webhook entrant + SSE stream
│           ├── transactions.ts             # CRUD transactions & enrichissement
│           ├── wallets.ts                  # Soldes
│           ├── budgets.ts                  # Budgets & épargne
│           └── ai.ts                       # Chat agentique & vocal
│
└── mobile/                                 # Application Mobile Native (React Native / Expo)
    ├── package.json
    ├── app.json
    ├── eas.json
    ├── app/                                # Routes Expo Router
    └── src/                                # Composants et logique mobile native
```

## 12. Feuille de Route d'Implémentation

### Phase 1 : Backend API & Webhook SMS (`backend/`)
- Setup serveur Hono sur runtime Bun avec base SQLite locale (`bun:sqlite`).
- Implémentation du webhook entrant `POST /api/sms/webhook` et du flux SSE `GET /api/events`.
- Intégration du parseur SMS MVola/Airtel et du moteur d'auto-catégorisation en 3 niveaux.

### Phase 2 : Frontend Web PWA (`web/`)
- Setup Vite + React 19 + Tailwind CSS v4 + Framer Motion.
- Dashboard interactif (Solde Réel, Reste à Vivre, Barre de Cadence Jour J `|`).
- Écouteur SSE en temps réel pour faire descendre le toast dès réception d'un SMS.
- Saisie Flash (< 3s) avec calculateur de frais MVola et modal de scan de tickets SCORE.

### Phase 3 : AI Assistant & Voix (Gemini 3.1 Flash Lite)
- Intégration de la Web Audio API pour enregistrer la voix directement dans le navigateur.
- Pipeline Gemini STT verbatim + Tool Calling pour manipuler SQLite via le chat.
- Scanner de tickets SCORE avec OCR multimodal et réconciliation anti-doublon.

### Phase 4 : PWA & Web Push Notifications
- Configuration du `manifest.json` pour installation plein écran sur mobile et desktop.
- Mise en place du Service Worker et de la passerelle Web Push VAPID pour alertes d'arrière-plan.

### Phase 5 : Passerelle Mobile Native (`mobile/`)
- Configuration de la passerelle Android légère (ou règle MacroDroid) pour router automatiquement les SMS reçus vers le webhook du backend.

## 13. Journal des Évolutions (Changelog)

| Version | Date | Description des Modifications |
| :--- | :--- | :--- |
| **1.0.0** | 21/08/2026 | Création initiale de la spécification complète. |
| **1.1.0** | 21/08/2026 | Retrait du moteur de gamification. Ajout de la gestion explicite des soldes par portefeuille (MVola, Airtel, Cash, Banque). |
| **1.2.0** | 21/08/2026 | Intégration du système de mises à jour OTA via EAS Update. |
| **1.3.0** | 21/08/2026 | Unification du modèle Catégories/Budgets, héritage d'icônes, module d'épargne sanctuarisée et barre de cadence avec seuil Jour J. |
| **1.4.0** | 21/08/2026 | Unification de la couche IA sur Google Gemini 3.1 Flash Lite avec hack Speech-to-Text verbatim. |
| **1.5.0** | 21/08/2026 | Clés primaires UUID v4, articles détaillés de tickets SCORE (`TransactionItem`) et moteur de réconciliation anti-doublon. |
| **1.6.0** | 21/08/2026 | Moteur d'auto-catégorisation des SMS en 3 niveaux (`RecipientMapping`, Opérations explicites, Fallback Imprévus). |
| **1.7.0** | 21/08/2026 | Ajout de la feuille de route structurée en jalons (Milestones). |
| **1.8.0** | 21/08/2026 | Suppression des mentions d'identité visuelle pour conserver une spécification 100% technique et fonctionnelle. |
| **1.9.0** | 21/08/2026 | Standardisation de la terminologie en **Tool Calling** et renommage en **AI Assistant**. |
| **2.0.0** | 21/08/2026 | **Pivot Architectural Majeur** : Restructuration en monorepo (`mobile/`, `web/`, `backend/`). Formalisation de la **Web App PWA** (Vite + React 19 + Tailwind v4 + Framer Motion) et du **Backend API** (Hono / Bun + SQLite + Webhook SMS + SSE temps réel + Web Push VAPID). |








