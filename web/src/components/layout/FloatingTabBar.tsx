import {
  Squares2X2Icon,
  ReceiptPercentIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import {
  Squares2X2Icon as SquaresSolid,
  ReceiptPercentIcon as ReceiptSolid,
  ChartPieIcon as ChartPieSolid,
} from '@heroicons/react/24/solid';

export type ActiveTab = 'dashboard' | 'transactions' | 'budgets';

interface FloatingTabBarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export function FloatingTabBar({ activeTab, onChangeTab }: FloatingTabBarProps) {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Accueil',
      outlineIcon: Squares2X2Icon,
      solidIcon: SquaresSolid,
    },
    {
      id: 'transactions' as const,
      label: 'Historique',
      outlineIcon: ReceiptPercentIcon,
      solidIcon: ReceiptSolid,
    },
    {
      id: 'budgets' as const,
      label: 'Budgets',
      outlineIcon: ChartPieIcon,
      solidIcon: ChartPieSolid,
    },
  ];

  return (
    <nav className="h-14 bg-white/90 backdrop-blur-xl border border-zinc-200/90 px-2 rounded-full shadow-xl shadow-zinc-900/10 flex items-center gap-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = isActive ? tab.solidIcon : tab.outlineIcon;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`h-10 flex items-center gap-2 px-4 rounded-full transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-zinc-900 text-white font-medium shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
