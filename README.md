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

- Méthode `POST`, URL `http://<machine>:4880/api/sms/webhook?token=<jeton>`
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
```
