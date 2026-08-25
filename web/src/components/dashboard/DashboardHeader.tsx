import {
  HamburgerMenuLinearIcon,
  UserCircleLinearIcon,
  RestartLinearIcon,
} from '@solar-icons/react';

interface DashboardHeaderProps {
  userName?: string;
  userSubtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  userName = 'Utilisateur',
  userSubtitle,
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between py-2 mb-4">
      {/* Left profile info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-700">
          <HamburgerMenuLinearIcon size={20} />
        </div>

        <div>
          <h1 className="text-sm font-bold text-zinc-900 tracking-tight leading-tight">
            {userName}
          </h1>
          {userSubtitle && (
            <p className="text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">
              {userSubtitle}
            </p>
          )}
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
