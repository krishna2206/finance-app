# Spécification Technique & Mobile : Client Expo React Native (`mobile/`)

Ce document définit l'architecture, la configuration et le fonctionnement de l'application mobile native optionnelle (prête pour compilation APK Android).

## 1. Description & Rôle du Module Mobile

Le dossier `mobile/` héberge le client mobile natif sous **Expo (React Native + TypeScript)** :
- **Parité Visuelle & UX Totale avec le Web** : Même disposition (Floating Tab Bar bas gauche, Floating Action Stack bas droite), même thème sombre obsidienne, cartes statistiques dédiées et conteneurs Inset Grouped style Apple.
- **Usage Principal** : Utilisé lors des phases de déploiement d'un APK Android autonome ou d'une passerelle native pour intercepter directement les SMS d'opérateurs en tâche de fond (`RECEIVE_SMS`).
- **Mode de Fonctionnement** : Entièrement autonome en local avec `expo-sqlite` ou connecté à l'API du backend.

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
|  |  - Cartes Statistiques Dédiées (Solde Réel, Reste à Vivre, Cadence, Épargne, Frais)      |  |
|  |  - Inset Grouped Cards (Style Apple HIG pour les actions communes et listes)              |  |
|  |  - Floating Tab Bar gauche & Floating Action Stack droite (Micro hold & Scan Telegram)   |  |
|  |  - Bottom Sheets natifs (QuickAdd, AttachmentGallery, TransactionDetail)                 |  |
|  +----------------------------------------------+-------------------------------------------+  |
|                                                 |                                              |
|                                                 v                                              |
|  +------------------------------------------------------------------------------------------+  |
|  |                                  GESTION D'ÉTAT & PERSISTANCE                            |  |
|  |  - Stores Zustand (useWalletStore, useBudgetStore, useTransactionStore)                  |  |
|  |  - Base relationnelle locale : `expo-sqlite` (finance.db avec UUID v4 immuables)         |  |
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
│   ├── (tabs)/                             # Onglets inférieurs (Accueil, Historique, Budgets, Assistant)
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── transactions.tsx
│   │   ├── budgets.tsx
│   │   └── assistant.tsx
│   ├── (modals)/                           # Modales / Bottom Sheets glissantes
│   │   ├── quick-add.tsx                   # Saisie flash rapide
│   │   ├── scan-receipt.tsx                # Scan de tickets de caisse SCORE
│   │   └── paste-sms.tsx                   # Simulateur de test SMS
│   └── transaction/
│       └── [id].tsx                        # Fiche détaillée de transaction
│
├── src/                                    # Code source modulaire
│   ├── ai/                                 # Client SDK Gemini 3.1 Flash Lite et Tool Calling
│   ├── db/                                 # Base SQLite expo-sqlite et repositories relationnels
│   ├── stores/                             # Stores réactifs Zustand
│   ├── services/                           # Logique métier (frais MVola, reste à vivre, parseur SMS)
│   ├── components/                         # Composants UI React Native
│   │   ├── cards/                          # Cartes dédiées (Solde, Reste à Vivre, Épargne, Frais)
│   │   ├── charts/                         # CadenceProgressBar avec seuil Jour J (`|`)
│   │   ├── common/                         # InsetGroupedCard style Apple
│   │   ├── layout/                         # FloatingTabBar, FloatingActionStack
│   │   ├── transactions/                   # TransactionRow, TransactionItemRow
│   │   └── voice/                          # VoiceRecordButton (Hold to record)
│   ├── styles/                             # global.css
│   └── types/                              # Types TypeScript
│
└── assets/                                 # Icônes et splash screen
```
