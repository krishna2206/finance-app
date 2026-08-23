# Spécification Technique & UI/UX : Frontend Web App PWA (`web/`)

Ce document définit l'architecture, les choix technologiques, le design system et la structure détaillée de l'application Web PWA, avec une parité visuelle et fonctionnelle totale avec le client mobile.

## 1. Description & Vision du Client Web

L'application Web PWA constitue l'interface utilisateur interactive principale. Elle adopte les standards de design d'Apple (style Apple Wallet, Inset Grouped Cards, Linear, Raycast) avec un thème sombre feutré, une typographie monétaire tabulaire et une disposition ergonomique pensée pour une utilisation rapide à une main :
- **Uniformité UI/UX Totale** : Même identité visuelle, mêmes composants, mêmes interactions tactiles et même disposition sur Web et sur Mobile.
- **1 Statistique = 1 Carte Dédiée** : Chaque KPI financier dispose de sa propre carte autonome pour une lisibilité et un scan visuel instantanés.
- **Cartes Inset Grouped Style Apple (ListGroup / Cell Group)** : Les boutons d'actions liés, les filtres et les sélecteurs sont regroupés au sein de conteneurs arrondis feutrés avec séparateurs subtils de 1px.
- **Navigation Flottante Découplée** : Barre d'onglets flottante ancrée en bas à gauche et pile d'actions rapides ancrée en bas à droite.
- **Micro Vocal Style Telegram** : Bouton d'enregistrement avec interaction "maintenir pour parler", onde sonore animée et transcription instantanée.
- **Galerie & Scan Style Telegram** : Bottom sheet ouvrant une grille visuelle avec la tuile Caméra en première position suivie des images récentes et de l'import PDF.
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
|  |  - Layout Principal (Floating Tab Bar gauche + Floating Action Stack droite)             |  |
|  |  - Cartes Statistiques Dédiées (Solde, Reste à Vivre, Cadence, Épargne, Frais)           |  |
|  |  - Conteneurs Inset Grouped Cards (Boutons d'action, sélecteurs, filtres)                 |  |
|  |  - Bottom Sheets Flottants (QuickAdd, AttachmentGallery, TransactionDetail, BudgetEdit)  |  |
|  |  - Feedback Visuel (SmsToastBanner animé Framer Motion, indicateurs de synchronisation)  |  |
|  +----------------------------------------------+-------------------------------------------+  |
|                                                 |                                              |
|                                                 v                                              |
|  +------------------------------------------------------------------------------------------+  |
|  |                                  GESTION D'ÉTAT (Zustand v5)                             |  |
|  |  - useWalletStore (Soldes et décomptes)        - useBudgetStore (Plafonds & Épargne)     |  |
|  |  - useTransactionStore (Liste & filtres)       - useAiAssistantStore (Chat & Enregistreur)| |
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
|  - Endpoints REST : `/api/wallets`, `/api/budgets`, `/api/transactions`, `/api/ai/*`           |
|  - Streaming SSE : `GET /api/events` (Transmission instantanée des SMS vers SmsToastBanner)    |
|  - Base de Données : SQLite locale (`finance.db`)                                              |
+------------------------------------------------------------------------------------------------+
```

## 3. Choix Technologiques & Justifications

| Composant | Technologie Choisie | Rôle & Justification Technique |
| :--- | :--- | :--- |
| **Bundler & Dev Server** | **Vite 6** | Démarrage en moins de 100 ms, Hot Module Replacement (HMR) < 20 ms, zéro blocage de compilation. |
| **Framework UI** | **React 19 + TypeScript** | Standard moderne, performance maximale et typage strict des modèles de données. |
| **Bibliothèque UI** | **HeroUI (`@heroui/react`)** | Composants accessibles, élégants et optimisés pour les thèmes sombres (Cards, Buttons, Modals, Progress). |
| **Pack d'Icônes** | **Heroicons (`@heroicons/react`)** | Icônes vectorielles SVG légères et homogènes (Outline et Solid). |
| **Moteur de Styling** | **Tailwind CSS v4** | Configuration directe de thème sombre (`#090A0C`), bordures subtiles (`border-white/5`), chiffres tabulaires (`tabular-nums`). |
| **Moteur d'Animation** | **Framer Motion** | Physique de ressorts naturelle (`stiffness: 300`, `damping: 24`) pour les Bottom Sheets et toasts. |
| **Graphiques** | **Recharts & Custom SVG** | Courbes de dépenses avec dégradés verticaux estompés (`#34D399` vers transparent) et curseur interactif. |
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
|  [ EN-TÊTE ] : Salutation, date et statut de synchronisation                      |
|                                                                                   |
|  [ CARTE 1 : SOLDE RÉEL DISPONIBLE ] (Card Dédiée)                                |
|  - Solde Total consolidé : 839 500 Ar                                             |
|  - Inset Grouped Row : [ MVola : 474 500 Ar ] [ Espèces : 365 000 Ar ]           |
|                                                                                   |
|  [ CARTE 2 : RESTE À VIVRE JOURNALIER ] (Card Dédiée)                             |
|  - Reste journalier : 14 500 Ar/j pour les 11 jours restants                      |
|  - Badge statut : +18% d'avance                                                   |
|                                                                                   |
|  [ CARTE 3 : BARRE DE CADENCE BUDGÉTAIRE ] (Card Dédiée)                          |
|  - [==========================              |                              ]      |
|    0%                        45%            66% (Jour 20/30)            100%      |
|                                                                                   |
|  [ CARTE 4 : OBJECTIF ÉPARGNE SANCTUARISÉE ] (Card Dédiée)                        |
|  - 100 000 / 150 000 Ar (66% sécurisé)                                            |
|                                                                                   |
|  [ CARTE 5 : COMPTEUR FRAIS MOBILES ] (Card Dédiée)                               |
|  - 5 500 Ar de frais de retrait/transfert ce mois                                 |
|                                                                                   |
|  [ SECTION RÉCENTES DÉPENSES (Inset Grouped Card) ]                               |
|  +-----------------------------------------------------------------------------+  |
|  | Supermarché SCORE - Digue ....................................... 48 500 Ar |  |
|  | Déjeuner Snack .................................................. 12 000 Ar |  |
|  | Abonnement Wifi ................................................ 100 000 Ar |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  ===============================================================================  |
|  [ DISPOSITION DU BAS (NAVIGATION & PILE D'ACTIONS FLOTTANTES) ]                  |
|                                                                                   |
|                                                     (2) [📷 Pièce Jointe / Reçu]  |
|                                                     (1) [🎙️ Micro Vocal (Hold)]   |
|  +-------------------------------------+            +---------------------------+ |
|  | [🏠]   [🧾]   [📊]   [✨]           |            |            (+)            | |
|  | Accueil Historique Budget Assistant |            |    [NOUVELLE DÉPENSE]     | |
|  +-------------------------------------+            +---------------------------+ |
|       (Tab Bar Flottante Gauche)                     (Bouton d'Action Principal)  |
+-----------------------------------------------------------------------------------+
```

### 4.1 Modèle Inset Grouped Cards (Style Apple HIG)
Les éléments d'action et les rangées d'information connexes sont rassemblés dans des conteneurs `Inset Grouped Cards` :
- **Conteneur** : `bg-zinc-900/80 rounded-3xl border border-white/5 overflow-hidden`.
- **Lignes Intérieures (Cells)** : Séparées par un liseré fin de 1px (`border-b border-white/5 last:border-b-0`).
- **Comportement Tactile** : Retour visuel opacifié (`active:bg-white/5`) et retours haptiques sur mobile.

### 4.2 La Tab Bar Flottante (Bas Gauche)
- Positionnée en bas à gauche avec fond semi-transparent flouté (`backdrop-blur-md bg-zinc-900/80 border border-white/10 rounded-full`).
- Contient les 4 onglets principaux :
  1. `[Accueil]` (Dashboard et KPI Cards).
  2. `[Historique]` (Grand livre chronologique en Inset Grouped List avec filtres).
  3. `[Budgets]` (Enveloppes budgétaires et jauge d'épargne sanctuarisée).
  4. `[Assistant IA]` (Discussion avec l'AI Assistant et Tool Calling).

### 4.3 La Pile d'Actions Flottantes (Bas Droite)
Ancrée sur le coin inférieur droit, la pile se compose de 3 boutons verticaux :

1. **Bouton Principal `(+)` (Bas)** :
   - Bouton rond émeraude (`w-14 h-14 bg-emerald-500 text-zinc-950 rounded-full shadow-xl shadow-emerald-500/20`).
   - Un simple tap ouvre le **Bottom Sheet de Saisie Flash Rapide** (< 3 secondes avec clavier numérique et calculateur de frais MVola).
2. **Bouton Micro Vocal `[🎙️]` (Au-dessus du `(+)`)** :
   - Bouton rond feutré (`w-12 h-12 bg-zinc-900 border border-white/10 rounded-full shadow-lg`).
   - **Interaction Style Telegram** : Maintenir le bouton enfoncé déclenche l'enregistrement audio avec onde sonore pulsante. Le relâchement envoie immédiatement l'audio pour transcription Gemini STT et enregistrement automatique de la dépense.
3. **Bouton Pièce Jointe / Scanner `[📷]` (Au-dessus du micro)** :
   - Bouton rond feutré (`w-12 h-12 bg-zinc-900 border border-white/10 rounded-full shadow-lg`).
   - Un tap ouvre le **Bottom Sheet Galerie Style Telegram** :
     - Première case : **Tuile Caméra active** pour photographier un ticket de caisse en direct.
     - Grille des photos et documents récents.
     - Bouton d'import direct de fichiers PDF ou images.

## 5. Système de Bottom Sheets (Framer Motion)

Toutes les interactions complexes s'ouvrent sous forme de feuilles glissantes depuis le bas de l'écran avec fond assombri (`backdrop-blur-sm bg-black/60`) :

1. **`QuickAddBottomSheet`** : Formulaire de saisie flash (Montant en gros chiffres, Inset Grouped Row pour la sélection du portefeuille Cash/MVola, calculateur de frais et sélection de catégorie).
2. **`AttachmentGalleryBottomSheet`** : Galerie d'images et caméra pour l'envoi de reçus SCORE et factures PDF.
3. **`TransactionDetailBottomSheet`** : Fiche détaillée de la transaction avec accordéon des articles scannés (`TransactionItemRow`), lieu (`📍`) et bouton de suppression.
4. **`BudgetEditBottomSheet`** : Modification rapide du plafond d'une catégorie.

## 6. Structure Détaillée du Répertoire `web/`

```
web/
├── index.html                              # Point d'entrée HTML avec meta tags PWA
├── vite.config.ts                          # Configuration Vite 6 + Tailwind v4 + Proxy API
├── package.json                            # Dépendances React 19, HeroUI, Heroicons, Framer Motion, Zustand
├── tsconfig.json                           # Configuration TypeScript
│
├── public/                                 # Configuration PWA et icônes
│   ├── manifest.json                       # Métadonnées PWA (Standalone, theme_color: #090A0C)
│   ├── service-worker.js                   # Service Worker pour push notifications et cache
│   └── icons/                              # Icônes PWA (192x192, 512x512)
│
└── src/
    ├── main.tsx                            # Point d'entrée React avec HeroUIProvider
    ├── App.tsx                             # Layout principal (Header, Content, Floating Tab Bar, Floating Action Stack)
    │
    ├── styles/
    │   └── global.css                      # Thème Tailwind CSS v4 (Obsidienne feutrée, variables CSS)
    │
    ├── types/                              # Types TypeScript partagés
    │   ├── models.ts                       # Wallet, Transaction, Category, Item, Location
    │   ├── sms.ts                          # Événements SMS parsés
    │   └── ai.ts                           # Messages chat et scan de ticket
    │
    ├── stores/                             # Stores Zustand réactifs
    │   ├── useWalletStore.ts               # Soldes des portefeuilles et solde réel total
    │   ├── useTransactionStore.ts          # Transactions, filtres et pending SMS
    │   ├── useBudgetStore.ts               # Enveloppes budgétaires et reste à vivre journalier
    │   └── useAiAssistantStore.ts          # Historique et état de transcription
    │
    ├── services/                           # Client HTTP, flux SSE et Web Audio API
    │   ├── api.ts                          # Client fetch typé vers le backend (/api/*)
    │   ├── sseClient.ts                    # Écouteur Server-Sent Events temps réel
    │   ├── audioRecorder.ts                # Capture Web Audio API (Hold to record)
    │   └── pushSubscription.ts             # Gestionnaire de souscription Web Push VAPID
    │
    └── components/
        ├── layout/
        │   ├── FloatingTabBar.tsx          # Barre d'onglets flottante en bas à gauche
        │   └── FloatingActionStack.tsx     # Pile des 3 boutons d'actions en bas à droite
        ├── cards/
        │   ├── WalletBalanceCard.tsx       # Carte Dédiée : Solde Réel (MVola vs Espèces)
        │   ├── DailyBurnCard.tsx           # Carte Dédiée : Reste à Vivre Journalier dynamique
        │   ├── SavingsTargetCard.tsx       # Carte Dédiée : Progression de l'épargne sanctuarisée
        │   └── MonthlyFeesCard.tsx         # Carte Dédiée : Compteur des frais Mobile Money
        ├── charts/
        │   ├── CadenceProgressBar.tsx      # Jauge avec marqueur temporel vertical Jour J (`|`)
        │   └── SpendingGradientChart.tsx   # Courbe Recharts avec dégradé émeraude estompé
        ├── common/
        │   └── InsetGroupedCard.tsx        # Conteneur Inset Grouped style Apple
        ├── transactions/
        │   ├── TransactionRow.tsx          # Ligne de transaction avec badge `🧾 N` et icône
        │   ├── TransactionItemRow.tsx      # Rangée d'article individuel (quantité, prix)
        │   └── LocationBadge.tsx           # Badge du lieu / quartier (`📍`)
        ├── sheets/
        │   ├── QuickAddBottomSheet.tsx     # Saisie flash manuelle (< 3s)
        │   ├── AttachmentGallerySheet.tsx  # Galerie style Telegram (Caméra, Photos, PDF)
        │   ├── TransactionDetailSheet.tsx  # Fiche détaillée avec accordéon d'articles
        │   └── BudgetEditBottomSheet.tsx   # Édition des plafonds budgétaires
        └── feedback/
            └── SmsToastBanner.tsx          # Toast animé Framer Motion avec sélecteur 1-tap
```
