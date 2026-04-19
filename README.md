# Kasa Backend (API Express + SQLite)

Backend minimaliste pour l’application Kasa. Il expose une API REST (Express 5) documentée via OpenAPI, utilise SQLite pour le stockage des données, gère l’authentification par JWT et propose des fonctionnalités autour des biens (propriétés), des utilisateurs, des notes (ratings), des favoris, ainsi que l’upload et la suppression d’images.

## Sommaire

- Présentation
- Prérequis
- Installation & démarrage
- Configuration (variables d’environnement)
- Base de données & données de démo
- Documentation API (OpenAPI)
- Authentification & rôles
- Routes principales
- Upload & suppression d’images
- Exemples rapides (curl)
- Dépannage (FAQ)

---

## Présentation

Ce projet fournit une API HTTP permettant de :

- Lister, créer, modifier, supprimer des propriétés (biens) et consulter leur détail.
- Gérer des utilisateurs et leurs informations publiques.
- Ajouter des notes (ratings) sur les propriétés.
- Gérer des favoris (properties préférées) par utilisateur connecté.
- Envoyer des images et récupérer une URL publique; supprimer une ou plusieurs images et nettoyer leurs références en base.

Le serveur est écrit avec Express 5 et persiste les données dans un fichier SQLite. Les routes sont sécurisées par des middlewares d’authentification/autorisation basés sur JWT.

## Prérequis

- Node.js 18+ (recommandé)
- npm

## Installation & démarrage

1. Installer les dépendances:
   - npm install
2. Lancer le serveur:
   - npm start
3. Le serveur écoute par défaut sur http://localhost:3000 (configurable via PORT).

## Configuration (variables d’environnement)

- PORT: port d’écoute HTTP (par défaut 3000).
- JWT_SECRET: secret pour signer/vérifier les tokens JWT (par défaut "change-me-in-prod"). En production, définissez une valeur forte et secrète.

Vous pouvez lancer le serveur avec, par exemple:

- JWT_SECRET="votre-secret" PORT=3000 npm start

## Base de données & données de démo

- SGBD: SQLite, fichier: data/kasa.sqlite3
- À l’initialisation, le schéma est créé automatiquement. Si aucune propriété n’existe, un seed est effectué depuis data/properties.json (si présent).
- Le schéma inclut: users, properties, property_pictures, property_equipments, property_tags, ratings, favorites.
- Les slugs des propriétés sont générés automatiquement et uniques.

Sauvegarde: le fichier SQLite (data/kasa.sqlite3) est persistant. Pour repartir de zéro, stoppez le serveur et supprimez ce fichier (et relancez pour recréer/seed).

## Documentation API (OpenAPI)

- Spécification: public/openapi.json
- UI de test/exploration: http://localhost:3000/docs.html (après démarrage)

Les endpoints sont groupés par tags: Auth, Properties, Users, Ratings, Favorites, Uploads. Les schémas de requête/réponse sont détaillés dans la spec.

## Authentification & rôles

- Authentification: JWT via l’en-tête Authorization: Bearer <token>.
- Secret: JWT_SECRET
- Rôles supportés: client, owner, admin.
  - Certaines routes nécessitent d’être connecté (requireAuth).
  - D’autres nécessitent un rôle spécifique, par ex. owner ou admin pour créer/mettre à jour/supprimer des propriétés, ou pour les uploads.
  - Certaines routes autorisent self-or-admin (ex: consulter/mettre à jour son propre profil ou administrateur).

Endpoints d’auth principaux (voir OpenAPI pour le détail):

- POST /auth/register: inscription email/mot de passe (role facultatif: client/owner; défaut: client)
- POST /auth/login: authentification, retourne un token JWT
- POST /auth/request-reset, POST /auth/reset-password: flux de réinitialisation de mot de passe (pour développement, le token peut être renvoyé dans la réponse lorsque ce n’est pas en production).

## Routes principales (aperçu)

Base: /api

