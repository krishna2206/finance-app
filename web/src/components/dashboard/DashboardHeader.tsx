import { useMemo } from 'react';
import {
  BellLinearIcon,
  BellBoldIcon,
} from '@solar-icons/react';

interface DashboardHeaderProps {
  userName?: string;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export function DashboardHeader({
  userName = 'Krishna',
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}: DashboardHeaderProps) {
  const formattedDate = useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('fr-FR', { month: 'long' });
    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capWeekday} ${day} ${month}`;
  }, []);

  const initial = (userName.trim().charAt(0) || 'K').toUpperCase();

  return (
    <header className="flex items-center justify-between py-1 mb-2">
      {/* Left profile info (Clicking opens Settings & Management) */}
      <div
        onClick={onOpenSettings}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:bg-zinc-800 group-active:scale-95 transition-all">
          {initial}
        </div>

        <div>
          <h1 className="text-base font-bold text-zinc-900 tracking-tight leading-tight group-hover:text-zinc-700 transition-colors">
            Bonjour {userName}
          </h1>
          <p className="text-xs text-zinc-500 font-medium leading-tight mt-0.5">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Right action: Notifications Bell */}
      <div className="flex items-center gap-2">
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            title="Notifications et Bilans"
            className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all active:scale-95 cursor-pointer relative"
          >
            {unreadNotificationsCount > 0 ? (
              <BellBoldIcon size={19} className="text-zinc-900" />
            ) : (
              <BellLinearIcon size={19} />
            )}
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
