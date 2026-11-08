import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useWalletStore } from '../../stores/useWalletStore';
import { AuditDomain, AuditEvent } from '../../types/models';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { AuditEventBottomSheet } from '../sheets/AuditEventBottomSheet';
import { dayKeyOf } from '../../utils/dates';
import { formatDateGroupLabel } from '../../utils/formatters';
import { showErrorToast } from '../../utils/errors';
import { ACTOR_LABELS, AUDIT_FILTERS, AuditFilterId, formatDrift } from '../../utils/audit';
import {
  AltArrowLeftLinearIcon,
  BillListLinearIcon,
  ChatRoundLineLinearIcon,
  ClipboardListLinearIcon,
  PieChartLinearIcon,
  ScaleLinearIcon,
  SettingsLinearIcon,
  WalletLinearIcon,
} from '@solar-icons/react';

const DOMAIN_ICONS: Record<AuditDomain, typeof BillListLinearIcon> = {
  TRANSACTION: BillListLinearIcon,
  BALANCE: ScaleLinearIcon,
  SMS: ChatRoundLineLinearIcon,
  WALLET: WalletLinearIcon,
  SAVINGS: WalletLinearIcon,
  BUDGET: PieChartLinearIcon,
  CATEGORY: PieChartLinearIcon,
  SETTINGS: SettingsLinearIcon,
  SYSTEM: ClipboardListLinearIcon,
};

const time = (at: number) => new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface ActivityViewProps {
  onBack: () => void;
}

/** Journal d'activité : tout ce qui a modifié les données, du plus récent au plus ancien. */
export function ActivityView({ onBack }: ActivityViewProps) {
  const wallets = useWalletStore(state => state.allWallets);
  const walletList = Object.values(wallets);

  const [filter, setFilter] = useState<AuditFilterId>('ALL');
  const [walletId, setWalletId] = useState<string | undefined>(undefined);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const domains = AUDIT_FILTERS.find(f => f.id === filter)!.domains;

  const load = useCallback(async (cursor: string | null) => {
    const page = await api.getAudit({ cursor, domains, walletId });
    setEvents(prev => (cursor ? [...prev, ...page.events] : page.events));
    setNextCursor(page.nextCursor);
  }, [filter, walletId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    load(null)
      .catch(err => { if (!cancelled) showErrorToast(err, 'Journal indisponible'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      await load(nextCursor);
    } catch (err) {
      showErrorToast(err, 'Journal indisponible');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const grouped = useMemo(() => {
    const groups: Array<{ dayKey: string; events: AuditEvent[] }> = [];
    for (const e of events) {
      const dayKey = dayKeyOf(new Date(e.occurredAt));
      const last = groups.at(-1);
      if (last?.dayKey === dayKey) last.events.push(e);
      else groups.push({ dayKey, events: [e] });
    }
    return groups;
  }, [events]);

  const chipClass = (isActive: boolean) =>
    `py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
      isActive ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    }`;

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 bg-zinc-50 space-y-3 relative">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-zinc-50 via-zinc-50/80 to-transparent pointer-events-none" />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            title="Retour"
          >
            <AltArrowLeftLinearIcon size={20} />
          </button>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">
            Journal d'activité
          </h1>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" role="group" aria-label="Filtrer par domaine">
          {AUDIT_FILTERS.map(f => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chipClass(filter === f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {walletList.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" role="group" aria-label="Filtrer par compte">
            <button type="button" aria-pressed={!walletId} onClick={() => setWalletId(undefined)} className={chipClass(!walletId)}>
              Tous les comptes
            </button>
            {walletList.map(w => (
              <button key={w.id} type="button" aria-pressed={walletId === w.id} onClick={() => setWalletId(w.id)} className={chipClass(walletId === w.id)}>
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <InsetGroupedCard className="p-8 text-center">
          <p className="text-xs text-zinc-400 font-medium">Chargement...</p>
        </InsetGroupedCard>
      ) : events.length === 0 ? (
        <InsetGroupedCard className="p-8 text-center">
          <p className="text-xs text-zinc-400 font-medium">Aucune activité pour ce filtre.</p>
        </InsetGroupedCard>
      ) : (
        <>
          {grouped.map(group => (
            <div key={group.dayKey} className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 block capitalize">
                {formatDateGroupLabel(group.dayKey)}
              </span>
              <InsetGroupedCard>
                {group.events.map(e => {
                  const Icon = DOMAIN_ICONS[e.domain] ?? ClipboardListLinearIcon;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelected(e)}
                      className="w-full px-4 py-3 border-b border-zinc-100 last:border-b-0 flex items-start gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0 border border-black/5">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-zinc-900 leading-snug line-clamp-2">{e.summary}</span>
                        <span className="text-[11px] text-zinc-400 font-medium block mt-0.5 tabular-nums">
                          {time(e.occurredAt)} · {ACTOR_LABELS[e.actor]}
                        </span>
                      </div>
                      {e.drift !== undefined && e.drift !== 0 && (
                        <span className="text-[11px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          {formatDrift(e.drift)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </InsetGroupedCard>
            </div>
          ))}

          {nextCursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoadingMore ? 'Chargement...' : 'Afficher plus'}
            </button>
          )}
        </>
      )}

      <AuditEventBottomSheet event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
