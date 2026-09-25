# Finance App

Application de finances personnelles auto-hébergée, pensée pour le Mobile Money à Madagascar :

- interception des SMS MVola en temps réel ;
- budgets par enveloppes ;
- épargne par pots et objectifs ;
- suivi des frais.

La documentation complète (fonctionnalités, architecture, modèle de données) est dans [`docs/`](docs/README.md).

## Prérequis

- [Bun](https://bun.sh) 1.3 ou plus récent pour le développement, ou
- Docker pour la production.

## Développement

```bash
bun install
bun dev             # backend sur :4880 et application web (Vite) sur :4881
```

Au premier démarrage, le backend génère un jeton d'accès dans `backend/.access-token`. L'application le demande une fois, puis le mémorise.

| Commande | Rôle |
|---|---|
| `bun run test` | Tests unitaires et d'invariants comptables (base en mémoire) |
| `bun run typecheck` | Vérification des types de tous les paquets |
| `bun run test:e2e` | Tests end-to-end Playwright (nécessite Chromium : `cd e2e && bunx playwright install chromium`) |
| `bun run build` | Compilation de l'application web |
| `bun run start` | Compile, puis sert l'API et l'application sur :4880 |
| `bun run backup` | Sauvegarde manuelle de la base |
| `cd backend && bun run db:generate` | Génère une migration après modification de `backend/src/db/schema.ts` |

## Production avec Docker

L'image contient l'API et l'application web compilée, servies sur le même port.

```bash
docker build -t finance-app .
docker run -d --name finance-app \
  -p 4880:4880 \
  -e APP_ACCESS_TOKEN="$(openssl rand -hex 24)" \
  -v finance-data:/data \
  finance-app
```

Le volume `/data` contient la base, les sauvegardes et le jeton généré. Il doit être persistant.

### Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `APP_ACCESS_TOKEN` | généré dans `<dossier de la base>/.access-token` | Jeton exigé sur toute l'API |
| `PORT` | `4880` | Port HTTP |
| `HOST` | `0.0.0.0` | Adresse d'écoute |
| `DB_PATH` | `/data/finance.db` (image), `backend/finance.db` (local) | Fichier SQLite |
| `BACKUP_DIR` | `/data/backups` (image), `backend/backups` (local) | Dossier des sauvegardes |
| `BACKUP_RETENTION` | `30` | Nombre de sauvegardes conservées |
| `APP_UTC_OFFSET_MINUTES` | `180` | Fuseau de l'application (Madagascar = UTC+3) |
| `NODE_ENV` | `production` (image) | Mode d'exécution |

La santé du service est exposée publiquement sur `GET /health`. Tout le reste passe sous `/api` et exige le jeton.

### Exposition

Placez l'application derrière un reverse proxy en HTTPS (Traefik, Caddy, Nginx, ou celui de votre PaaS). Le flux temps réel (`/api/sms/events`) est un flux Server-Sent Events : désactivez la mise en tampon des réponses si votre proxy en fait. Un signal est envoyé toutes les 10 secondes, pour que la connexion ne soit jamais considérée comme inactive.

### Déploiement continu (optionnel)

Le workflow `.github/workflows/ci.yml` peut déclencher un déploiement [Dokploy](https://dokploy.com) après une CI entièrement verte sur `main`. Pour l'activer :

1. Créez dans Dokploy une application qui build ce dépôt avec le `Dockerfile`, montez un volume persistant sur `/data`, et définissez `APP_ACCESS_TOKEN`. Désactivez l'auto-deploy de Dokploy, pour que seule la CI déploie.
2. Ajoutez ces secrets au dépôt GitHub :

| Secret | Contenu |
|---|---|
| `DOKPLOY_URL` | URL du panneau Dokploy |
| `DOKPLOY_API_KEY` | Clé API Dokploy |
| `DOKPLOY_APPLICATION_ID` | Identifiant de l'application |
| `DEPLOY_PUBLIC_URL` | URL publique de l'application, vérifiée après le déploiement |

Sans ces secrets, l'étape de déploiement est simplement ignorée.

## Interception des SMS

Sur le téléphone Android, créez une macro [MacroDroid](https://www.macrodroid.com) :

- Déclencheur : réception d'un SMS de l'expéditeur MVola.
- Action « Requête HTTP » :
  - méthode `POST` ;
  - URL `https://<votre-domaine>/api/sms/webhook?token=<jeton>` ;
  - corps JSON : `{"sender": "MVOLA", "message": "[sms_message]"}`.

Un SMS déjà reçu (même référence opérateur) est ignoré, et le solde annoncé dans le SMS le plus récent fait foi. Pour qu'un envoi vers votre propre numéro Airtel ou Orange soit compté comme un transfert interne plutôt qu'une dépense, renseignez ce numéro en créant le compte correspondant.

## Sauvegardes et restauration

- **Automatiques** : au démarrage si la dernière date de plus de 24 heures, puis toutes les 24 heures, dans `BACKUP_DIR`.
- **Export lisible** : Paramètres, puis « Exporter mes données » (JSON).
- **Restauration** :
  1. arrêtez le service ;
  2. copiez la sauvegarde choisie sur le fichier `DB_PATH` ;
  3. supprimez les fichiers `-wal` et `-shm` voisins ;
  4. redémarrez.

Pensez à copier régulièrement les sauvegardes hors de la machine.

## Intégration continue

À chaque push et pull request :

1. Vérification des types, contrôle que les migrations correspondent au schéma, tests unitaires, build web.
2. Tests end-to-end Playwright sur un navigateur mobile. Rapport, traces et vidéos sont publiés en artefact.
3. Build de l'image Docker, puis test de fumée : santé, accès protégé, persistance du volume, sauvegarde.
4. Sur `main`, si tout est vert et si les secrets sont configurés : déploiement, puis vérification de la version en ligne.
