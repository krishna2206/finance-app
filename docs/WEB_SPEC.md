# Spécification Technique & UI/UX : Frontend Web App PWA (`web/`)

Ce document définit l'architecture, les choix technologiques, le design system et la structure détaillée de l'application Web PWA, avec une parité visuelle et fonctionnelle totale avec le client mobile.

## 1. Description & Vision du Client Web

L'application Web PWA constitue l'interface utilisateur interactive principale. Elle adopte les standards de design d'Apple (style Apple Wallet, Inset Grouped Cards, Linear, Raycast) avec un thème clair feutré, une typographie monétaire tabulaire et une disposition ergonomique pensée pour une utilisation rapide à une main :
- **Uniformité UI/UX Totale** : Même identité visuelle, mêmes composants, mêmes interactions tactiles et même disposition sur Web et sur Mobile.
- **Format Mobile Portrait Strict** : Contrainte de largeur maximale (`max-w-[430px]`) centrée à l'écran pour une ergonomie mobile native sur toutes les résolutions.
- **1 Statistique = 1 Carte Dédiée** : Chaque KPI financier dispose de sa propre carte autonome pour une lisibilité et un scan visuel instantanés.
- **Cartes Inset Grouped Style Apple (ListGroup / Cell Group)** : Les boutons d'actions liés, les filtres et les sélecteurs sont regroupés au sein de conteneurs arrondis feutrés avec séparateurs subtils de 1px.
- **Navigation Flottante Découplée** : Barre d'onglets flottante en verre dépoli ancrée en bas à gauche et pile d'actions rapides ancrée en bas à droite, avec masque de flou dégradé progressif (`mask-image`).
- **Saisie Flash Révolutionnée (`QuickAddBottomSheet`)** : Double mode Dépense / Retrait, montant Hero sans encadré avec curseur pulsé (Breathing Pill) et calcul de frais avec animation de dépliage vertical.
- **Onboarding Guidé en 3 Étapes** : Parcours d'initialisation du profil, des portefeuilles réels de départ et des objectifs financiers.
- **Feuilles Glissantes (Bottom Sheets)** : Remplacement de toutes les fenêtres modales classiques par des Bottom Sheets fluides et refermables d'un glissement vers le bas.

## 2. Architecture Système & Interactions

```
+------------------------------------------------------------------------------------------------+
|                             ARCHITECTURE CLIENT WEB PWA (web/)                                 |
|                                                                                                |
|  [ UTILISATEUR & GESTES ]                                                                      |
|  - Clic onglets, Scroll listes, Hold-to-record micro, Drag & drop tickets                      |
|                                     |                                                          |
|                                     v                                                          |
|  +------------------------------------------------------------------------------------------+  |
|  |                             COUCHE INTERFACE & COMPOSANTS                                |  |
|  |  - Flux d'Onboarding (OnboardingView : Profil -> Portefeuilles -> Cibles)                 |  |
|  |  - Layout Principal (Floating Tab Bar gauche + Floating Action Stack droite)             |  |
|  |  - Cartes Statistiques Dédiées (Solde Dynamique, Reste à Vivre, Cadence, Épargne, Frais)  |  |
|  |  - Conteneurs Inset Grouped Cards (Boutons d'action, sélecteurs, filtres avec icônes)     |  |
|  |  - Bottom Sheets Flottants (QuickAdd, SavingsAction, TransactionDetail, BudgetEdit)       |  |
|  |  - Feedback Visuel (SmsToastBanner animé Framer Motion, indicateurs de synchronisation)  |  |
|  +----------------------------------------------+-------------------------------------------+  |
|                                                 |                                              |
|                                                 v                                              |
|  +------------------------------------------------------------------------------------------+  |
|  |                                  GESTION D'ÉTAT (Zustand v5)                             |  |
|  |  - useSettingsStore (Profil, Onboarding)       - useWalletStore (Portefeuilles dyn.)     |  |
|  |  - useBudgetStore (Plafonds & Épargne)         - useTransactionStore (Historique & tri)  |  |
|  |  - useAiAssistantStore (Chat & Enregistreur)                                             |  |
|  +-----------------------+----------------------+--------------------+----------------------+  |
|                          |                      |                    |                         |
|                          v                      v                    v                         |
|               [ Web Audio API ]      [ HTML5 File & Camera ]  [ Client SSE & HTTP ]            |
|               (Microphone hold)      (Scan Reçu & OCR)        (EventSource + Fetch)            |
+--------------------------+----------------------+--------------------+-------------------------+
                           |                      |                    |
                           |                      |                    |  Requêtes REST & Flux SSE
                           v                      v                    v
+------------------------------------------------------------------------------------------------+
|                                    BACKEND API (backend/)                                      |
|  - Endpoints REST : `/api/settings`, `/api/wallets`, `/api/budgets`, `/api/transactions`       |
|  - Streaming SSE : `GET /api/events` (Transmission instantanée des SMS vers SmsToastBanner)    |
|  - Base de Données : SQLite locale (`finance.db`)                                              |
+------------------------------------------------------------------------------------------------+
```

