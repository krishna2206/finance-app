# Architecture

## Vue d'ensemble

```mermaid
flowchart LR
    phone["Téléphone Android<br/>(MacroDroid)"] -- "POST /api/sms/webhook" --> api
    browser["Application web<br/>(React, format mobile)"] -- "REST /api" --> api
    api -- "SSE /api/sms/events" --> browser

    subgraph server["Serveur Bun (un seul processus)"]
        api["Hono : routes /api"] --> services["Services métier"]
        services --> repos["Repositories (Drizzle)"]
        repos --> db[("SQLite<br/>finance.db")]
        backup["Sauvegardes quotidiennes"] --> db
        static["Fichiers de l'app web compilée"]
    end

    browser -- "GET /" --> static
    shared["@finance/shared<br/>règles comptables"] -.-> services
    shared -.-> browser
```

En production, un seul processus Bun sert à la fois l'API et l'application web compilée, sur la même origine : pas de CORS, un seul port. En développement, Vite sert l'application web et redirige `/api` vers le backend.

Pour les fichiers de l'application :
- les fichiers versionnés par un hash (`/assets/*`) sont mis en cache un an ;
- `index.html`, le service worker et le manifeste sont revalidés à chaque chargement, pour que les mises à jour arrivent immédiatement ;
- une adresse de navigation (sans extension) reçoit l'application ; un fichier absent répond 404.

## Organisation du dépôt

Un monorepo avec les workspaces Bun :

| Dossier | Paquet | Rôle |
|---|---|---|
| `backend/` | `finance-app-backend` | API Hono, base SQLite, parser SMS, tests unitaires |
| `web/` | `finance-app-web` | Application React (Vite, Tailwind CSS v4, Framer Motion, Zustand) |
| `shared/` | `@finance/shared` | Code commun au backend et au web : catégories système, règles comptables, grilles tarifaires Mobile Money |
| `e2e/` | `finance-app-e2e` | Tests end-to-end Playwright |

## Stack technique

| Couche | Choix | Raison |
|---|---|---|
| Runtime | Bun | Exécute TypeScript directement ; SQLite intégré (`bun:sqlite`) ; installations et tests rapides |
| Serveur HTTP | Hono | Léger, typé, SSE natif (`streamSSE`), service de fichiers statiques pour Bun |
| Base de données | SQLite en mode WAL | Un seul fichier, facile à sauvegarder et à auto-héberger |
| ORM et migrations | Drizzle ORM et drizzle-kit | Schéma typé qui sert de source unique ; migrations SQL versionnées |
| Frontend | React 19, Vite 6 | |
| Styles et animations | Tailwind CSS v4, Framer Motion | Interface mobile : fenêtres glissantes, transitions |
| État client | Zustand | Un store par domaine, sans surcouche |
| Icônes | Solar Icons | |
| PWA | vite-plugin-pwa (Workbox) | Manifeste et service worker générés au build ; seule l'interface est mise en cache |
| Tests | `bun test`, Playwright | Unitaires et invariants sur une base en mémoire ; end-to-end sur un navigateur mobile |

## Backend

### Couches

```
backend/src/
├── index.ts           Démarrage : base, jeton, sauvegardes, serveur
├── app.ts             Application Hono : middlewares, routes, fichiers statiques, erreurs
├── routes/            Traduction HTTP <-> services (validation des entrées, codes de retour)
├── services/          Logique métier
│   ├── ledgerService.ts        Effets comptables et atomicité
│   ├── transactionService.ts   Saisie manuelle et modification d'opérations
│   ├── savingsService.ts       Versements et déblocages d'épargne
│   ├── budgetService.ts        Affectation et réaffectation des enveloppes
│   ├── smsService.ts           Enregistrement d'un SMS (doublons, comptes, solde)
│   ├── smsParser.ts            Analyse des SMS par expressions régulières
│   ├── autoCategorizer.ts      Catégorie selon le type d'opération
│   ├── statsService.ts         Bilans mensuels et historique
│   ├── auditService.ts         Journal d'activité : track(), résumés lisibles, écarts
│   └── backupService.ts        Sauvegardes SQLite
├── db/
│   ├── schema.ts      Schéma Drizzle (source unique)
│   ├── index.ts       Connexion, migrations, withTransaction()
│   ├── seed.ts        Primitives système (catégories, réglages par défaut)
│   └── repositories/  Accès aux tables, sans logique métier
├── lib/
│   ├── auth.ts        Jeton d'accès
│   ├── errors.ts      HttpError et traduction des erreurs en JSON
│   ├── validation.ts  Validation des entrées (montants entiers, énumérations, dates)
│   ├── time.ts        Fuseau de l'application, périodes mensuelles
│   ├── audit.ts       Origine de la requête (App, SMS) et collecte des changements de solde
│   └── format.ts
└── scripts/backup.ts  Sauvegarde manuelle
```