- GET /api/properties: liste des propriétés
- GET /api/properties/:id: détail d’une propriété
- POST /api/properties: création (rôle: owner ou admin)
- PATCH /api/properties/:id: mise à jour (rôle: owner ou admin)
- DELETE /api/properties/:id: suppression (rôle: owner ou admin)

- GET /api/users: liste (admin)
- GET /api/users/:id: détail (self ou admin)
- POST /api/users: création (admin)
- PATCH /api/users/:id: mise à jour (self ou admin; seul admin peut définir role=admin)

- GET /api/properties/:id/ratings: lister les notes d’une propriété
- POST /api/properties/:id/ratings: ajouter une note

- POST /api/properties/:id/favorite: ajouter aux favoris (utilisateur connecté)
- DELETE /api/properties/:id/favorite: retirer des favoris (utilisateur connecté)
- GET /api/users/:id/favorites: lister les favoris d’un utilisateur (self ou admin)

- POST /api/uploads/image: uploader une image (rôle: owner ou admin). Répond avec une URL publique /uploads/... et des instructions pour l’utiliser (cover, gallery, etc.).
- DELETE /api/uploads/images: supprimer une ou plusieurs images (rôle: owner ou admin). Accepte des noms de fichiers ou des URLs; nettoie les références en base.

## Upload & suppression d’images

- Dossier public: public/uploads (servi statiquement par Express)
- Upload (multipart/form-data): champ file obligatoire. Champs optionnels: purpose (property-cover | property-picture | user-picture | other), property_id (validation d’existence).
- Réponse: url, filename, size, mimetype, purpose, instructions pour l’usage suivant.
- Suppression: DELETE /api/uploads/images accepte dans le body JSON filename, filenames[], url, urls[] (ou équivalents en query). Sécurisé contre la traversée de chemins.

## Exemples rapides (curl)

Authentification (login):

- curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"alice@example.com","password":"secret123"}'

Uploader une image (nécessite un token et un rôle owner/admin):

- curl -s -X POST http://localhost:3000/api/uploads/image \
  -H "Authorization: Bearer $TOKEN" \
  -F file=@/chemin/vers/image.jpg \
  -F purpose=property-cover \
  -F property_id=chez-alice

Supprimer des images (par URL):

- curl -s -X DELETE http://localhost:3000/api/uploads/images \
  -H 'Authorization: Bearer $TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"urls":["/uploads/1692971234-a1b2c3d4.jpg","/uploads/1692971299-ffeedd.png"]}'

Créer une propriété (owner/admin):

- curl -s -X POST http://localhost:3000/api/properties \
  -H 'Authorization: Bearer $TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Charmant Studio","host_id":1,"price_per_night":95}'

## Dépannage (FAQ)

- 401 authentication required: ajoutez l’en-tête Authorization: Bearer <token> (obtenu via /auth/login).
- 403 insufficient role / forbidden: l’utilisateur connecté n’a pas le rôle requis (owner/admin) ou n’est pas autorisé sur la ressource (self-or-admin requis).
- 409 duplicate/UNIQUE: tentative de création d’un enregistrement avec un id/valeur unique déjà existant.
- Upload non disponible: assurez-vous que la dépendance multer est installée (elle l’est par défaut via package.json) et que vous envoyez bien un champ file.
- Port déjà utilisé: changez PORT ou libérez le port.
- Repartir de zéro: stoppez le serveur, supprimez data/kasa.sqlite3, relancez (recréation du schéma et seed depuis data/properties.json si disponible).

---

## Déploiement (Podman + HTTPS)

### Prérequis serveur

- Debian 13 (ou équivalent)
- Podman 4.4+
- podman-compose (`sudo apt install podman-compose`)
- Un nom de domaine pointant vers l'IP du serveur (enregistrement DNS A configuré)

### Architecture

```
Internet → nginx (80/443) → proxy → kasa-api (3000, interne)
                 ↕
           certbot (renouvellement Let's Encrypt automatique toutes les 12h)
```

