# Spécification Technique & API : Backend Hono & SSE (`backend/`)

Ce document définit l'architecture, les choix technologiques, les endpoints REST, le flux Server-Sent Events (SSE) et la structure du serveur backend.

## 1. Description, Rôle & Philosophie Self-Hosted

Le backend constitue la source de vérité et la passerelle de communication :
- **Auto-Hébergeable & Docker-Ready** : Conçu pour s'exécuter en quelques millisecondes sur n'importe quel VPS privé, serveur local ou conteneur Docker avec une empreinte mémoire minime (< 30 Mo RAM).
- **Passerelle Webhook SMS H24** : Réception des requêtes HTTP transmises par le smartphone Android lors de la réception d'un SMS MVola ou Airtel.
- **Source de Vérité Unique (SQLite)** : Persistance centralisée dans `finance.db` (`bun:sqlite`), garantissant l'accès synchronisé aux soldes, aux portefeuilles dynamiques et aux transactions.
- **Diffuseur Temps Réel (SSE)** : Émission instantanée d'événements vers la Web App connectée pour afficher les alertes et rafraîchir les données sans rechargement.
- **Émetteur Web Push (VAPID)** : Chiffrement et expédition de notifications d'arrière-plan vers les serveurs de push (Google FCM / Apple).

## 2. Architecture Système & Interactions

```
+------------------------------------------------------------------------------------------------+
|                             ARCHITECTURE DU BACKEND (backend/)                                 |
|                                                                                                |
|  [ CLIENTS & ÉVÉNEMENTS EXTERNES ]                                                             |
|  - Client Mobile (Local-First) & Passerelle Android (Capture SMS native)                        |
|  - Client Web PWA (Saisie Flash, Dashboard, Gestion des Budgets)                               |
|                                     |                                                          |
|                                     | Requêtes REST & Webhook SMS                              |
|                                     v                                                          |
|  +------------------------------------------------------------------------------------------+  |
|  |                             SERVEUR HTTP HONO (Runtime Bun)                              |  |
|  |                                                                                          |  |
|  |  [ LOGIQUE MÉTIER & PARSERS ]                                                            |  |
|  |  - smsParser.ts (Extraction Regex : montant, frais, solde, ref)                          |  |
|  |  - categoryResolution.ts (Moteur 3 niveaux : Mémoire contact -> Opération -> Imprévus)  |  |
|  |  - mvolaFeeCalculator.ts (Calculateur de frais transferts & retraits Cash Point)         |  |
|  |  - burnRateCalculator.ts (Moteur du reste à vivre & cadence)                             |  |
|  |                                                                                          |  |
|  |  [ PERSISTANCE SQLITE LOCALE (bun:sqlite) ]                                              |  |
|  |  - `finance.db` (wallets, categories, transactions, recipients, settings)                |  |
|  +------------------------------+----------------------------+------------------------------+  |
|                                 |                            |                                 |
|                                 v                            v                                 |
|                      [ BROADCASTER SSE ]           [ SERVICE WEB PUSH ]                        |
|                      (Flux GET /api/events)        (VAPID web-push)                            |
+---------------------------------+----------------------------+---------------------------------+
```

## 3. Choix Technologiques & Justifications

