# Fonctionnalités et règles métier

Ce document décrit ce que fait l'application et les règles qu'elle applique. Pour le fonctionnement interne, voir [ARCHITECTURE.md](ARCHITECTURE.md). Pour les tables et les champs, voir [DATA_MODEL.md](DATA_MODEL.md).

## Sommaire

1. [Principe](#1-principe)
2. [Accès et premier lancement](#2-accès-et-premier-lancement)
3. [Comptes et soldes](#3-comptes-et-soldes)
4. [Opérations](#4-opérations)
5. [Interception des SMS](#5-interception-des-sms)
6. [Catégories](#6-catégories)
7. [Enveloppes de budget](#7-enveloppes-de-budget)
8. [Épargne : pots et objectifs](#8-épargne--pots-et-objectifs)
9. [Tableau de bord](#9-tableau-de-bord)
10. [Historique](#10-historique)
11. [Paramètres, export et sauvegardes](#11-paramètres-export-et-sauvegardes)
12. [Calcul des frais Mobile Money](#12-calcul-des-frais-mobile-money)
13. [Application installable](#13-application-installable)
14. [Feuille de route](#14-feuille-de-route)

## 1. Principe

MyFinance suit les finances personnelles en Ariary (MGA), avec deux objectifs :

- **Réduire la saisie au minimum** : les SMS de l'opérateur Mobile Money sont transformés automatiquement en opérations, en temps réel.
- **Rendre visibles les fuites** : frais de transfert et de retrait, dépassements d'enveloppe, rythme de dépense du mois.

Tous les montants sont des entiers en Ariary, sans centimes. Les jours et les mois sont découpés en heure locale de Madagascar (UTC+3).

## 2. Accès et premier lancement

### Jeton d'accès

L'API est entièrement protégée par un jeton. Au premier affichage, l'application présente un écran « Déverrouiller l'application » où l'on saisit ce jeton. Il est ensuite mémorisé sur l'appareil.

- Un jeton invalide ou révoqué renvoie automatiquement à l'écran de déverrouillage.
- Le même jeton sert aux appels externes, par exemple l'envoi des SMS depuis le téléphone.

### Onboarding

Au tout premier lancement, un parcours en trois étapes établit le point de départ financier :

1. **Profil** : prénom (obligatoire), métier et ville (facultatifs).
2. **Comptes et soldes réels** : Espèces (toujours présent), MVola, Orange Money, Airtel Money, Compte bancaire, ou un compte personnalisé. Le solde réel de chaque compte est saisi, et le total de départ s'affiche en direct.
3. **Finalisation** : les comptes sont créés, et les objectifs par défaut sont posés (revenu mensuel 1 000 000 Ar, épargne mensuelle 150 000 Ar, modifiables ensuite).

L'initialisation des comptes est refusée dès qu'une opération ou un pot d'épargne existe, pour ne jamais écraser un historique réel.

## 3. Comptes et soldes

Un compte (« wallet ») représente un endroit réel où se trouve de l'argent. Il a :

- un **type** : `MVOLA`, `ORANGE_MONEY`, `AIRTEL_MONEY`, `CASH`, `BANK` ou `CUSTOM` ;
- un **solde réel** ;
- un **numéro** facultatif (numéro de téléphone pour le Mobile Money), qui sert à reconnaître les transferts vers ses propres comptes ;
- un indicateur **dépensable**.

Trois notions de solde coexistent :

| Notion | Calcul |
|---|---|
| Solde total | Somme des soldes réels des comptes dépensables |
| Épargne bloquée | Somme des pots d'épargne « gel virtuel » rattachés à ces comptes |
| Disponible | Solde total moins l'épargne bloquée (jamais négatif) |

Un compte ne peut être supprimé que s'il n'a aucune opération dans l'historique et aucun pot d'épargne rattaché.

### Correction de solde

Toucher la tuile d'un compte sur le tableau de bord, ou son solde dans Paramètres, ouvre la fenêtre « Corriger le solde ». On y saisit le solde réel (prérempli avec le solde actuel), et l'écart avec le solde actuel s'affiche en direct.

- La correction remplace le solde réel du compte. Elle ne crée **aucune opération** : le « Dépensé ce mois », les enveloppes et l'historique ne changent pas.
- Le nouveau solde ne peut pas être inférieur à l'épargne bloquée (gel virtuel) sur ce compte.
- C'est le moyen de recaler un compte après un recomptage des espèces, ou de fixer un solde de départ. Pour un compte Mobile Money, le prochain SMS de l'opérateur recale de toute façon le solde automatiquement.

## 4. Opérations

Une opération est une ligne du grand livre. Elle a un **sens** (débit ou crédit), un **type**, un compte, un montant, des frais éventuels, une catégorie, et éventuellement une enveloppe de budget.

### Saisie rapide

Le bouton « + » ouvre la saisie rapide, avec trois modes :

| Mode | Effet | Catégorie |
|---|---|---|
| Dépense | Débite le compte choisi (montant + frais) | Au choix parmi les catégories de dépense |
| Entrée | Crédite le compte choisi | Au choix parmi les catégories de revenu |
| Transfert | Débite le compte source (montant + frais), crédite le compte destination (montant) | « Retrait d'espèces » vers un compte Espèces, sinon « Frais & Mobile Money » |

La saisie propose aussi un titre, une date et une heure (sélecteur), et une note. Quand les frais sont connus (voir [section 12](#12-calcul-des-frais-mobile-money)), ils sont proposés automatiquement, et un toucher permet de les exclure.

Quand la catégorie choisie est couverte par plusieurs enveloppes, des pastilles « Financer depuis l'enveloppe » apparaissent, avec la première enveloppe présélectionnée.

### Fiche détail

Toucher une opération ouvre sa fiche détail. On y trouve :

- **Catégorie** : modifiable. L'enveloppe est alors recalculée : elle est conservée si elle couvre la nouvelle catégorie, sinon la première enveloppe qui la couvre est choisie.
- **Enveloppe** : affichée quand l'opération en a une, et modifiable seulement si plusieurs enveloppes couvrent sa catégorie. Il n'existe pas d'option « hors budget ».
- **Compte, date et heure, note, articles** (si présents).
- **Suppression** : elle annule exactement les effets de l'opération sur les soldes des comptes, des pots d'épargne et des objectifs.

Les montants d'une opération ne sont pas modifiables : pour corriger un montant, on supprime l'opération et on la saisit à nouveau.

### Ce qui compte comme une dépense

Une seule règle, partagée par le serveur et l'application (`shared/src/ledger.ts`) :

| Opération | Montant compté comme dépense |
|---|---|
| Dépense vers un tiers (achat, paiement, envoi à une autre personne) | Montant + frais |
| Transfert entre ses propres comptes (y compris un retrait Cash Point) | Frais uniquement |
| Versement ou déblocage d'épargne | 0 |
| Entrée d'argent | 0 |

Symétriquement, un revenu est une entrée d'argent qui n'est ni un mouvement d'épargne ni un transfert interne.

## 5. Interception des SMS

Le téléphone transmet chaque SMS de l'opérateur au serveur (par exemple avec MacroDroid, voir le [README](../README.md)). Le serveur l'analyse, enregistre l'opération, puis notifie en temps réel toutes les applications ouvertes.

### Formats reconnus (MVola)

| SMS | Type d'opération | Effet |
|---|---|---|
| « … Ar envoyé à NOM 03XXXXXXXX le … » | `TRANSFER_P2P` (débit) | Envoi à une autre personne |
| « Vous avez transféré … Ar à NOM(03XXXXXXXX) … » | `TRANSFER_P2P` (débit) | Envoi vers un autre opérateur |
| « Achat de crédit YAS réussi … » | `TOPUP_AIRTIME` (débit) | Achat de crédit téléphonique |
| « Retrait réussi : … Ar auprès de … » | `WITHDRAWAL_CASH` (débit) | Retrait au Cash Point |
| « Votre achat de … Ar chez MARCHAND a été payé … » | `MERCHANT_PAYMENT` (débit) | Paiement marchand |
| « … Ar reçu de NOM 03XXXXXXXX le … » | `INCOME_TRANSFER` (crédit) | Argent reçu |

Le parser tolère les variations courantes : espaces insécables, frais « gratuit » ou absents, ponctuation facultative, années sur 2 ou 4 chiffres, heures avec ou sans secondes. Un SMS non reconnu est rejeté sans rien enregistrer.

### Règles d'enregistrement

- **Heure** : l'heure du SMS est l'heure locale de Madagascar et est convertie en UTC. Le SMS d'achat de crédit ne contient pas d'heure : on utilise l'heure de réception transmise par le téléphone, sinon l'heure du serveur.
- **Doublons** : chaque SMS porte une référence opérateur. Un SMS dont la référence est déjà connue est ignoré, même si la note de l'opération a été modifiée depuis.
- **Compte** : l'opération est rattachée au compte du même type que l'opérateur. S'il n'existe pas, il est créé. L'application n'écrit jamais dans un compte d'un autre type.
- **Solde** : le solde annoncé dans le SMS fait foi et remplace le solde du compte, à condition que ce SMS soit le plus récent reçu pour ce compte. Un SMS arrivé en retard est enregistré, mais ne modifie pas le solde, qui inclut déjà cette opération.
- **Retrait Cash Point** : le montant retiré est crédité sur le compte Espèces. C'est un transfert interne, dont seuls les frais comptent comme dépense.
- **Envoi vers son propre numéro** : si le numéro destinataire correspond au numéro d'un autre compte de l'utilisateur, l'opération devient un transfert interne et ce compte est crédité.
- **Revenus** : l'argent reçu est toujours classé « Virements reçus ». Aucun salaire n'est deviné à partir du nom de l'expéditeur. On reclasse à la main si besoin.

### Catégorisation automatique

La catégorie dépend uniquement du type d'opération, sans mots-clés ni mémoire des contacts :

| Type d'opération | Catégorie |
|---|---|
| Achat de crédit | Abonnements |
| Paiement marchand | Alimentation & Courses |
| Retrait Cash Point | Retrait d'espèces |
| Salaire | Salaire |
| Argent reçu | Virements reçus |
| Envoi d'argent (débit) | Frais & Mobile Money |

### Choix de l'enveloppe

Si la catégorie du SMS est couverte par plusieurs enveloppes, l'opération est d'abord rangée dans la première, puis une fenêtre « Choisir l'enveloppe » s'ouvre dans l'application. Pour chaque enveloppe, elle affiche le reste du mois ou le dépassement. Un toucher affecte l'enveloppe. Fermer la fenêtre conserve le choix par défaut.

### Notification

Chaque SMS enregistré affiche une notification dans l'application : « SMS MVola intercepté », avec le montant signé, le titre et la note.

## 6. Catégories

16 catégories système sont toujours présentes. Elles ne peuvent être ni supprimées, ni changées de type :

| Type | Catégories |
|---|---|
| Revenu | Virements reçus, Salaire, Freelance / Prestations, Autres revenus |
| Dépense | Alimentation & Courses, Restaurants & Cafés, Transport, Logement & Factures, Abonnements, Outils & Business, Santé, Shopping, Loisirs & Sorties, Retrait d'espèces, Frais & Mobile Money, Non catégorisé |

On peut créer ses propres catégories (nom, type, couleur, icône). Une catégorie personnelle ne peut être supprimée que si aucune opération ne l'utilise.

Chaque opération (hors mouvements d'épargne) a toujours une catégorie, dont le type correspond à son sens : dépense pour un débit, revenu pour un crédit.

## 7. Enveloppes de budget

Une enveloppe est un plafond mensuel qui couvre une ou plusieurs catégories de dépense. Elle a un nom, un plafond, une couleur et une icône, et peut être marquée **essentielle** (besoin vital) ou **fixe** (montant identique chaque mois).

Une même catégorie peut appartenir à plusieurs enveloppes, par exemple « Alimentation & Courses » dans « Courses » et dans « Sorties ».

### Affectation

Chaque opération qui peut consommer un budget porte l'identifiant de son enveloppe. C'est la seule source du calcul : le « dépensé » d'une enveloppe est la somme, sur le mois en cours, des montants dépensés des opérations qui lui sont affectées. Une opération n'est jamais comptée deux fois.

| Enveloppes couvrant la catégorie | Affectation |
|---|---|
| Aucune | Pas d'enveloppe |
| Une | Affectée automatiquement |
| Plusieurs | Choix de l'utilisateur (pastilles en saisie, fenêtre pour un SMS), sinon la première |

Une enveloppe demandée qui ne couvre pas la catégorie est refusée.

### Réaffectation

Créer, modifier ou supprimer une enveloppe réaligne automatiquement les opérations du mois en cours :

- une opération garde son enveloppe si celle-ci couvre toujours sa catégorie ;
- sinon elle passe dans la première enveloppe qui la couvre, ou n'en a plus.

Les mois passés ne sont jamais réécrits.

### Écran Budgets

L'onglet Enveloppes affiche :
- le disponible du mois (somme des plafonds moins le dépensé) et le taux de consommation ;
- le reste dans les enveloppes essentielles et dans les enveloppes de confort ;
- chaque enveloppe avec sa progression ;
- les enveloppes sans plafond, à part.

### Alerte

Le tableau de bord affiche un bandeau pour l'enveloppe la plus consommée dès qu'elle atteint 65 % de son plafond.

## 8. Épargne : pots et objectifs

### Pots d'épargne

Un pot est rattaché à un compte et fonctionne selon l'un de deux modes :

| Mode | Signification | Effet d'un versement | Effet d'un déblocage |
|---|---|---|---|
| Gel virtuel (`VIRTUAL_LOCK`) | L'argent reste sur le compte, mais n'est plus compté comme disponible | Depuis le compte du pot : aucun mouvement. Depuis un autre compte : l'argent passe sur le compte du pot | Vers le compte du pot : aucun mouvement. Vers un autre compte : l'argent y est transféré |
| Épargne dédiée (`NATIVE`) | Livret ou épargne opérateur séparée du compte courant | L'argent quitte le compte source | L'argent arrive sur le compte de destination |

Un pot rattaché à un compte Espèces est toujours en gel virtuel.

### Objectifs

Un objectif (projet, liste d'envies) appartient à un pot. Il a un montant cible, une échéance facultative, une priorité et un statut (en cours, atteint, archivé). Verser vers un objectif alimente à la fois le pot et l'objectif. Le statut passe à « atteint » dès que la cible est atteinte.

### Contraintes

- On ne peut pas bloquer ni verser plus que le disponible du compte source.
- On ne peut pas débloquer d'un pot plus que sa part libre : l'argent réservé aux objectifs se débloque depuis l'objectif lui-même.
- La somme des objectifs d'un pot ne peut jamais dépasser le solde du pot.
- Un pot qui contient encore de l'argent ne peut pas être supprimé. Supprimer un objectif libère simplement sa réserve dans le pot.

## 9. Tableau de bord

De haut en bas :

1. **Salutation et date**, avec accès aux paramètres (toucher le nom) et aux notifications.
2. **Disponible**, avec le solde total et l'épargne bloquée.
3. **Mes comptes** : carrousel des comptes avec leur solde libre. Toucher un compte ouvre la correction de solde.
4. **Ce mois** :
   - *Dépensé* : total dépensé du mois (voir [section 4](#ce-qui-compte-comme-une-dépense)), pourcentage du budget total, et part des frais.
   - *Rythme journalier* : ce qu'on peut encore dépenser par jour jusqu'à la fin du mois. C'est le reste du budget (sans dépasser le disponible réel), divisé par les jours restants. Sans enveloppe, c'est le disponible divisé par les jours restants.
5. **Épargné ce mois** : versements d'épargne du mois comparés à l'objectif d'épargne mensuel défini dans les paramètres.
6. **Alerte d'enveloppe** (voir [section 7](#alerte)).
7. **Opérations récentes** : les 5 dernières, regroupées par jour.

## 10. Historique

L'historique liste toutes les opérations, regroupées par jour local (« Aujourd'hui », « Hier », puis la date), avec quatre filtres :

| Filtre | Contenu |
|---|---|
| Tous | Toutes les opérations |
| Dépenses | Débits vers des tiers (hors transferts internes et épargne) |
| Entrées | Revenus (hors transferts internes et déblocages d'épargne) |
| Transferts | Transferts entre ses comptes, retraits Cash Point, versements et déblocages d'épargne |

## 11. Paramètres, export et sauvegardes

L'écran Paramètres permet de :

- modifier le profil (nom, métier, ville) et les objectifs mensuels (revenu, épargne) ;
- gérer les catégories personnelles et les comptes (toucher le solde d'un compte ouvre la correction de solde) ;
- enregistrer une clé API Google Gemini, réservée aux fonctionnalités d'IA à venir. Elle n'est jamais renvoyée à l'application, qui sait seulement si une clé existe ;
- exporter toutes les données au format JSON (comptes, épargne, catégories, enveloppes, opérations, articles), sans aucun secret.

Côté serveur, la base est sauvegardée automatiquement :
- au démarrage, si la dernière sauvegarde a plus de 24 heures, puis toutes les 24 heures ;
- les 30 dernières copies sont conservées par défaut.

Les erreurs (refus du serveur, réseau indisponible) s'affichent toujours dans une notification. Une fenêtre de saisie reste ouverte si l'enregistrement échoue.

## 12. Calcul des frais Mobile Money

Les frais proposés à la saisie viennent de grilles tarifaires par tranche (`web/src/services/mvolaFeeCalculator.ts`) :

| Situation | Grille |
|---|---|
| Transfert MVola vers Espèces (retrait Cash Point) | Grille de retrait |
| Transfert MVola vers Orange Money ou Airtel Money | Grille interopérateur |
| Transfert Orange Money ou Airtel Money vers Espèces ou un autre opérateur | Mêmes grilles, par analogie |
| Transfert vers un compte bancaire ou personnalisé | Aucun frais |
| Dépense catégorie « Frais & Mobile Money » payée depuis un compte Mobile Money | Grille d'envoi MVola vers MVola |
| Autres dépenses | Aucun frais |

Pour les SMS, les frais ne sont pas calculés : ce sont ceux annoncés par l'opérateur.

## 13. Application installable

MyFinance est une application web progressive (PWA). Sur Android, Chrome propose « Installer l'application » ; sur iPhone, Safari permet « Sur l'écran d'accueil ». Elle s'ouvre alors en plein écran, sans barre d'adresse, avec sa propre icône.

- L'interface est mise en cache par un service worker : l'application s'ouvre instantanément, et se met à jour automatiquement à chaque nouvelle version.
- Les données ne sont **jamais** mises en cache : soldes et opérations viennent toujours du serveur. Hors ligne, l'application s'ouvre mais signale que le serveur est injoignable.

## 14. Feuille de route

Ces fonctionnalités sont prévues, mais pas encore construites :

- **Lecture des tickets de caisse** : photo d'un ticket, extraction des articles par IA, puis rapprochement avec le paiement correspondant. Le modèle de données est prêt : table `transaction_items`.
- **Saisie vocale** : dicter une dépense en français ou en malgache.
- **Assistant IA** : analyses et conseils à partir de l'historique, via la clé Gemini.
- **Notifications** : l'écran existe mais n'a encore aucune source (bilan mensuel, alertes).
- **Modification d'un compte** : changer le nom ou le numéro d'un compte existant.
- **Client mobile natif** avec capture des SMS intégrée, qui remplacerait MacroDroid.
