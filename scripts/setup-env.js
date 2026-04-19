#!/usr/bin/env node
/**
 * Génère un fichier .env avec des valeurs par défaut si celui-ci n'existe pas encore.
 * Ne modifie rien si .env est déjà présent.
 * Usage : node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_PATH = path.join(__dirname, '..', '.env');

if (fs.existsSync(ENV_PATH)) {
  console.log('[setup-env] .env already exists, skipping.');
  process.exit(0);
}

const jwtSecret = crypto.randomBytes(48).toString('hex');

const content = `# Généré automatiquement par scripts/setup-env.js
# Modifiez ces valeurs selon votre environnement.

PORT=3000

# Secret JWT — NE PAS PARTAGER, NE PAS COMMITER
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# Mot de passe par défaut injecté lors du seed (optionnel)
SEED_DEFAULT_PASSWORD=Kasa@2026!
`;

fs.writeFileSync(ENV_PATH, content, 'utf-8');
console.log('[setup-env] .env created with a random JWT_SECRET.');
