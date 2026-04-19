#!/bin/bash
# =============================================================================
# init-letsencrypt.sh — À lancer UNE SEULE FOIS sur le serveur de production
# avant de démarrer la stack pour la première fois.
#
# Usage : bash scripts/init-letsencrypt.sh
# =============================================================================
set -euo pipefail

COMPOSE_CMD="podman compose"

# --- Charger .env ------------------------------------------------------------
if [ -f .env ]; then
  set -o allexport; source .env; set +o allexport
else
  echo "[init] Erreur : fichier .env introuvable. Lancez d'abord : node scripts/setup-env.js"
  exit 1
fi

DOMAIN=${DOMAIN:?"Définissez DOMAIN dans .env (ex: api.monsite.com)"}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:?"Définissez LETSENCRYPT_EMAIL dans .env"}

echo "[init] Domaine : ${DOMAIN}"
echo "[init] Email   : ${LETSENCRYPT_EMAIL}"

# --- Vérifier si le certificat existe déjà ----------------------------------
if $COMPOSE_CMD run --rm certbot test -d "/etc/letsencrypt/live/${DOMAIN}" 2>/dev/null; then
  echo "[init] Certificat déjà présent pour ${DOMAIN}. Démarrage normal..."
  $COMPOSE_CMD up --detach
  exit 0
fi

# --- Créer un certificat auto-signé temporaire pour démarrer nginx ----------
echo "[init] Création d'un certificat temporaire (auto-signé)..."
$COMPOSE_CMD run --rm --entrypoint="" certbot sh -c "
  apk add --quiet openssl 2>/dev/null || true
  mkdir -p /etc/letsencrypt/live/${DOMAIN}
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/${DOMAIN}/privkey.pem' \
    -out    '/etc/letsencrypt/live/${DOMAIN}/fullchain.pem' \
    -subj   '/CN=localhost' 2>/dev/null
"

# --- Démarrer nginx avec le certificat temporaire ---------------------------
echo "[init] Démarrage de nginx..."
$COMPOSE_CMD up --detach nginx
sleep 3

# --- Obtenir le vrai certificat via ACME HTTP-01 ----------------------------
echo "[init] Obtention du certificat Let's Encrypt pour ${DOMAIN}..."
$COMPOSE_CMD run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "${LETSENCRYPT_EMAIL}" \
  --agree-tos --no-eff-email \
  -d "${DOMAIN}"

# --- Recharger nginx avec le vrai certificat --------------------------------
echo "[init] Rechargement de nginx avec le certificat réel..."
$COMPOSE_CMD exec nginx nginx -s reload

# --- Démarrer toute la stack ------------------------------------------------
echo "[init] Démarrage de la stack complète..."
$COMPOSE_CMD up --detach

echo ""
echo "[init] ✓ Terminé ! L'API est accessible sur https://${DOMAIN}"
