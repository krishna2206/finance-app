# Finance App

Application de finances personnelles auto-hébergée : backend Hono/Bun/SQLite, client web React (format mobile), interception des SMS MVola en temps réel.

## Structure

- `backend/` : API, base SQLite (`backend/finance.db`), migrations Drizzle (`backend/drizzle/`).
- `web/` : application web.
- `shared/` : règles métier communes (catégories système, calcul du « dépensé »).

## Démarrage

```bash
bun install        # une fois
bun run start      # production : compile le web puis le sert sur http://<machine>:4880
bun dev            # développement : backend 4880 + Vite 4881 (rechargement à chaud)
```

## Jeton d'accès

Toute l'API est protégée par un jeton. Au premier démarrage, il est généré dans `backend/.access-token` (non versionné). On peut aussi l'imposer avec la variable `APP_ACCESS_TOKEN`.

- Application web : le jeton est demandé une fois, puis mémorisé sur l'appareil.
- Appels externes : en-tête `Authorization: Bearer <jeton>` ou paramètre `?token=<jeton>`.

## Interception des SMS (MacroDroid)

Action « Requête HTTP » déclenchée à la réception d'un SMS de l'expéditeur MVola :

- Méthode `POST`, URL `https://myfinance.hebergeko.online/api/sms/webhook?token=<jeton>` (ou `http://<machine>:4880/...` en local)
- Corps JSON : `{"sender": "MVOLA", "message": "[sms_message]"}`

Un SMS déjà reçu (même référence opérateur) est ignoré. Le solde annoncé dans le SMS le plus récent fait foi.
Pour qu'un envoi vers son propre numéro Airtel / Orange soit compté comme un transfert interne (et non une dépense), renseigner le numéro de ce compte à sa création.

## Sauvegardes

- Automatiques : au démarrage si la dernière date de plus de 24 h, puis toutes les 24 h, dans `backend/backups/` (30 conservées). Variables : `BACKUP_DIR`, `BACKUP_RETENTION`.
- Manuelle : `bun run backup`.
- Restauration : arrêter le serveur, copier la sauvegarde choisie sur `backend/finance.db` (supprimer `finance.db-wal` et `finance.db-shm`), redémarrer.
- Export lisible : Paramètres, puis « Exporter mes données » (JSON).

Pensez à copier régulièrement `backend/backups/` hors de la machine (disque externe, cloud).

## Évolution du schéma

Le schéma est défini uniquement dans `backend/src/db/schema.ts`. Après une modification :

```bash
cd backend && bun run db:generate   # génère la migration SQL dans backend/drizzle/
```

Les migrations sont appliquées automatiquement au démarrage.

## Fuseau horaire

Les SMS sont horodatés en heure de Madagascar (UTC+3) et les mois budgétaires sont découpés en heure locale. Variable `APP_UTC_OFFSET_MINUTES` (défaut 180).

## Tests

```bash
bun run test        # tests du parser SMS et des invariants comptables (base en mémoire)
bun run typecheck
bun run test:e2e    # Playwright, nécessite Chromium (exécuté en CI)
```

Les tests end-to-end (`e2e/`) pilotent l'application compilée sur un téléphone Android simulé, dans le fuseau de Madagascar, contre une base neuve et isolée.

## Intégration continue

À chaque push et pull request (`.github/workflows/ci.yml`) :

1. Vérification des types, migrations synchronisées avec le schéma, tests unitaires, build web.
2. Tests end-to-end Playwright. Le rapport, les traces et les vidéos sont publiés en artefact en cas d'échec.
3. Build de l'image Docker puis test de fumée : santé, accès protégé, persistance du volume après redémarrage, sauvegarde créée.
4. Sur `main` uniquement, si tout est vert : déploiement sur Dokploy, puis vérification de la version en ligne.

## Déploiement (Dokploy, nœud fitiavana)

- Application `myfinance` (projet Self-hosted), build via le `Dockerfile`, déploiement automatique Dokploy désactivé : seule la CI déploie.
- Domaine `https://myfinance.hebergeko.online` (Cloudflare proxifié, certificat Let's Encrypt), port 4880.
- Volume persistant `myfinance-data` monté sur `/data` : base, sauvegardes quotidiennes (`/data/backups`).
- Variables d'environnement dans Dokploy : `APP_ACCESS_TOKEN` (le jeton à saisir dans l'app et dans MacroDroid), `APP_UTC_OFFSET_MINUTES`, `BACKUP_RETENTION`.
- Secrets GitHub : `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_APPLICATION_ID`.