### Fichiers concernés

| Fichier                                 | Rôle                                                |
| --------------------------------------- | --------------------------------------------------- |
| `Dockerfile`                            | Image Node 22 Alpine de l'API                       |
| `docker-compose.yml`                    | Stack complète : api + nginx + certbot              |
| `nginx/templates/default.conf.template` | Config nginx HTTP→HTTPS + proxy                     |
| `scripts/setup-env.js`                  | Génère `.env` avec JWT_SECRET aléatoire             |
| `scripts/init-letsencrypt.sh`           | Bootstrap certificat Let's Encrypt (une seule fois) |
| `scripts/kasa.service`                  | Unit systemd pour démarrage automatique             |

---

### 1. Préparer le serveur

```bash
# Cloner le projet
git clone <url-du-repo> /opt/kasa
cd /opt/kasa

# Générer le fichier .env
node scripts/setup-env.js
```

Éditer `.env` et renseigner **obligatoirement** :

```env
DOMAIN=api.votre-domaine.com
LETSENCRYPT_EMAIL=votre-email@exemple.com
JWT_SECRET=<valeur générée automatiquement — ne pas changer>
```

---

### 2. Obtenir le certificat HTTPS et démarrer (première fois)

> Le DNS doit déjà pointer vers le serveur avant cette étape.

```bash
bash scripts/init-letsencrypt.sh
```

Ce script :

1. Crée un certificat auto-signé temporaire pour démarrer nginx
2. Démarre nginx
3. Lance certbot pour obtenir le vrai certificat via ACME HTTP-01
4. Recharge nginx avec le certificat réel
5. Démarre toute la stack

---

### 3. Démarrage automatique avec systemd

```bash
# Copier l'unit systemd
sudo cp scripts/kasa.service /etc/systemd/system/kasa.service

# Adapter le chemin si le projet n'est pas dans /opt/kasa
sudo nano /etc/systemd/system/kasa.service

# Activer et démarrer
sudo systemctl daemon-reload
sudo systemctl enable kasa.service
sudo systemctl start kasa.service

# Vérifier l'état
sudo systemctl status kasa.service

# Suivre les logs en temps réel
sudo journalctl -u kasa.service -f
```

Commandes de gestion :

```bash
sudo systemctl stop kasa      # arrêter
sudo systemctl restart kasa   # redémarrer
sudo systemctl reload kasa    # redémarrer sans downtime
sudo systemctl disable kasa   # désactiver au démarrage
```

---

### 4. Renouvellement des certificats

Le renouvellement est **automatique** : le conteneur `certbot` tente `certbot renew` toutes les 12 heures. Nginx doit être rechargé après renouvellement. Pour forcer manuellement :

```bash
podman compose run --rm certbot renew
podman compose exec nginx nginx -s reload
```

---

### 5. Mise à jour de l'application

```bash
cd /opt/kasa
git pull
podman compose build
sudo systemctl restart kasa
```

---

### 6. Accès à la base de données

La base SQLite et les uploads sont montés en bind mount dans le dossier du projet :

- Base de données : `./data/kasa.sqlite3`
- Fichiers uploadés : `./public/uploads/`

Consulter la base en CLI :

```bash
sqlite3 data/kasa.sqlite3
.tables
.headers on
.mode column
SELECT id, name, email, role FROM users;
```

---

### Comptes utilisateurs de démo

Lors du premier démarrage, les propriétaires issus de `data/properties.json` sont créés automatiquement avec :

- **Email** : `prenom.nom@kasa.fr` (généré depuis le nom de l'hôte)
- **Mot de passe** : valeur de `SEED_DEFAULT_PASSWORD` dans `.env` (par défaut `Kasa@2026!`)

Pour créer un compte admin manuellement :

```bash
curl -X POST https://api.votre-domaine.com/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","email":"admin@votre-domaine.com","password":"MotDePasseFort!","role":"owner"}'
```
