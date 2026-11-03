import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { autoCategorizer } from '../services/autoCategorizer';
import { smsService } from '../services/smsService';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { auditService } from '../services/auditService';
import { HttpError } from '../lib/errors';

export const smsRouter = new Hono();

type SSECallback = (data: { event: string; payload: unknown }) => Promise<void>;
const sseClients = new Set<SSECallback>();

export function broadcastEvent(event: string, payload: unknown) {
  for (const callback of sseClients) {
    callback({ event, payload }).catch(() => sseClients.delete(callback));
  }
}

/**
 * GET /api/sms/events
 * Flux Server-Sent Events pour notifier les clients des SMS interceptés en temps réel.
 */
smsRouter.get('/events', (c) => {
  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache, no-transform');

  return streamSSE(c, async (stream) => {
    const send: SSECallback = async ({ event, payload }) => {
      await stream.writeSSE({ event, data: JSON.stringify(payload) });
    };
    sseClients.add(send);

    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ time: Date.now() }),
      retry: 1000,
    });

    const pingInterval = setInterval(() => {
      stream.writeSSE({ event: 'ping', data: '1' }).catch(() => {
        clearInterval(pingInterval);
        sseClients.delete(send);
      });
    }, 10_000);

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        clearInterval(pingInterval);
        sseClients.delete(send);
        resolve();
      });
    });
  });
});

/**
 * POST /api/sms/test-parse
 * Analyse un SMS sans rien écrire (aperçu / diagnostic).
 */
smsRouter.post('/test-parse', async (c) => {
  const parsed = smsService.parse(await c.req.json());
  const category = categoryRepository.getCategoryById(autoCategorizer.resolveCategory(parsed));
  return c.json({
    parsed,
    resolvedCategory: category ? { id: category.id, name: category.name, color: category.color } : null,
  });
});

/**
 * POST /api/sms/webhook
 * Appelé par MacroDroid (ou une app compagnon) à la réception d'un SMS opérateur.
 */
smsRouter.post('/webhook', async (c) => {
  const body = await c.req.json();
  let result;
  try {
    result = smsService.ingest(body);
  } catch (err) {
    if (err instanceof HttpError && err.status === 422) {
      const raw = typeof body?.message === 'string' ? body.message : typeof body?.text === 'string' ? body.text : '';
      auditService.record({
        domain: 'SMS',
        action: 'SMS_REJECTED',
        summary: 'SMS non reconnu, rien n’a été enregistré',
        after: { sender: typeof body?.sender === 'string' ? body.sender : undefined, message: raw.slice(0, 1000) },
      });
    }
    throw err;
  }

  if (result.duplicate) {
    return c.json({
      success: true,
      duplicate: true,
      message: 'Transaction déjà enregistrée (doublon ignoré).',
      transaction: result.transaction,
    });
  }

  broadcastEvent('NEW_SMS_TRANSACTION', {
    transaction: result.transaction,
    parsed: result.parsed,
    walletName: result.walletName,
    hasBudgetConflict: result.hasBudgetConflict,
    matchingBudgets: result.matchingBudgets,
  });

  return c.json({ success: true, transaction: result.transaction, parsed: result.parsed }, 201);
});