Chaque couche a un rôle précis :
- Une **route** ne contient pas de logique métier : elle valide les entrées, appelle un service et renvoie la réponse.
- Un **service** applique les règles métier et décide des transactions SQLite.
- Un **repository** ne fait que lire et écrire.

### Atomicité et cohérence comptable

Toute écriture qui touche à l'argent passe par `withTransaction()`, qui s'appuie sur `Database.transaction` de `bun:sqlite`. Les appels imbriqués utilisent des savepoints. Si une étape échoue, rien n'est écrit.

`ledgerService` calcule une seule fois les effets d'une opération sur les soldes :
- `record()` enregistre l'opération et applique ses effets ;
- `remove()` applique leur inverse exact ;
- `replace()` annule les effets de l'ancienne version puis applique ceux de la nouvelle, dans la même transaction. La nouvelle version est construite une fois les anciens effets annulés, ce qui permet de vérifier un disponible comme si l'opération n'avait jamais existé.

La création et la modification d'une opération manuelle partagent le même analyseur d'entrée (`parseManualEntry` dans `transactionService`) : une modification n'est qu'une saisie dont les champs absents reprennent la valeur actuelle.

Création et suppression sont donc toujours symétriques. Le détail des effets est dans [DATA_MODEL.md](DATA_MODEL.md#effets-sur-les-soldes).

### Journal d'activité

`auditService.track(fn, describe)` exécute `fn` dans une transaction, collecte les changements de solde qu'elle provoque, puis écrit les entrées décrites par `describe` dans la même transaction.

- **Soldes** : `walletRepository.updateBalance()` signale chaque écriture de solde à `lib/audit.ts`, qui retient le premier « avant » et le dernier « après » de chaque compte. `bun:sqlite` étant synchrone, aucune autre requête ne s'intercale pendant la collecte.
- **Origine** : un middleware place l'acteur (`SMS` pour `/api/sms/webhook`, sinon `APP`) dans un `AsyncLocalStorage` ; hors requête, c'est `SYSTEM`.
- **Démarrage** : sur une base sans journal, une première entrée photographie les soldes.
- **Points d'écriture** : `ledgerService` (ajout, suppression), `transactionService.update`, `smsService` (doublon, recalage avec écart, retard), la route SMS (SMS non reconnu), et les routes comptes, épargne, enveloppes, catégories et réglages.

### Erreurs

Les services lèvent des `HttpError` (400 validation, 404 introuvable, 409 conflit métier, 422 SMS non reconnu). Un gestionnaire unique les traduit en `{ "error": "message lisible" }`, et fait de même pour les JSON invalides (400) et les violations de contraintes SQLite (409). Une erreur imprévue renvoie un 500 générique, et le détail n'apparaît que dans les journaux du serveur.

### Authentification

Toutes les routes `/api/*` exigent le jeton d'accès, au choix :
- dans l'en-tête `Authorization: Bearer <jeton>` ;
- dans l'en-tête `X-Access-Token` ;
- dans le paramètre `?token=`, nécessaire pour `EventSource` et pratique pour les webhooks.

La comparaison se fait en temps constant. Le jeton vient de `APP_ACCESS_TOKEN`, sinon d'un fichier `.access-token` généré au premier démarrage à côté de la base. `/health` reste public, pour les sondes de disponibilité.

### Temps réel

`GET /api/sms/events` ouvre un flux Server-Sent Events :

- **Événements** : `connected` à l'ouverture, `ping` toutes les 10 secondes, et `NEW_SMS_TRANSACTION` à chaque SMS enregistré. Ce dernier contient l'opération, le résultat de l'analyse, les enveloppes candidates et l'indicateur de choix d'enveloppe.
- **Côté client** (`web/src/services/smsListener.ts`) :
  - le flux est reconnecté si aucun signal n'arrive pendant 35 secondes ou en cas d'erreur ;
  - toutes les données sont resynchronisées quand l'application revient au premier plan ou que le réseau revient.

### Fuseau horaire

`APP_UTC_OFFSET_MINUTES` vaut 180 par défaut (Madagascar, sans heure d'été). Il sert à deux choses :
- convertir l'heure des SMS en UTC ;
- découper les périodes mensuelles côté serveur (`periodBounds`).

Le client découpe jours et mois selon l'heure de l'appareil (`web/src/utils/dates.ts`).

### Sauvegardes

`backupService` crée un instantané cohérent avec `VACUUM INTO`, qui gère correctement le mode WAL :
- au démarrage, si la dernière sauvegarde a plus de 24 heures ;
- puis toutes les 24 heures.

Les copies au-delà de `BACKUP_RETENTION` (30 par défaut) sont supprimées.

## Référence de l'API

Toutes les routes sont préfixées par `/api` et demandent le jeton. Les corps sont en JSON.

### Accès et réglages

| Méthode | Route | Description |
|---|---|---|
| GET | `/auth/check` | Vérifie le jeton |
| GET | `/settings` | Profil et réglages (`hasGeminiApiKey`, jamais la clé) |
| PUT | `/settings` | Mise à jour partielle. `geminiApiKey: ""` efface la clé |

### Comptes

| Méthode | Route | Description |
|---|---|---|
| GET | `/wallets` | Comptes avec `virtualLocked` et `spendableBalance` |
| GET | `/wallets/:id` | Un compte |
| POST | `/wallets` | Création (`name`, `type`, `accountNumber`, `balance`, `isSpendable`) |
| POST | `/wallets/batch-init` | Initialisation à l'onboarding (refusée si un historique existe) |
| POST | `/wallets/:id/adjust` | Correction du solde réel (`newBalance`, `note` facultatif), sans créer d'opération, notée au journal avec son écart. Refusée sous l'épargne bloquée |
| DELETE | `/wallets/:id` | Suppression (refusée si le compte est référencé) |

### Opérations

| Méthode | Route | Description |
|---|---|---|
| GET | `/transactions` | Toutes les opérations, les plus récentes d'abord. Options : `?month=YYYY-MM`, `?limit=N` |
| GET | `/transactions/:id` | Une opération |
| POST | `/transactions` | Saisie manuelle : `flow`, `operationType`, `walletId`, `destinationWalletId`, `categoryId`, `budgetId`, `amount`, `feeAmount`, `feeRefundAmount`, `withdrawalFeeCovered`, `counterpartyOperator`, `title`, `date`, `note`, `location`, `items` |
| PUT | `/transactions/:id` | Modification complète : `flow`, `operationType`, `walletId`, `destinationWalletId`, `amount`, `feeAmount`, `feeRefundAmount`, `withdrawalFeeCovered`, `counterpartyOperator`, `categoryId`, `budgetId`, `title`, `date`, `note`. Les champs absents gardent leur valeur, `null` vide un champ facultatif. Pour l'épargne : `amount`, `walletId` (versement), `destinationWalletId` (déblocage), `date`, `title`, `note` |
| DELETE | `/transactions/:id` | Suppression, avec annulation des effets |

### Catégories et enveloppes

| Méthode | Route | Description |
|---|---|---|
| GET, POST | `/categories` | Liste, création (`name`, `type`, `group`, `color`, `icon`). Le groupe doit correspondre au type |
| GET, PUT, DELETE | `/categories/:id` | Détail, modification, suppression. Les catégories système ne se modifient ni ne se suppriment ; une catégorie utilisée ne se supprime pas et ne change pas de type |
| GET, POST | `/budgets` | Liste, création (`name`, `monthlyLimit`, `categoryIds`, `isEssential`, `isFixed`, `color`, `icon`) |
| GET, PUT, DELETE | `/budgets/:id` | Détail, modification (un nouveau plafond vaut à partir du mois en cours), suppression. Une enveloppe qui a des opérations est archivée (`archived: true`). Réaffecte les opérations du mois en cours |

### Épargne

| Méthode | Route | Description |
|---|---|---|
| GET, POST | `/savings` | Pots (avec part réservée et part libre), création |
| GET, PUT, DELETE | `/savings/:id` | Détail avec objectifs, renommage et apparence, suppression si vide |
| POST | `/savings/:id/deposit` | Versement (`amount`, `sourceWalletId`, `note`) |
| POST | `/savings/:id/withdraw` | Déblocage de la part libre (`amount`, `destinationWalletId`, `note`) |
| GET, POST | `/savings-goals` | Objectifs, création |
| GET, PUT, DELETE | `/savings-goals/:id` | Détail, modification (hors montant accumulé), suppression |
| POST | `/savings-goals/:id/contribute` | Versement ou déblocage ciblé (`amount`, `action`: `DEPOSIT` ou `WITHDRAW`, `sourceWalletId`) |

### SMS, statistiques et données

| Méthode | Route | Description |
|---|---|---|
| POST | `/sms/webhook` | Enregistre un SMS (`message`, `sender`, `timestamp` facultatif). 201, ou 200 avec `duplicate: true`. Un SMS de remboursement App MVola renvoie 200 avec `feeRefund: true` et le transfert complété (ou `null`) |
| POST | `/sms/test-parse` | Analyse un SMS sans rien enregistrer |
| GET | `/sms/events` | Flux temps réel (SSE) |
| GET | `/stats/history?months=N` | Pour chacun des N derniers mois : revenus, dépenses, épargne versée, flux net, enveloppes respectées et dépassées, écarts de solde (`balanceDrift`, `balanceDriftCount`), `hasActivity` |
| GET | `/stats/monthly-savings?period=YYYY-MM` | Bilan d'un mois par enveloppe, avec le plafond de ce mois-là |
| GET | `/data/export` | Export JSON complet (journal compris), sans secret |
| GET | `/audit` | Journal, du plus récent au plus ancien. Paramètres : `limit` (50, max 200), `cursor` (renvoyé dans `nextCursor`), `domains` (liste séparée par des virgules), `walletId`, `driftOnly=1` |
| GET | `/audit/drift-summary` | Total et nombre d'écarts par compte et par mois |

## Frontend

### Organisation

```
web/src/
├── App.tsx            Accès, onboarding, navigation par onglets, fenêtres globales
├── components/
│   ├── views/         Écrans : Tableau de bord, Historique, Budgets, Paramètres, Bilans, Journal d'activité, Écarts de solde
│   ├── sheets/        Fenêtres glissantes : formulaire d'opération (saisie rapide et modification), détail, enveloppe, épargne, etc.
│   ├── onboarding/    Déverrouillage et premier lancement
│   ├── layout/        Barre d'onglets, bouton d'ajout
│   ├── common/        Composants génériques (cartes groupées, icônes, confirmation, notifications)
│   ├── dashboard/, transactions/
├── stores/            Un store Zustand par domaine, plus sync.ts (rechargement groupé)
├── services/          Client API, écoute temps réel
├── utils/             Formatage, dates locales, erreurs, mémoire de saisie, frais d’une saisie Mobile Money
└── types/models.ts    Types partagés avec l'API
web/public/icons/      Icônes de l'application (générées)
design/icon/           Icône source et script de génération des déclinaisons
```

Les icônes se régénèrent avec `uv run --with pillow --with numpy python design/icon/generate.py` : versions « any » (tuile d'origine), « maskable » et iPhone (fond plein, motif dans la zone sûre), favicons.

### Flux de données

- `services/api.ts` centralise les appels :
  - ajout du jeton ;
  - traduction des erreurs en messages lisibles ;
  - retour à l'écran de déverrouillage sur une réponse 401.
- Les stores de chargement affichent eux-mêmes leurs erreurs. Les actions d'écriture renvoient un résultat, ou lèvent une erreur que l'écran affiche dans une notification (`utils/errors.ts`).
- Après une écriture qui touche l'argent, `refreshLedger()` recharge les comptes, l'épargne et l'historique. Après une modification d'enveloppe, l'historique est rechargé, car le serveur a pu réaffecter des opérations du mois.
- Tous les agrégats (dépensé, dépensé par enveloppe, filtres de l'historique) utilisent les règles de `@finance/shared`. Les chiffres de l'application sont donc identiques à ceux du serveur.

## Qualité et intégration continue

| Niveau | Outil | Ce qui est vérifié |
|---|---|---|
| Types | `tsc` sur chaque paquet | Typage strict de tout le dépôt |
| Migrations | `drizzle-kit generate` | Le schéma et les migrations committées sont synchronisés |
| Unitaires et invariants | `bun test` sur une base en mémoire | Parser SMS, symétrie des effets, atomicité, doublons, fuseau horaire, enveloppes, intégrité, accès |
| End-to-end | Playwright (Pixel 7, fuseau de Madagascar) | Parcours complets sur l'application compilée, contre une base neuve |
| Image | Docker + test de fumée | Démarrage, accès protégé, persistance du volume, sauvegarde |

Le pipeline complet est décrit dans `.github/workflows/ci.yml`. Le déploiement n'a lieu qu'après la réussite de toutes les étapes.

## Image Docker

`Dockerfile` en trois étapes :
1. **build** : installation complète et compilation de l'application web ;
2. **dépendances de production** : installation sans les dépendances de développement ;
3. **exécution** : image `oven/bun` slim, utilisateur non privilégié, volume `/data` (base, jeton généré, sauvegardes), port 4880, et vérification de santé sur `/health`.
