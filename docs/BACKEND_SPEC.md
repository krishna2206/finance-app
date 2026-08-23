# Spécification Technique & API : Backend Hono & SSE (`backend/`)

Ce document définit l'architecture, les choix technologiques, les endpoints REST, le flux Server-Sent Events (SSE) et la structure du serveur backend.

## 1. Description & Rôle du Backend

Le backend constitue la colonne vertébrale du système. Il remplit 4 missions fondamentales :
- **Passerelle Webhook SMS H24** : Réception des requêtes HTTP transmises par le smartphone Android lors de la réception d'un SMS MVola ou Airtel.
- **Source de Vérité Unique (SQLite)** : Persistance locale centralisée dans `finance.db` (`bun:sqlite`), garantissant que le client Web (ordinateur/smartphone) et le client Mobile accèdent aux mêmes soldes et transactions.
- **Diffuseur Temps Réel (SSE)** : Émission instantanée d'événements vers la Web App connectée pour afficher les toasts de confirmation sans rechargement.
- **Émetteur Web Push (VAPID)** : Chiffrement et expédition de notifications d'arrière-plan vers les serveurs de push (Google FCM / Apple) pour réveiller les appareils même lorsque le navigateur est fermé.

## 2. Architecture & Choix Technologiques

```
+-----------------------------------------------------------------------------------+
|                          BACKEND API (Hono / Bun + SQLite)                        |
|                                                                                   |
|  [ COUCHE SERVEUR & STREAMING ]                                                   |
|  - Hono (Framework HTTP TypeScript ultra-rapide, < 1ms de latence)                |
|  - Bun Runtime (Démarrage instantané < 10ms, moteur TypeScript natif)             |
|  - Server-Sent Events (SSE) sur `GET /api/events` (Broadcaster temps réel)        |
|                                                                                   |
|  [ COUCHE DONNÉES & LOGIQUE MÉTIER ]                                              |
|  - bun:sqlite (Pilote SQLite natif ultra-performant avec UUID v4 immuables)       |
|  - Parseur Regex SMS MVola / Airtel + Moteur d'auto-catégorisation en 3 niveaux   |
|  - Moteur de réconciliation anti-doublon (SMS + Tickets de caisse)               |
|  - Calculateur de frais MVola et Reste à vivre journalier                         |
|                                                                                   |
|  [ COUCHE IA & NOTIFICATIONS PUSH ]                                               |
|  - Google Gemini 3.1 Flash Lite SDK (Transcription STT, Vision OCR, Tool Calling) |
|  - web-push (Standard VAPID pour alertes écran de verrouillage avec TTL)          |
+-----------------------------------------------------------------------------------+
```

### Justification des Choix Technologiques

