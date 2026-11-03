import { describe, it, expect } from 'bun:test';
import { fieldChanges, formatDrift } from '../src/utils/audit';

describe('Journal d’activité : affichage', () => {
  it('formate un écart signé', () => {
    expect(formatDrift(-12_000)).toBe('-12 000 Ar');
    expect(formatDrift(2_500)).toBe('+2 500 Ar');
    expect(formatDrift(0)).toBe('0 Ar');
  });

  it('ne montre que les champs modifiés quand il y a un avant et un après', () => {
    const changes = fieldChanges({
      before: { title: 'Courses', amount: 12_000, categoryId: 'a', note: null },
      after: { title: 'Courses', amount: 15_000, categoryId: 'b', note: null },
    });
    expect(changes.map(c => c.key)).toEqual(['amount', 'categoryId']);
    expect(changes[0]).toMatchObject({ before: 12_000, after: 15_000, label: 'Montant' });
  });

  it('montre les champs renseignés d’un état créé ou supprimé, sans les champs techniques', () => {
    const changes = fieldChanges({ before: { name: 'Pot', balance: 0, createdAt: 1, note: '' } });
    expect(changes.map(c => c.key)).toEqual(['name', 'balance']);
  });

  it('ignore un état qui n’est pas un objet', () => {
    expect(fieldChanges({ after: [{ transactionId: 'x' }] })).toEqual([]);
    expect(fieldChanges({})).toEqual([]);
  });
});
