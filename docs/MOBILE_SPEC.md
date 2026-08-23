# Spécification Technique & Mobile : Client Expo React Native (`mobile/`)

Ce document définit l'architecture, la configuration et le fonctionnement de l'application mobile native optionnelle (prête pour compilation APK Android).

## 1. Description & Rôle du Module Mobile

Le dossier `mobile/` héberge le client mobile natif sous **Expo (React Native + TypeScript)** :
- **Usage Principal** : Utilisé lors des phases de déploiement d'un APK Android autonome ou d'une passerelle native pour intercepter directement les SMS d'opérateurs en tâche de fond.
- **Mode de Fonctionnement** : Entièrement autonome en local avec `expo-sqlite` ou connecté à l'API du backend.

## 2. Architecture & Choix Technologiques

```
+-----------------------------------------------------------------------------------+
|                     APPLICATION MOBILE NATIVE (React Native / Expo)               |
|                                                                                   |
|  [ COUCHE UI & NAVIGATION ]                                                       |
|  - React Native 0.86 + React 19 + Expo SDK 57                                     |
|  - Expo Router v5 (Navigation par onglets et modales FormSheet)                   |
|  - Tailwind CSS v4 / NativeWind                                                   |
|  - Lucide React Native                                                            |
|                                                                                   |
|  [ COUCHE CAPTEURS & NATIVE ]                                                     |
|  - Android BroadcastReceiver (Permissions `RECEIVE_SMS`, `READ_SMS`)              |
|  - expo-audio (Capture micro pour Gemini STT)                                     |
|  - expo-image-picker (Appareil photo & galerie pour tickets SCORE)                |
|  - expo-sqlite (Stockage local offline avec UUID v4)                              |
|  - expo-updates & EAS Update (Mises à jour à chaud sans réinstallation d'APK)     |
+-----------------------------------------------------------------------------------+
```

### Justification des Choix Technologiques

| Composant | Technologie | Justification |
| :--- | :--- | :--- |
| **Framework Mobile** | **Expo SDK 57** | Écosystème natif complet pour Android et iOS. |
| **Routage** | **Expo Router v5** | Navigation typée basée sur les fichiers et modales natives `formSheet`. |
| **Styling** | **NativeWind / Tailwind v4** | Utilisation des mêmes classes utilitaires Tailwind que le Web. |
| **Moteur Local** | **`expo-sqlite` v16** | Base de données locale relationnelle autonome et ultra-rapide. |
| **Audio** | **`expo-audio`** | Module natif Expo 57 pour l'enregistrement audio. |
| **Mises à Jour** | **EAS Update (`expo-updates`)** | Distribution des correctifs à chaud sur smartphone sans recompiler l'APK. |

## 3. Structure du Répertoire `mobile/`

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
│   ├── (modals)/                           # Modales glissantes
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
│   ├── styles/                             # global.css
│   └── types/                              # Types TypeScript
│
└── assets/                                 # Icônes et splash screen
```