| Composant | Technologie | Justification |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | Démarrage en < 10 ms, exécution TypeScript native, pilote SQLite le plus rapide du marché. |
| **Framework HTTP** | **Hono** | Framework web moderne ultra-léger (< 1 ms d'overhead), typage partagé. |
| **Base de Données** | **SQLite (`bun:sqlite`)** | Base relationnelle rapide, zéro configuration, transactions ACID. |
| **Temps Réel** | **Server-Sent Events (SSE)** | Protocole standard HTTP unidirectionnel sans la complexité de WebSocket. |
| **Notifications Push** | **`web-push` (Standard VAPID)** | Envoi de messages chiffrés avec rétention TTL pour livraison au rallumage. |
| **Moteur IA** | **Google Gemini 3.1 Flash Lite SDK** | Transcription STT verbatim, vision de reçus et exécution des outils SQLite. |

## 3. Spécification Exhaustive des Endpoints API

### 3.1 Passerelle SMS & Événements Temps Réel

#### `POST /api/sms/webhook`
- **Description** : Reçoit le texte brut d'un SMS intercepté par le smartphone (via MacroDroid / Tasker).
- **Body** :
  ```json
  {
    "body": "Nandefa 25 000 Ar tany amin'ny 0341122233. Frais: 450 Ar. Solde restant: 470 050 Ar. Ref: 189283749",
    "sender": "MVOLA",
    "timestamp": 1755948000000
  }
  ```
- **Comportement** :
  1. Parse le texte avec `smsParser.ts`.
  2. Résout la catégorie via `categoryResolution.ts` (Mémoire contact -> Opération -> Imprévus).
  3. Insère la transaction dans SQLite et met à jour le solde du portefeuille.
  4. Émet un événement SSE `NEW_TRANSACTION` vers les clients Web connectés.
  5. Émet une notification Web Push vers les souscriptions enregistrées.
- **Réponse (200 OK)** :
  ```json
  {
    "success": true,
    "transactionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "parsed": {
      "flow": "DEBIT",
      "amount": 25000,
      "feeAmount": 450,
      "operationType": "TRANSFER_P2P",
      "categoryId": "c7b8e1a4-9f2d-4e8b-8a21-3e5f1b9a7c01"
    }
  }
  ```

#### `GET /api/events`
- **Description** : Flux Server-Sent Events (SSE) temps réel pour la Web App PWA.
- **Headers** : `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- **Types d'Événements Émis** :
  - `NEW_TRANSACTION` : Nouvelle transaction capturée avec montant et catégorie.
  - `WALLET_UPDATED` : Mise à jour d'un solde de portefeuille.
  - `BUDGET_ALERT` : Alerte de dépassement de seuil journalier.

### 3.2 Portefeuilles (Wallets)

#### `GET /api/wallets`
- **Description** : Retourne la liste de tous les portefeuilles avec leurs soldes actuels.
- **Réponse (200 OK)** :
  ```json
  [
    { "id": "MVOLA", "name": "MVola", "balance": 474500, "isSpendable": true, "updatedAt": 1755948000000 },
    { "id": "CASH", "name": "Espèces", "balance": 365000, "isSpendable": true, "updatedAt": 1755948000000 },
    { "id": "BANK", "name": "Compte Bancaire", "balance": 0, "isSpendable": true, "updatedAt": 1755948000000 },
    { "id": "SAVINGS_VAULT", "name": "Coffre Épargne", "balance": 150000, "isSpendable": false, "updatedAt": 1755948000000 }
  ]
  ```

#### `POST /api/wallets/:id/adjust`
- **Description** : Réajuste manuellement le solde d'un portefeuille.
- **Body** : `{ "newBalance": 500000 }`

### 3.3 Catégories & Budgets

#### `GET /api/categories`
- **Description** : Retourne toutes les catégories de dépenses et l'objectif d'épargne.
- **Réponse (200 OK)** :
  ```json
  [
    {
      "id": "c7b8e1a4-9f2d-4e8b-8a21-3e5f1b9a7c01",
      "name": "Nourriture & Marché",
      "type": "EXPENSE",
      "monthlyBudget": 350000,
      "color": "#34D399",
      "icon": "shopping-cart",
      "isEssential": true,
      "createdAt": 1755948000000
    }
  ]
  ```

#### `PUT /api/categories/:id/budget`
- **Description** : Modifie le plafond mensuel d'une catégorie.
- **Body** : `{ "monthlyBudget": 400000 }`

### 3.4 Transactions

#### `GET /api/transactions?month=YYYY-MM`
- **Description** : Liste les transactions d'un mois donné ordonnées par date décroissante.

#### `POST /api/transactions`
- **Description** : Crée une transaction manuelle, déduit le solde du portefeuille et met à jour le mapping contact.

#### `PUT /api/transactions/:id/enrich`
- **Description** : Attache la liste des articles d'un ticket scanné (`TransactionItem[]`) et le lieu sans doubler le débit de solde.

#### `DELETE /api/transactions/:id`
- **Description** : Supprime une transaction et réajuste automatiquement le solde du portefeuille.

### 3.5 AI Assistant & Multimodal

#### `POST /api/ai/transcribe`
- **Description** : Reçoit un fichier audio base64, applique le prompt STT verbatim et retourne la transcription texte.

#### `POST /api/ai/scan-receipt`
- **Description** : Reçoit une image de ticket de caisse en base64 et retourne le JSON structuré des articles et du total.

#### `POST /api/ai/chat`
- **Description** : Exécute une session de chat avec injection du contexte financier dynamique et exécution des outils Tool Calling SQLite.

## 4. Structure Détaillée du Répertoire `backend/`

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
    │   ├── schema.ts                       # DDL tables avec UUID v4 (wallets, categories, txns, recipients)
    │   └── repositories/                   # Requêtes SQL relationnelles
    │       ├── walletRepository.ts         # Gestion des soldes
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
        ├── sms.ts                          # `POST /api/sms/webhook` & `GET /api/events` (SSE)
        ├── push.ts                         # `POST /api/push/subscribe` (Web Push)
        ├── wallets.ts                      # `GET/POST /api/wallets`
        ├── categories.ts                   # `GET/POST /api/categories`
        ├── transactions.ts                 # `GET/POST /api/transactions`
        └── ai.ts                           # `POST /api/ai/chat`, `POST /api/ai/transcribe`, `POST /api/ai/scan-receipt`
```
