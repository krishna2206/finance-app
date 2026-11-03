import { Hono } from 'hono';
import { auditRepository } from '../db/repositories/auditRepository';
import { auditService } from '../services/auditService';
import { badRequest } from '../lib/errors';
import { AuditDomain } from '../lib/audit';

export const auditRouter = new Hono();

const DOMAINS: AuditDomain[] = ['TRANSACTION', 'BALANCE', 'SMS', 'WALLET', 'SAVINGS', 'BUDGET', 'CATEGORY', 'SETTINGS', 'SYSTEM'];

/**
 * GET /api/audit?limit=50&cursor=<occurredAt>:<id>&domains=TRANSACTION,BALANCE&walletId=...&driftOnly=1
 * Journal du plus récent au plus ancien, paginé par curseur.
 */
auditRouter.get('/', (c) => {
  const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;
  if (!Number.isInteger(limit) || limit <= 0) throw badRequest('limit doit être un entier positif');

  let beforeAt: number | undefined;
  let beforeId: string | undefined;
  const cursor = c.req.query('cursor');
  if (cursor) {
    const [at, id] = cursor.split(':');
    beforeAt = Number(at);
    beforeId = id;
    if (!Number.isFinite(beforeAt)) throw badRequest('Curseur invalide');
  }

  const domains = c.req.query('domains')?.split(',').filter(Boolean) as AuditDomain[] | undefined;
  if (domains?.some(d => !DOMAINS.includes(d))) throw badRequest(`domains doit contenir : ${DOMAINS.join(', ')}`);

  const events = auditRepository.list({
    limit: limit + 1,
    beforeAt,
    beforeId,
    domains,
    walletId: c.req.query('walletId') || undefined,
    driftOnly: c.req.query('driftOnly') === '1',
  });
  const page = events.slice(0, limit);
  const last = page.at(-1);
  return c.json({
    events: page,
    nextCursor: events.length > limit && last ? `${last.occurredAt}:${last.id}` : null,
  });
});

/** GET /api/audit/drift-summary : total des écarts de solde par compte et par mois. */
auditRouter.get('/drift-summary', (c) => c.json(auditService.driftSummary()));