| Composant | Technologie Choisie | Rôle & Justification Technique |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | Démarrage en < 10 ms, exécution TypeScript native sans compilation préalable, pilote SQLite le plus rapide du marché. |
| **Framework HTTP** | **Hono** | Framework web moderne ultra-léger (< 1 ms d'overhead), typage partagé de bout en bout avec le client. |
| **Base de Données** | **SQLite (`bun:sqlite`)** | Base relationnelle rapide, zéro configuration, transactions ACID et clés primaires UUID v4. |
| **Temps Réel** | **Server-Sent Events (SSE)** | Protocole standard HTTP unidirectionnel sans la complexité ni le surcoût de WebSocket. |
| **Notifications Push** | **`web-push` (Standard VAPID)** | Envoi de messages chiffrés avec rétention TTL pour livraison au rallumage du smartphone. |
| **Moteur IA** | **Google Gemini 3.1 Flash Lite SDK** | Transcription STT verbatim, vision de reçus et exécution des outils Tool Calling. |

## 4. Spécification Exhaustive des Endpoints API

### 4.1 Configuration & Profil Utilisateur (Settings)

#### `GET /api/settings`
- **Description** : Retourne la configuration utilisateur, l'identité et le statut d'onboarding.
- **Réponse (200 OK)** :
  ```json
  {
    "id": "global",
    "userName": "Krishna",
    "userProfession": "Développeur",
    "userLocation": "Antananarivo",
    "monthlyIncomeTarget": 1200000,
    "monthlySavingsTarget": 200000,
    "currency": "MGA",
    "onboardingCompleted": true
  }
  ```

#### `PUT /api/settings`
- **Description** : Met à jour le profil, les cibles budgétaires et le statut d'onboarding.
- **Body** :
  ```json
  {
    "userName": "Krishna",
    "userProfession": "Développeur",
    "userLocation": "Antananarivo",
    "monthlyIncomeTarget": 1200000,
    "monthlySavingsTarget": 200000,
    "onboardingCompleted": true
  }
  ```

### 4.2 Portefeuilles Dynamiques (Wallets)

#### `GET /api/wallets`
- **Description** : Retourne la liste de tous les portefeuilles avec leurs soldes actuels.

#### `POST /api/wallets`
- **Description** : Crée dynamiquement un nouveau portefeuille (bancaire, mobile ou physique).
- **Body** :
  ```json
  {
    "id": "BANK_BNI",
    "name": "Compte BNI",
    "balance": 500000,
    "isSpendable": true
  }
  ```

#### `POST /api/wallets/:id/adjust`
- **Description** : Réajuste manuellement le solde d'un portefeuille.
- **Body** : `{ "newBalance": 500000 }`

#### `DELETE /api/wallets/:id`
- **Description** : Supprime un portefeuille personnalisé (sauf les portefeuilles système indispensables).

### 4.3 Passerelle SMS & Événements Temps Réel

#### `POST /api/sms/webhook`
- **Description** : Reçoit le texte brut d'un SMS intercepté par le smartphone.

#### `GET /api/events`
- **Description** : Flux Server-Sent Events (SSE) temps réel pour la Web App PWA.

### 4.4 Catégories & Budgets

#### `GET /api/categories`
- **Description** : Retourne toutes les catégories de dépenses et l'objectif d'épargne.

#### `PUT /api/categories/:id/budget`
- **Description** : Modifie le plafond mensuel d'une catégorie.

### 4.5 Transactions

#### `GET /api/transactions?month=YYYY-MM`
- **Description** : Liste les transactions d'un mois donné ordonnées par date décroissante.

#### `POST /api/transactions`
- **Description** : Crée une transaction (Dépense, Retrait Cash Point, Versement/Déblocage Épargne, Transfert).
- **Gestion Automatique des Mouvements de Trésorerie** :
  - `WITHDRAWAL_CASH` : Débite le compte source de `montant + frais`, crédite `CASH` de `montant`.
  - `SAVINGS_DEPOSIT` : Débite le compte source de `montant`, crédite `SAVINGS_VAULT` de `montant`.
  - `SAVINGS_WITHDRAWAL` : Débite `SAVINGS_VAULT` de `montant`, crédite le compte destination de `montant`.
  - `EXPENSE_GENERAL` (Débit direct) : Débite le portefeuille source de `montant + frais`.

#### `PUT /api/transactions/:id/enrich`
- **Description** : Attache la liste des articles d'un ticket scanné (`TransactionItem[]`) et le lieu.

#### `DELETE /api/transactions/:id`
- **Description** : Supprime une transaction et compense automatiquement les soldes des portefeuilles concernés.

### 4.6 AI Assistant & Multimodal
- `POST /api/ai/transcribe` : Transcription audio STT verbatim.
- `POST /api/ai/scan-receipt` : Extraction structurée JSON de tickets de caisse.
- `POST /api/ai/chat` : Discussion financière avec exécution des outils Tool Calling SQLite.

## 5. Structure Détaillée du Répertoire `backend/`

```
backend/
├── package.json                            # Hono, bun:sqlite, web-push, @google/genai
├── tsconfig.json                           # Configuration TypeScript
├── .env.example                            # Variables d'environnement
│
└── src/
    ├── index.ts                            # Point d'entrée serveur Hono + Middleware CORS & Logger
    │
    ├── db/                                 # Persistance SQLite native
    │   ├── database.ts                     # Connexion et initialisation (finance.db)
    │   ├── schema.ts                       # DDL tables avec UUID v4 (wallets, categories, txns, recipients, settings)
    │   └── repositories/                   # Requêtes SQL relationnelles
    │       ├── walletRepository.ts         # Gestion dynamique des soldes et création
    │       ├── settingsRepository.ts       # Gestion du profil et de l'onboarding
    │       ├── categoryRepository.ts       # Gestion des budgets
    │       ├── transactionRepository.ts    # CRUD transactions et items
    │       └── recipientRepository.ts      # Mémoire apprenante des numéros tiers
    │
    ├── services/                           # Logique métier et moteurs de calcul
    │   ├── smsParser.ts                    # Parseur regex MVola / Airtel
    │   ├── categoryResolution.ts           # Moteur d'auto-catégorisation en 3 niveaux
    │   ├── receiptReconciliation.ts        # Moteur anti-doublon et fusion SMS / Tickets
    │   ├── mvolaFeeCalculator.ts           # Grille tarifaire officielle MVola
    │   ├── burnRateCalculator.ts           # Calcul du reste à vivre journalier et cadence
    │   ├── sseBroadcaster.ts               # Gestionnaire des connexions SSE et émission d'événements
    │   └── pushNotificationService.ts      # Envoi des notifications Web Push VAPID
    │
    ├── ai/                                 # Orchestration Gemini 3.1 Flash Lite
    │   ├── client.ts                       # Client SDK Gemini
    │   ├── agentHarness.ts                 # Injection du contexte dynamique (soldes, budgets, date)
    │   ├── tools.ts                        # Définitions des outils Tool Calling
    │   ├── sttPrompt.ts                    # Prompt système transcription verbatim
    │   └── visionPrompt.ts                 # Prompt extraction JSON tickets SCORE
    │
    └── routes/                             # Routeurs REST
        ├── settings.ts                     # `GET/PUT /api/settings` (Profil & Onboarding)
        ├── sms.ts                          # `POST /api/sms/webhook` & `GET /api/events` (SSE)
        ├── push.ts                         # `POST /api/push/subscribe` (Web Push)
        ├── wallets.ts                      # `GET/POST/DELETE /api/wallets`
        ├── categories.ts                   # `GET/POST /api/categories`
        ├── transactions.ts                 # `GET/POST /api/transactions`
        └── ai.ts                           # `POST /api/ai/chat`, `POST /api/ai/transcribe`, `POST /api/ai/scan-receipt`
```