## 3. Choix Technologiques & Justifications

| Composant | Technologie Choisie | Rôle & Justification Technique |
| :--- | :--- | :--- |
| **Bundler & Dev Server** | **Vite 6** | Démarrage en moins de 100 ms, Hot Module Replacement (HMR) < 20 ms, zéro blocage de compilation. |
| **Framework UI** | **React 19 + TypeScript** | Standard moderne, performance maximale et typage strict des modèles de données. |
| **Bibliothèque UI** | **HeroUI (`@heroui/react`)** | Composants accessibles, légers et optimisés (Cards, Buttons, Modals, Progress). |
| **Pack d'Icônes** | **Heroicons (`@heroicons/react`)** | Icônes vectorielles SVG épurées (Outline et Solid). |
| **Moteur de Styling** | **Tailwind CSS v4** | Configuration de classes standard, chiffres tabulaires (`tabular-nums`), zéro style custom obsolète. |
| **Moteur d'Animation** | **Framer Motion** | Transitions de vues directionnelles, physique de ressorts naturelle (`stiffness: 380`, `damping: 32`) et GPU Compositing. |
| **Gestion d'État** | **Zustand v5** | Gestion d'état locale ultra-légère (< 1 Ko) en mémoire, sans re-renders superflus. |
| **Entrée Vocale** | **Web Audio API (`MediaRecorder`)** | Capture du microphone dans le navigateur pour la transcription Gemini sans plugin natif. |
| **Scan de Reçus** | **HTML5 File & Camera API** | Prise de photo ou drag & drop de tickets de caisse avec compression locale. |
| **Temps Réel** | **Server-Sent Events (`EventSource`)** | Réception instantanée des alertes SMS poussées par le backend. |
| **PWA & Offline** | **Service Worker & Manifest** | Installation plein écran et notifications d'arrière-plan. |

## 4. Disposition de l'Interface & Système de Cartes Dédiées

```
+-----------------------------------------------------------------------------------+
|                        ÉCRAN D'ACCUEIL / DASHBOARD                                |
|                                                                                   |
|  [ EN-TÊTE ] : Identité de l'utilisateur, localisation et rafraîchissement        |
|                                                                                   |
|  [ GRILLE DE STATISTIQUES ]                                                       |
|  - [ CARTE SOLDE TOTAL DYNAMIQUE (1 tuile) ] : Solde Total + Liste des comptes    |
|                                                                                   |
|  [ SECTION TRANSACTIONS RÉCENTES (Regroupées par Date : Aujourd'hui, Hier...) ]   |
|  +-----------------------------------------------------------------------------+  |
|  | [🛍️ 2] Marché Anosibe - Fruits & Légumes ........................ -18 000 Ar |  |
|  | Achat Forfait Telma Net One .................................... -10 000 Ar |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  [ MASQUE DE FLOU PROGRESSIF DÉGRADÉ (mask-image) ]                               |
|  ===============================================================================  |
|  [ BARRE DE NAVIGATION FLOTTANTE & BOUTON D'ACTION ]                              |
|  +-------------------------------------+            +---------------------------+ |
|  | [🏠]   [🧾]   [📊]                  |            |            (+)            | |
|  | Accueil Historique Budgets          |            |      [NOUVELLE ACTION]    | |
|  +-------------------------------------+            +---------------------------+ |
|       (Tab Bar Flottante Gauche)                     (Bouton d'Action Principal)  |
+-----------------------------------------------------------------------------------+
```

## 5. Système de Bottom Sheets (Framer Motion)

