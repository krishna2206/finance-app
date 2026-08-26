import { useMemo } from 'react';
import {
  HamburgerMenuLinearIcon,
  UserCircleLinearIcon,
  RestartLinearIcon,
} from '@solar-icons/react';

interface DashboardHeaderProps {
  userName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  userName = 'Krishna',
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps) {
  const formattedDate = useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('fr-FR', { month: 'long' });
    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capWeekday} ${day} ${month}`;
  }, []);

  return (
    <header className="flex items-center justify-between py-1 mb-2">
      {/* Left profile info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-700">
          <HamburgerMenuLinearIcon size={20} />
        </div>

        <div>
          <h1 className="text-base font-bold text-zinc-900 tracking-tight leading-tight">
            Bonjour {userName}
          </h1>
          <p className="text-xs text-zinc-500 font-medium leading-tight mt-0.5">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Right action icons */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Rafraîchir les données"
            className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <RestartLinearIcon size={18} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
          </button>
        )}

        <div className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-600">
          <UserCircleLinearIcon size={22} />
        </div>
      </div>
    </header>
  );
}
