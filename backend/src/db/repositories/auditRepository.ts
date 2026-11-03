import { and, desc, eq, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { getDatabase } from '../index';
import { auditEvents } from '../schema';
import { AuditActor, AuditDomain, WalletChange, currentActor } from '../../lib/audit';

export interface AuditInput {
  domain: AuditDomain;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  walletChanges?: WalletChange[];
  drift?: number | null;
  note?: string | null;
  actor?: AuditActor;
  occurredAt?: number;
}

export interface AuditEvent {
  id: string;
  occurredAt: number;
  actor: AuditActor;
  domain: AuditDomain;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  walletChanges: WalletChange[];
  drift?: number;
  note?: string;
}

export interface AuditQuery {
  limit?: number;
  /** Curseur : événements strictement antérieurs à cet horodatage (ou même horodatage et id inférieur). */
  beforeAt?: number;
  beforeId?: string;
  domains?: AuditDomain[];
  walletId?: string;
  driftOnly?: boolean;
}

const parse = (v: string | null) => (v === null ? undefined : JSON.parse(v));

function mapRow(r: typeof auditEvents.$inferSelect): AuditEvent {
  return {
    id: r.id,
    occurredAt: r.occurredAt,
    actor: r.actor as AuditActor,
    domain: r.domain as AuditDomain,
    action: r.action,
    entityType: r.entityType ?? undefined,
    entityId: r.entityId ?? undefined,
    summary: r.summary,
    before: parse(r.before),
    after: parse(r.after),
    walletChanges: parse(r.walletChanges) ?? [],
    drift: r.drift ?? undefined,
    note: r.note ?? undefined,
  };
}

let lastTimestamp = 0;

/** Horodatage strictement croissant : l'ordre du journal reste celui des écritures. */
function nextTimestamp(): number {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
  return lastTimestamp;
}

export const auditRepository = {
  record(input: AuditInput): AuditEvent {
    const db = getDatabase();
    const row = {
      id: crypto.randomUUID(),
      occurredAt: input.occurredAt ?? nextTimestamp(),
      actor: input.actor ?? currentActor(),
      domain: input.domain,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      summary: input.summary,
      before: input.before === undefined ? null : JSON.stringify(input.before),
      after: input.after === undefined ? null : JSON.stringify(input.after),
      walletChanges: input.walletChanges?.length ? JSON.stringify(input.walletChanges) : null,
      drift: input.drift ?? null,
      note: input.note ?? null,
    };
    db.insert(auditEvents).values(row).run();
    return mapRow(row);
  },

  list(query: AuditQuery = {}): AuditEvent[] {
    const db = getDatabase();
    const conditions = [];
    if (query.beforeAt !== undefined) {
      conditions.push(query.beforeId
        ? or(lt(auditEvents.occurredAt, query.beforeAt), and(eq(auditEvents.occurredAt, query.beforeAt), lt(auditEvents.id, query.beforeId)))
        : lt(auditEvents.occurredAt, query.beforeAt));
    }
    if (query.domains?.length) conditions.push(inArray(auditEvents.domain, query.domains));
    if (query.driftOnly) conditions.push(isNotNull(auditEvents.drift));
    if (query.walletId) {
      conditions.push(or(
        and(eq(auditEvents.entityType, 'wallet'), eq(auditEvents.entityId, query.walletId)),
        sql`EXISTS (SELECT 1 FROM json_each(${auditEvents.walletChanges}) WHERE json_extract(value, '$.walletId') = ${query.walletId})`,
      ));
    }

    return db.select().from(auditEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(Math.min(query.limit ?? 50, 200))
      .all()
      .map(mapRow);
  },

  all(): AuditEvent[] {
    return getDatabase().select().from(auditEvents).orderBy(auditEvents.occurredAt).all().map(mapRow);
  },

  count(): number {
    return getDatabase().select({ n: sql<number>`count(*)` }).from(auditEvents).get()?.n ?? 0;
  },
};
