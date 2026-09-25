import { badRequest } from './errors';

type Json = Record<string, unknown>;

export function asObject(body: unknown): Json {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Le corps de la requête doit être un objet JSON');
  }
  return body as Json;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value.replace(/[\s\u00A0\u202F]/g, ''));
  return Number.NaN;
}

/** Montant en Ariary : entier strictement positif. */
export function requirePositiveAmount(value: unknown, field: string): number {
  const n = toNumber(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw badRequest(`${field} doit être un montant entier strictement positif`);
  }
  return n;
}

/** Montant en Ariary : entier positif ou nul. */
export function requireNonNegativeAmount(value: unknown, field: string): number {
  const n = toNumber(value);
  if (!Number.isInteger(n) || n < 0) {
    throw badRequest(`${field} doit être un montant entier positif ou nul`);
  }
  return n;
}

export function optionalNonNegativeAmount(value: unknown, field: string, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  return requireNonNegativeAmount(value, field);
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field} est requis`);
  }
  return value.trim();
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw badRequest(`${field} doit être une chaîne de caractères`);
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw badRequest(`${field} doit être un booléen`);
  return value;
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw badRequest(`${field} doit valoir : ${allowed.join(', ')}`);
  }
  return value as T;
}

export function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
  if (value === undefined || value === null) return undefined;
  return requireEnum(value, allowed, field);
}

export function optionalIsoDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw badRequest(`${field} doit être une date ISO 8601 valide`);
  }
  return new Date(value).toISOString();
}

export function optionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) {
    throw badRequest(`${field} doit être une liste d'identifiants`);
  }
  return Array.from(new Set(value as string[]));
}

/** Garde uniquement les chiffres et compare sur les 9 derniers (gère +261 / 0 en préfixe). */
export function normalizePhoneNumber(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9) return undefined;
  return digits.slice(-9);
}
