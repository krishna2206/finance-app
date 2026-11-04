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
12. [Journal d'activité et écarts de solde](#12-journal-dactivité-et-écarts-de-solde)
13. [Envois et frais Mobile Money](#13-envois-et-frais-mobile-money)
14. [Application installable](#14-application-installable)
15. [Feuille de route](#15-feuille-de-route)

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
- Un motif facultatif peut être saisi (par exemple « recomptage des espèces »). La correction, son motif et son écart sont notés dans le [journal d'activité](#12-journal-dactivité-et-écarts-de-solde).
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
| Transfert | Débite le compte source (montant + frais), crédite le compte destination (montant) | Imposée : « Frais bancaires & Mobile Money » (seuls les frais sont une dépense) |

La saisie propose aussi un titre, une date et une heure (sélecteur), et une note.

La saisie se souvient de ce qui revient d'une fois sur l'autre :

- **Mode, compte et catégorie** : le dernier mode utilisé est rouvert ; pour chaque mode, le dernier compte et la dernière catégorie sont proposés (conservés sur l'appareil). Chaque mode a sa propre catégorie : une catégorie de revenu n'est jamais proposée pour une dépense.
- **Date** : par défaut, « Maintenant », c'est-à-dire l'heure réelle de l'enregistrement. Une date choisie à la main (par exemple « Hier, 19:30 ») est reprise pour les saisies suivantes, ce qui permet d'enchaîner les dépenses d'une même journée. Le bouton « Maintenant » revient à l'heure actuelle, et la date redevient « Maintenant » d'elle-même après 30 minutes sans saisie.

Quand une grille tarifaire s'applique (envoi Mobile Money, transfert, retrait), les frais sont proposés automatiquement et restent modifiables (voir [section 13](#13-envois-et-frais-mobile-money)).

Quand la catégorie choisie est couverte par plusieurs enveloppes, des pastilles « Financer depuis l'enveloppe » apparaissent, avec la première enveloppe présélectionnée.

### Fiche détail

Toucher une opération ouvre sa fiche détail. On y trouve :

- **Catégorie** : modifiable. L'enveloppe est alors recalculée : elle est conservée si elle couvre la nouvelle catégorie, sinon la première enveloppe qui la couvre est choisie.
- **Enveloppe** : affichée quand l'opération en a une, et modifiable seulement si plusieurs enveloppes couvrent sa catégorie. Il n'existe pas d'option « hors budget ».
- **Compte, date et heure, note, articles** (si présents).
- **Modification** (bouton crayon) : voir ci-dessous.
- **Suppression** : elle annule exactement les effets de l'opération sur les soldes des comptes, des pots d'épargne et des objectifs.

### Modification d'une opération

Le bouton crayon de la fiche détail ouvre le même formulaire que la saisie rapide, prérempli avec l'opération. Tout y est modifiable :

- le mode (Dépense, Entrée, Transfert) ;
- le montant et les frais (saisis directement ; quand la grille tarifaire donne un autre montant, un bouton « Grille » le propose) ;
- le compte et le compte de destination ;
- la date et l'heure ;
- la catégorie et l'enveloppe ;
- le titre et la note.

Règles :

- **Soldes** : l'ancienne version est annulée puis la nouvelle appliquée, dans une seule transaction. Les soldes restent exacts, et une modification refusée ne change rien.
- **Changement de mode** : le compte de l'opération est conservé ; la catégorie passe à la dernière utilisée dans le nouveau mode. Une entrée n'a ni frais ni compte de destination.
- **Enveloppe** : conservée si elle couvre toujours la catégorie, sinon recalculée selon les règles habituelles.
- **Opérations d'épargne** : seuls le montant, le compte (source d'un versement, destination d'un déblocage), la date, le libellé et la note se modifient. Le pot, l'objectif et le sens restent fixes, et les plafonds habituels s'appliquent (disponible du compte, montant libre du pot ou de l'objectif).
- **Opérations reçues par SMS** : modifiables, elles gardent leur référence opérateur (un SMS reçu une seconde fois reste reconnu comme doublon). Au prochain SMS, le solde annoncé par l'opérateur reste la référence.
- **Journal** : chaque modification est notée avec l'avant, l'après et les soldes touchés.

La modification ne change pas les préférences mémorisées de la saisie rapide (mode, comptes, catégories, date).

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
| « 20 % de vos frais de transfert soit … Ar vous ont été remboursés … » | Aucune opération | Remboursement App MVola d'un transfert récent (voir [section 13](#13-envois-et-frais-mobile-money)) |

Pour un envoi à un tiers, l'opérateur du destinataire est déduit du préfixe de son numéro (034 et 038 MVola, 032 et 037 Orange, 033 Airtel).

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
| Achat de crédit | Factures & charges |
| Paiement marchand | Courses |
| Retrait Cash Point | Frais bancaires & Mobile Money (transfert vers Espèces) |
| Envoi vers un de ses propres comptes | Frais bancaires & Mobile Money (transfert interne) |
| Envoi à un tiers | Envois d'argent |
| Salaire | Salaire |
| Argent reçu | Virements reçus |

### Choix de l'enveloppe

Si la catégorie du SMS est couverte par plusieurs enveloppes, l'opération est d'abord rangée dans la première, puis une fenêtre « Choisir l'enveloppe » s'ouvre dans l'application. Pour chaque enveloppe, elle affiche le reste du mois ou le dépassement. Un toucher affecte l'enveloppe. Fermer la fenêtre conserve le choix par défaut.

### Notification

Chaque SMS enregistré affiche une notification dans l'application : « SMS MVola intercepté », avec le montant signé, le titre et la note.

## 6. Catégories

22 catégories système sont toujours présentes, rangées en groupes. Elles ne peuvent être ni supprimées, ni modifiées :

| Groupe | Catégories |
|---|---|
| Essentiels | Logement, Factures & charges, Courses, Transport, Santé |
| Vie courante | Repas & sorties, Maison & hygiène, Soins personnels, Shopping, Loisirs |
| Engagements | Famille & dons, Abonnements & numérique, Éducation & travail |
| Argent | Frais bancaires & Mobile Money, Envois d'argent, Divers |
| Revenus | Salaire, Primes & bonus, Revenus annexes, Virements reçus, Remboursements, Autres revenus |

Les sélecteurs (saisie, fiche détail, enveloppes) et la liste de Paramètres affichent les catégories par groupe.

On peut créer ses propres catégories (nom, type, groupe pour une dépense, couleur, icône). Une catégorie personnelle ne peut être supprimée que si aucune opération ne l'utilise.

Règles :

| Opération | Catégorie |
|---|---|
| Dépense | Obligatoire, parmi les catégories de dépense |
| Entrée | Obligatoire, parmi les catégories de revenu |
| Transfert entre ses comptes (dont retrait Cash Point) | Imposée par le serveur : Frais bancaires & Mobile Money, quelle que soit la demande. Elle n'est pas modifiable dans la fiche |
| Versement ou déblocage d'épargne | Aucune |

Dans l'historique, un transfert se reconnaît à son type (icône et libellé « Retrait » ou « Transfert entre comptes »), pas à sa catégorie.

**Ancienne liste** (avant novembre 2026) : « Outils & Business » a rejoint « Abonnements & numérique », « Retrait d'espèces » a rejoint « Frais bancaires & Mobile Money ». Les autres catégories ont été renommées sans changer d'identifiant (par exemple « Alimentation & Courses » est devenue « Courses »). La migration est notée dans le journal d'activité.

## 7. Enveloppes de budget

Une enveloppe est un plafond mensuel qui couvre une ou plusieurs catégories de dépense. Elle a un nom, un plafond, une couleur et une icône, et peut être marquée **essentielle** (besoin vital) ou **fixe** (montant identique chaque mois).

Une même catégorie peut appartenir à plusieurs enveloppes, par exemple « Courses » dans « Nourriture » et dans « Sorties ».

### Plafonds mois par mois

Le plafond d'une enveloppe est conservé pour chaque mois :

- un changement de plafond s'applique au mois en cours et aux suivants ;
- le bilan d'un mois passé utilise le plafond de ce mois-là ;
- changer plusieurs fois le plafond dans le même mois remplace simplement celui du mois ;
- une enveloppe n'apparaît pas dans les bilans des mois antérieurs à sa création.

### Suppression et archivage

- Une enveloppe qui n'a jamais servi est supprimée.
- Une enveloppe qui a déjà des opérations est **archivée** : elle disparaît du mois en cours et des suivants (les opérations du mois sont réaffectées selon les règles habituelles), mais reste, avec son plafond et son dépensé, dans les bilans des mois passés. Une enveloppe archivée ne se modifie plus.

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

### Comparaison avec le mois précédent

À date égale, c'est-à-dire du 1er au même jour du mois (ou au dernier jour d'un mois précédent plus court), en heure locale :

- **Total** : sous le disponible, « Dépensé au total ce mois : A Ar, contre B Ar au 4 oct. (+C Ar) ». Il compte toutes les dépenses (frais nets, seuls les frais des transferts), avec ou sans enveloppe : il fonctionne dès le premier mois.
- **Par enveloppe** : « Au 4 oct. : B Ar · +C Ar ce mois-ci ». Affiché seulement pour une enveloppe qui existait pendant tout le mois précédent (créée avant lui, ou le 1er de ce mois) : la première comparaison d'une nouvelle enveloppe arrive donc au deuxième mois complet.

Le calcul est dans `shared/src/comparison.ts`.

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

1. **Salutation et date**, avec accès aux paramètres (toucher le nom) et aux bilans des mois (bouton graphique).
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

### Bilans des mois et suivi des économies

Le bouton graphique de l'en-tête du tableau de bord ouvre « Bilans » : un résumé par mois, du plus récent au plus ancien (les 12 derniers mois qui ont des opérations, et le mois en cours) :

- **Cumul des économies** : en tête d'écran, le total net économisé sur les enveloppes depuis le premier mois clôturé (somme des restes sous plafond moins les dépassements), au global et par enveloppe.
- **Synthèse par mois** : revenus, dépenses, épargne versée, flux net (revenus moins dépenses), nombre d'enveloppes respectées et dépassées, économie nette, et total des écarts de solde du mois (voir [section 12](#12-journal-dactivité-et-écarts-de-solde)).
- **Clôture automatique tracée** : chaque mois écoulé est automatiquement clôturé dans le journal d'activité (`MONTH_CLOSED`), avec le bilan figé de chaque enveloppe. Si une opération d'un mois passé est modifiée ultérieurement, l'écart avec la clôture (`changedBy`) est signalé explicitement.
- **Détail d'un mois** : toucher un mois affiche chaque enveloppe avec son plafond de ce mois-là, son dépensé, et l'économie (« restants » pour le mois en cours) ou le dépassement. Pour un mois écoulé ayant une économie nette positive, un bouton permet de **« Mettre l'économie de côté »** : il ouvre directement l'enregistrement d'un versement vers un pot d'épargne (par exemple le Fonds d'urgence) prérempli avec le montant économisé. Les enveloppes archivées apparaissent dans les mois où elles existaient.

## 11. Paramètres, export et sauvegardes

L'écran Paramètres permet de :

- modifier le profil (nom, métier, ville) et les objectifs mensuels (revenu, épargne) ;
- gérer les catégories personnelles et les comptes (toucher le solde d'un compte ouvre la correction de solde) ;
- consulter le journal d'activité et les écarts de solde (section « Suivi ») ;
- enregistrer une clé API Google Gemini, réservée aux fonctionnalités d'IA à venir. Elle n'est jamais renvoyée à l'application, qui sait seulement si une clé existe ;
- exporter toutes les données au format JSON (comptes, épargne, catégories, enveloppes, opérations, articles, journal d'activité), sans aucun secret.

Côté serveur, la base est sauvegardée automatiquement :
- au démarrage, si la dernière sauvegarde a plus de 24 heures, puis toutes les 24 heures ;
- les 30 dernières copies sont conservées par défaut.

Les erreurs (refus du serveur, réseau indisponible) s'affichent toujours dans une notification. Une fenêtre de saisie reste ouverte si l'enregistrement échoue.

## 12. Journal d'activité et écarts de solde

### Ce qui est noté

Toute action qui modifie des données est notée dans un journal, avec son origine : **App** (saisie dans l'application), **SMS** (webhook) ou **Système**.

| Domaine | Événements |
|---|---|
| Opérations | Ajout, modification, suppression |
| Soldes | Correction manuelle ; recalage par un SMS (avec l'écart) ; confirmation du solde par un SMS |
| SMS | Doublon ignoré, SMS arrivé en retard (solde non recalé), SMS non reconnu (avec son texte, pour améliorer l'analyse) |
| Comptes | Création, initialisation, suppression |
| Épargne | Pot et objectif créés, modifiés ou supprimés. Les versements et déblocages sont des opérations |
| Budgets et catégories | Création, modification, suppression, réaffectations automatiques des opérations du mois |
| Réglages | Profil et objectifs. La clé Gemini est notée « clé enregistrée » ou « clé effacée », jamais sa valeur |
| Système | Démarrage du journal, avec la photo des soldes à ce moment |

Chaque entrée garde une phrase lisible, l'état de l'objet avant et après, et, pour chaque compte touché, le solde avant et après.

**Garanties** :
- l'entrée est écrite dans la même transaction que le changement : si l'action échoue, rien n'est noté ;
- le journal ne se modifie pas et ne s'efface pas : aucune route ne le permet ;
- il fait partie de l'export JSON et des sauvegardes.

### Écarts de solde

Un écart est la différence entre le solde réel et le solde calculé par l'app. C'est le signal d'une opération oubliée ou mal saisie.

- **Recalage par SMS** : écart = solde annoncé par l'opérateur moins solde calculé (solde d'avant plus effet de l'opération). Un écart nul confirme que tout a été saisi depuis le SMS précédent.
- **Correction manuelle** : écart = nouveau solde moins ancien solde.
- Un SMS arrivé en retard ne recale pas le solde et n'a donc pas d'écart.

### Écrans

Les deux écrans sont dans Paramètres, section « Suivi » :

- **Journal d'activité** : liste du plus récent au plus ancien, groupée par jour, avec filtres (Tout, Opérations, Soldes, SMS, Comptes & épargne, Budgets & catégories, Réglages) et filtre par compte. Toucher une ligne ouvre le détail : changements champ par champ, soldes des comptes avant et après, écart et motif.
- **Écarts de solde** : pour chaque compte, le total des écarts du mois et la liste des écarts, avec la date du point de contrôle précédent (« Une dépense oubliée depuis le 12 nov. ? »).

## 13. Envois et frais Mobile Money

### Saisie d'une dépense depuis un compte Mobile Money

En mode Dépense, quand le moyen de paiement est un compte MVola, Orange Money ou Airtel Money, une ligne **« Type de paiement »** apparaît :

| Choix | Frais | Type d'opération |
|---|---|---|
| Paiement marchand | Aucun | `MERCHANT_PAYMENT` |
| Envoi vers un numéro | Selon la grille de l'opérateur | `TRANSFER_P2P`, sans compte de destination |
| Achat de crédit | Aucun | `TOPUP_AIRTIME` |
| Carte Visa | 1 000 Ar fixes par transaction pour Orange (carte Akory) et MVola ; à saisir pour Airtel | `CARD_PAYMENT` |

Pour un **envoi vers un numéro**, aucun numéro n'est demandé :

- **Opérateur du destinataire** : trois pastilles (MVola, Orange Money, Airtel Money). Il est enregistré avec l'opération (`counterparty_operator`).
- **Canal d'envoi** : pour MVola vers MVola (App MVola ou #111#) et Orange vers Orange (Max it ou #144#). Max it coûte la moitié de #144# ; l'App MVola rembourse une partie des frais. Par défaut : #111# pour MVola, Max it pour Orange, puis le dernier canal choisi pour le compte.
- **Catégorie** : Envois d'argent quand on choisit ce type (Factures & charges pour un achat de crédit), puis librement modifiable.
- **Mémorisation** : le type de paiement, l'opérateur du destinataire et le canal sont retenus pour chaque compte de paiement. Un envoi répété ne demande que le montant.

Un compte Espèces ou bancaire n'affiche pas ces choix : la dépense reste une dépense générale.

### Frais et remboursement

- **Frais** : calculés selon le couple (opérateur source, opérateur destinataire) et le canal, affichés à part du montant avec la grille utilisée et sa date. Ils restent **modifiables** (promotion, frais gratuits, nouveau tarif) ; le bouton « Grille » revient au montant de la grille.
- **Remboursement App MVola** : pour un envoi de MVola vers MVola fait depuis l'App MVola, une part des frais est remboursée (20 % par défaut, réglable dans Paramètres), arrondie à l'ariary inférieur. Le remboursement est modifiable. Exemple : « Frais 150 Ar, dont 30 Ar remboursés par l'App MVola · Total débité : 5 270 Ar ».
- **Comptabilité** : le compte est débité du montant, plus les frais, moins le remboursement. Le « Dépensé ce mois », les enveloppes et les statistiques utilisent toujours les frais nets ; le remboursement n'est jamais compté comme un revenu.

### Inclure les frais de retrait

Une case « Inclure les frais de retrait », **décochée à chaque nouvelle saisie**, est proposée pour tout envoi Mobile Money : envoi à un tiers, ou transfert entre ses comptes Mobile Money. Elle n'apparaît pas pour un retrait Cash Point, ni pour un transfert vers Espèces ou vers une banque.

Le montant saisi est alors ce qui doit arriver en main après le retrait. L'app ajoute les frais de retrait selon la grille de l'opérateur du destinataire (calculés sur le montant réellement retiré), puis calcule les frais de transfert sur le montant envoyé, et enfin le remboursement App MVola s'il s'applique :

| Élément | Montant |
|---|---|
| À recevoir en main | 22 000 |
| Frais de retrait MVola, tranche 20 001 à 25 000 Ar | 650 |
| Montant envoyé | 22 650 |
| Frais de transfert de MVola vers MVola | 250 |
| Remboursement App MVola (20 %) | −50 |
| **Total débité** | **22 850** |

- **Envoi à un tiers** : le montant enregistré est ce que la personne reçoit en main (22 000) ; les frais regroupent transfert et retrait (900), dont la part retrait est conservée (`withdrawal_fee_covered`, 650) et affichée dans la fiche.
- **Transfert entre ses comptes** : le montant transféré inclut les frais de retrait (22 650 arrivent sur le compte de destination) ; seuls les frais de transfert comptent comme dépense. Les frais de retrait seront comptés au retrait, sans double comptage.
- La grille de retrait Airtel est inconnue : pour un destinataire Airtel, les frais de retrait se saisissent à la main.

### Grilles tarifaires

Les grilles sont dans `shared/src/fees.ts`, avec leur source et leur date, et sont utilisées par l'application et le serveur.

| Opérateur | Source | Date | Grilles |
|---|---|---|---|
| MVola | mvola.mg/tarifs | 17/02/2025 | Vers MVola, vers un autre opérateur, vers un non-abonné, retrait |
| Orange Money | PDF officiel orange.mg | 01/02/2025 | Vers Orange par #144#, par Max it (moitié prix), vers un autre opérateur, IzyCash, retrait |
| Airtel Money | airtel.mg, « Les Tarifs Airtel Money » | Non indiquée | Vers Airtel, vers un autre opérateur. Retrait et carte inconnus |
| Cartes Visa (Akory, MVola) | Frais constatés par l'utilisateur | Novembre 2026 | 1 000 Ar fixes par transaction |

Règles :
- un envoi vers un autre réseau est facturé selon la grille « vers un autre réseau » de l'opérateur **émetteur** ;
- un retrait Cash Point (transfert vers Espèces) utilise la grille de retrait de l'opérateur du compte ;
- un transfert vers un compte bancaire ou personnalisé n'a pas de frais ;
- au-delà du dernier palier d'une grille, ou sans grille, aucun frais n'est proposé : on les saisit à la main.

Pour les SMS, les frais ne sont pas calculés : ce sont ceux annoncés par l'opérateur.

### SMS de remboursement App MVola

« 20 % de vos frais de transfert soit 30 Ar vous ont ete rembourses grace a votre derniere utilisation de l'App MVola. Ref : … »

Ce SMS ne crée pas d'opération. Il renseigne le remboursement du dernier transfert MVola vers MVola des trois derniers jours, avec frais et sans remboursement, dont le pourcentage annoncé des frais donne exactement le montant annoncé. Le même SMS (même référence) n'est appliqué qu'une fois. Sans transfert correspondant, il est seulement noté dans le journal d'activité.

## 14. Application installable

MyFinance est une application web progressive (PWA). Sur Android, Chrome propose « Installer l'application » ; sur iPhone, Safari permet « Sur l'écran d'accueil ». Elle s'ouvre alors en plein écran, sans barre d'adresse, avec sa propre icône.

- L'interface est mise en cache par un service worker : l'application s'ouvre instantanément, et se met à jour automatiquement à chaque nouvelle version.
- Les données ne sont **jamais** mises en cache : soldes et opérations viennent toujours du serveur. Hors ligne, l'application s'ouvre mais signale que le serveur est injoignable.

## 15. Feuille de route

Ces fonctionnalités sont prévues, mais pas encore construites :

- **Lecture des tickets de caisse** : photo d'un ticket, extraction des articles par IA, puis rapprochement avec le paiement correspondant. Le modèle de données est prêt : table `transaction_items`.
- **Saisie vocale** : dicter une dépense en français ou en malgache.
- **Assistant IA** : analyses et conseils à partir de l'historique, via la clé Gemini.
- **Modification d'un compte** : changer le nom ou le numéro d'un compte existant.
- **Client mobile natif** avec capture des SMS intégrée, qui remplacerait MacroDroid.
