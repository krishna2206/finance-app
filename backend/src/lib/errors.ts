import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class HttpError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

function isSqliteConstraintError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT');
}

export function handleError(err: Error, c: Context) {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof SyntaxError) {
    return c.json({ error: 'Corps de requête JSON invalide' }, 400);
  }
  if (isSqliteConstraintError(err)) {
    console.error('[DB] Violation de contrainte :', err.message);
    return c.json({ error: 'Opération refusée : elle violerait l’intégrité des données' }, 409);
  }
  console.error('[API] Unhandled error:', err);
  return c.json({ error: 'Erreur interne du serveur' }, 500);
}
