import { useNotificationStore } from '../../stores/useNotificationStore';
import {
  AltArrowLeftLinearIcon,
  BellLinearIcon,
  CheckCircleBoldIcon,
} from '@solar-icons/react';

interface NotificationsViewProps {
  onBack: () => void;
}

export function NotificationsView({
  onBack,
}: NotificationsViewProps) {
  const notifications = useNotificationStore(state => state.notifications);
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Sticky Header with Back Button */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 bg-zinc-50 flex items-center justify-between relative">
        {/* Progressive Bottom Gradient Fade */}
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
            Notifications
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer px-2 py-1"
          >
            Tout lire
          </button>
        )}
      </div>

      {/* 2. Notifications List */}
      {notifications.length === 0 ? (
        <div className="p-8 bg-white border border-zinc-200/90 rounded-3xl text-center space-y-3 shadow-xs mt-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-200/50">
            <BellLinearIcon size={24} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 mb-0.5">
              Aucune notification
            </h3>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Vos bilans de fin de mois, opportunités d'épargne et alertes budgétaires s'afficheront ici.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 shadow-xs flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                <CheckCircleBoldIcon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-zinc-900">{n.title}</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
