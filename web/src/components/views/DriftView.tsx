import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useWalletStore } from '../../stores/useWalletStore';
import { AuditEvent, DriftSummaryEntry } from '../../types/models';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { WalletLogo } from '../common/WalletLogo';
import { AuditEventBottomSheet } from '../sheets/AuditEventBottomSheet';
import { currentMonthKey } from '../../utils/dates';
import { showErrorToast } from '../../utils/errors';
import { formatDrift, ACTOR_LABELS } from '../../utils/audit';
import { AltArrowLeftLinearIcon } from '@solar-icons/react';

const walletOf = (e: AuditEvent) => (e.entityType === 'wallet' && e.entityId ? e.entityId : e.walletChanges[0]?.walletId);
const shortDate = (at: number) => new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const dateTime = (at: number) =>
  new Date(at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

interface DriftRow {
  event: AuditEvent;
  /** Point de contrôle précédent du même compte (recalage ou correction), même sans écart. */
  since?: number;
}

/** Écarts entre le solde calculé par l'app et le solde réel, compte par compte. */
export function DriftView({ onBack }: { onBack: () => void }) {
  const wallets = useWalletStore(state => state.wallets);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [summary, setSummary] = useState<DriftSummaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getAudit({ driftOnly: true, limit: 200 }), api.getDriftSummary()])
      .then(([page, totals]) => {
        if (cancelled) return;
        setEvents(page.events);
        setSummary(totals);
      })
      .catch(err => { if (!cancelled) showErrorToast(err, 'Écarts indisponibles'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byWallet = useMemo(() => {
    const map = new Map<string, DriftRow[]>();
    // Du plus récent au plus ancien : le point de contrôle précédent est le suivant dans la liste.
    events.forEach((e, i) => {
      const walletId = walletOf(e);
      if (!walletId || !e.drift) return;
      const previous = events.slice(i + 1).find(p => walletOf(p) === walletId);
      const rows = map.get(walletId) ?? [];
      rows.push({ event: e, since: previous?.occurredAt });
      map.set(walletId, rows);
    });
    return [...map.entries()];
  }, [events]);

  const month = currentMonthKey();
  const monthTotal = (walletId: string) => summary.find(s => s.walletId === walletId && s.period === month);

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 bg-zinc-50 flex items-center gap-3 relative">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-zinc-50 via-zinc-50/80 to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
          title="Retour"
        >
          <AltArrowLeftLinearIcon size={20} />
        </button>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">
          Écarts de solde
        </h1>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed px-1">
        Un écart apparaît quand un SMS annonce un solde différent du calcul de l'app, ou lors d'une correction manuelle. Négatif : une dépense n'a sans doute pas été saisie. Positif : une entrée d'argent manque.
      </p>

      {isLoading ? (
        <InsetGroupedCard className="p-8 text-center">
          <p className="text-xs text-zinc-400 font-medium">Chargement...</p>
        </InsetGroupedCard>
      ) : byWallet.length === 0 ? (
        <InsetGroupedCard className="p-8 text-center">
          <p className="text-xs text-zinc-400 font-medium">Aucun écart : les soldes calculés correspondent aux soldes réels.</p>
        </InsetGroupedCard>
      ) : (
        byWallet.map(([walletId, rows]) => {
          const name = wallets[walletId]?.name ?? 'Compte supprimé';
          const total = monthTotal(walletId);
          return (
            <div key={walletId} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <WalletLogo id={walletId} name={name} size="sm" />
                  <span className="text-xs font-bold text-zinc-900 truncate">{name}</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-500 tabular-nums shrink-0">
                  Ce mois : {total ? `${formatDrift(total.total)} (${total.count} écart${total.count > 1 ? 's' : ''})` : 'aucun écart'}
                </span>
              </div>
              <InsetGroupedCard>
                {rows.map(({ event, since }) => {
                  const isSms = event.action === 'BALANCE_RECONCILED';
                  const hint = event.drift! < 0
                    ? `Une dépense oubliée${since ? ` depuis le ${shortDate(since)}` : ''} ?`
                    : `Une entrée oubliée${since ? ` depuis le ${shortDate(since)}` : ''} ?`;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelected(event)}
                      className="w-full px-4 py-3 border-b border-zinc-100 last:border-b-0 flex items-start justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-zinc-900 block">
                          {isSms ? 'Recalage par SMS' : 'Correction manuelle'}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                          {dateTime(event.occurredAt)} · {ACTOR_LABELS[event.actor]}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium block mt-0.5">
                          {event.note ?? hint}
                        </span>
                      </div>
                      <span className="text-xs font-black tabular-nums shrink-0 text-amber-700">
                        {formatDrift(event.drift!)}
                      </span>
                    </button>
                  );
                })}
              </InsetGroupedCard>
            </div>
          );
        })
      )}

      <AuditEventBottomSheet event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
