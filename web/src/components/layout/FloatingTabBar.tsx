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
    <nav className="fixed bottom-6 left-6 z-40 bg-[#13151A]/85 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl shadow-black/80 flex items-center gap-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = isActive ? tab.solidIcon : tab.outlineIcon;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-zinc-800 text-zinc-50 font-semibold shadow-inner'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : ''}`} />
            <span className="text-xs">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