1. **`QuickAddBottomSheet`** : Formulaire à double mode (Dépense ↗ / Retrait ↙), montant Hero sans encadré, curseur breathing pill et frais MVola avec dépliage vertical.
2. **`SavingsActionBottomSheet`** : Versement vers l'épargne ou déblocage vers compte courant avec sélection dynamique des portefeuilles et prévisualisation de solde.
3. **`TransactionDetailBottomSheet`** : Fiche détaillée sans boîte pour le montant, icônes colorées par contexte, accordéon d'articles et suppression.
4. **`BudgetEditBottomSheet`** : Modification rapide du plafond d'une catégorie.
5. **`AddWalletBottomSheet`** : Ajout dynamique d'un nouveau portefeuille à tout moment.

## 6. Structure Détaillée du Répertoire `web/`

```
web/
├── index.html                              # Point d'entrée HTML avec meta tags PWA
├── vite.config.ts                          # Configuration Vite 6 + Tailwind v4 + Proxy API
├── package.json                            # Dépendances React 19, HeroUI, Heroicons, Framer Motion, Zustand
├── tsconfig.json                           # Configuration TypeScript
│
└── src/
    ├── main.tsx                            # Point d'entrée React
    ├── App.tsx                             # Layout principal avec condition Onboarding
    │
    ├── styles/
    │   └── global.css                      # Thème Tailwind CSS v4, gouttière stable, scrollbar masquée
    │
    ├── types/                              # Types TypeScript partagés
    │   ├── models.ts                       # Wallet, Transaction, Category, Item, Settings
    │   ├── sms.ts                          # Événements SMS parsés
    │   └── ai.ts                           # Messages chat et scan de ticket
    │
    ├── stores/                             # Stores Zustand réactifs
    │   ├── useSettingsStore.ts             # Profil, Localisation, Statut Onboarding
    │   ├── useWalletStore.ts               # Portefeuilles dynamiques et soldes
    │   ├── useTransactionStore.ts          # Transactions, filtres et pending SMS
    │   ├── useBudgetStore.ts               # Enveloppes budgétaires et reste à vivre
    │   └── useAiAssistantStore.ts          # Historique et état IA
    │
    ├── utils/
    │   └── formatters.ts                   # Formatage monétaire (formatCurrency) et libellés temporels
    │
    ├── services/                           # Client HTTP et flux SSE
    │   ├── api.ts                          # Client fetch typé vers le backend (/api/*)
    │   └── sseClient.ts                    # Écouteur Server-Sent Events temps réel
    │
    └── components/
        ├── onboarding/
        │   └── OnboardingView.tsx          # Parcours d'onboarding en 3 étapes
        ├── layout/
        │   ├── FloatingTabBar.tsx          # Barre d'onglets flottante avec layoutId spring pill
        │   └── FloatingActionStack.tsx     # Bouton d'action principal (+)
        ├── cards/
        │   ├── WalletBalanceCard.tsx       # Carte Dédiée : Solde Total et liste dynamique des comptes
        │   ├── DailyBurnCard.tsx           # Carte Dédiée : Reste à Vivre Journalier
        │   ├── SavingsTargetCard.tsx       # Carte Dédiée : Coffre Épargne avec boutons Verser / Débloquer
        │   └── MonthlyFeesCard.tsx         # Carte Dédiée : Compteur des frais
        ├── charts/
        │   └── CadenceProgressBar.tsx      # Jauge de cadence budgétaire
        ├── common/
        │   └── InsetGroupedCard.tsx        # Conteneur Inset Grouped style Apple
        ├── transactions/
        │   ├── TransactionRow.tsx          # Ligne de transaction avec icône et badge panier épuré
        │   ├── TransactionItemRow.tsx      # Rangée d'article individuel
        │   └── LocationBadge.tsx           # Badge du lieu / quartier (`📍`)
        ├── sheets/
        │   ├── QuickAddBottomSheet.tsx     # Saisie flash (Dépense / Retrait)
        │   ├── SavingsActionBottomSheet.tsx# Versement / Déblocage d'épargne
        │   ├── TransactionDetailBottomSheet.tsx # Détail de transaction épuré
        │   ├── BudgetEditBottomSheet.tsx   # Édition des plafonds budgétaires
        │   └── AddWalletBottomSheet.tsx    # Ajout d'un nouveau portefeuille
        └── views/
            ├── DashboardView.tsx           # Vue d'Accueil avec transactions regroupées par date
            ├── TransactionsView.tsx        # Vue Historique avec onglets et icônes directionnelles
            └── BudgetsView.tsx             # Vue Enveloppes Budgétaires et Épargne
```
