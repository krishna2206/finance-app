# Spécification Technique & Mobile : Client Expo React Native (`mobile/`)

Ce document définit l'architecture, la configuration et le fonctionnement de l'application mobile native optionnelle (prête pour compilation APK Android).

## 1. Description & Rôle du Module Mobile

Le dossier `mobile/` héberge le client mobile natif sous **Expo (React Native + TypeScript)** :
- **Philosophie Local-First** : Fonctionne de manière 100% autonome hors-ligne avec `expo-sqlite`, et synchronise ses données vers le backend (self-hosted ou cloud).
- **Interception SMS Native H24** : Reçoit les SMS d'opérateurs en tâche de fond (`RECEIVE_SMS`) directement via le BroadcastReceiver Android sans nécessiter d'application tierce comme MacroDroid.
- **Parité Visuelle & UX Totale avec le Web** : Même design épuré, format mobile, cartes statistiques dédiées, conteneurs Inset Grouped style Apple et Bottom Sheets fluides.

## 2. Architecture Système & Interactions

```
+------------------------------------------------------------------------------------------------+
|                            ARCHITECTURE CLIENT MOBILE NATIVE (mobile/)                         |
|                                                                                                |
|  [ SYSTÈME D'EXPLOITATION ANDROID ]                                                            |
|  - Réception SMS réseau cellulaire (034 / MVOLA / AIRTEL)                                      |
|                                     |                                                          |
|                                     v Broadcast Event (RECEIVE_SMS)                            |
|  +------------------------------------------------------------------------------------------+  |
|  |                            COUCHE NATIVE & CAPTEURS                                      |  |
|  |  - Android BroadcastReceiver (Écouteur SMS en tâche de fond)                             |  |
|  |  - expo-audio (Enregistrement micro pour Gemini STT)                                     |  |
|  |  - expo-image-picker (Appareil photo pour tickets SCORE)                                 |  |
|  +----------------------------------------------+-------------------------------------------+  |
|                                                 |                                              |
|                                                 v                                              |
|  +------------------------------------------------------------------------------------------+  |
|  |                       INTERFACE UTILISATEUR UNIFIÉE (Expo Router v5)                     |  |
|  |  - Onboarding initial (Profil, Portefeuilles réels, Objectifs budgétaires)                 |  |
|  |  - Cartes Statistiques Dédiées (Solde Dynamique, Reste à Vivre, Cadence, Épargne, Frais)   |  |
|  |  - Inset Grouped Cards (Style Apple HIG pour les actions communes et listes)              |  |
|  |  - Floating Tab Bar & Floating Action Button (+)                                         |  |
|  |  - Bottom Sheets natifs (QuickAdd Dépense/Retrait, SavingsAction, TransactionDetail)      |  |
|  +----------------------------------------------+-------------------------------------------+  |
|                                                 |                                              |
|                                                 v                                              |
|  +------------------------------------------------------------------------------------------+  |
|  |                                  GESTION D'ÉTAT & PERSISTANCE                            |  |
|  |  - Stores Zustand (useSettingsStore, useWalletStore, useBudgetStore, useTransactionStore)  |  |
|  |  - Base relationnelle locale : `expo-sqlite` (finance.db avec UUID v4 immuables)         |  |
|  +----------------------------------------------+-------------------------------------------+  |
|                                                 |                                              |
|                                                 v Synchronisation REST / P2P                   |
|  +------------------------------------------------------------------------------------------+  |
|  |                        SERVEUR BACKEND (Self-Hosted ou Cloud)                            |  |
|  +------------------------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------------------------+
```

## 3. Choix Technologiques & Justifications

| Composant | Technologie Choisie | Rôle & Justification Technique |
| :--- | :--- | :--- |
| **Framework Mobile** | **Expo SDK 57** | Écosystème natif complet pour Android et iOS. |
| **Routage** | **Expo Router v5** | Navigation typée basée sur les fichiers et modales natives `formSheet`. |
| **Styling** | **NativeWind / Tailwind v4** | Utilisation des mêmes classes utilitaires Tailwind que le Web. |
| **Moteur Local** | **`expo-sqlite` v16** | Base de données locale relationnelle autonome et ultra-rapide. |
| **Audio** | **`expo-audio`** | Module natif Expo 57 pour l'enregistrement audio. |
| **Mises à Jour** | **EAS Update (`expo-updates`)** | Distribution des correctifs à chaud sur smartphone sans recompiler l'APK. |

## 4. Structure du Répertoire `mobile/`

```
mobile/
├── package.json                            # Dépendances Expo 57, React Native 0.86, expo-sqlite, expo-audio
├── app.json                                # Configuration Expo, permissions Android RECEIVE_SMS et EAS ID
├── eas.json                                # Profils de build (preview APK, production) et canaux EAS Update
├── babel.config.js                         # Plugin Reanimated
├── metro.config.js                         # Configuration bundler Metro
├── tsconfig.json                           # Configuration TypeScript
│
├── app/                                    # Routes Expo Router
│   ├── _layout.tsx                         # Root Layout avec SafeAreaProvider et ErrorBoundary
│   ├── (onboarding)/                       # Parcours d'onboarding initial
│   ├── (tabs)/                             # Onglets inférieurs (Accueil, Historique, Budgets)
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── transactions.tsx
│   │   └── budgets.tsx
│   ├── (modals)/                           # Modales / Bottom Sheets glissantes
│   │   ├── quick-add.tsx                   # Saisie flash (Dépense / Retrait)
│   │   ├── savings-action.tsx              # Versement / Déblocage d'épargne
│   │   ├── scan-receipt.tsx                # Scan de tickets de caisse
│   │   └── add-wallet.tsx                  # Ajout d'un portefeuille dynamique
│   └── transaction/
│       └── [id].tsx                        # Fiche détaillée de transaction
│
└── src/                                    # Code source partagé
    ├── ai/                                 # Client SDK Gemini 3.1 Flash Lite et Tool Calling
    ├── db/                                 # Base SQLite expo-sqlite et repositories relationnels
    ├── stores/                             # Stores réactifs Zustand (Settings, Wallets, Budgets, Txns)
    ├── services/                           # Logique métier (frais MVola, reste à vivre, parseur SMS)
    ├── components/                         # Composants UI React Native
    ├── styles/                             # global.css
    └── types/                              # Types TypeScript
```
