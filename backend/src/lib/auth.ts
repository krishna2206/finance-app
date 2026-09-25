import { createMiddleware } from 'hono/factory';
import { timingSafeEqual } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { DB_PATH } from '../db/index';

const TOKEN_FILE = path.join(path.dirname(path.resolve(DB_PATH === ':memory:' ? '.' : DB_PATH)), '.access-token');

let cachedToken: string | null = null;

/**
 * Jeton d'accès à l'API : variable APP_ACCESS_TOKEN, sinon jeton généré au premier démarrage
 * et conservé dans un fichier local (jamais versionné).
 */
export function getAccessToken(): string {
  if (cachedToken) return cachedToken;

  const fromEnv = process.env.APP_ACCESS_TOKEN?.trim();
  if (fromEnv) {
    cachedToken = fromEnv;
  } else if (existsSync(TOKEN_FILE)) {
    cachedToken = readFileSync(TOKEN_FILE, 'utf8').trim();
  } else {
    cachedToken = crypto.randomUUID().replace(/-/g, '');
    writeFileSync(TOKEN_FILE, `${cachedToken}\n`, { mode: 0o600 });
  }
  return cachedToken;
}

export function getAccessTokenLocation(): string {
  return process.env.APP_ACCESS_TOKEN ? 'variable APP_ACCESS_TOKEN' : TOKEN_FILE;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Accepte le jeton via `Authorization: Bearer <jeton>`, l'en-tête `X-Access-Token`,
 * ou le paramètre `?token=` (nécessaire pour EventSource et pratique pour MacroDroid).
 */
export const requireAccessToken = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization');
  const provided = (header?.startsWith('Bearer ') ? header.slice(7) : undefined)
    || c.req.header('X-Access-Token')
    || c.req.query('token');

  if (!provided || !safeEqual(provided.trim(), getAccessToken())) {
    return c.json({ error: 'Accès non autorisé' }, 401);
  }
  await next();
});
