import { motion } from 'framer-motion';
import {
  Widget2LinearIcon,
  Widget2BoldIcon,
  BillListLinearIcon,
  BillListBoldIcon,
  PieChartLinearIcon,
  PieChartBoldIcon,
} from '@solar-icons/react';

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
      linearIcon: Widget2LinearIcon,
      boldIcon: Widget2BoldIcon,
    },
    {
      id: 'transactions' as const,
      label: 'Historique',
      linearIcon: BillListLinearIcon,
      boldIcon: BillListBoldIcon,
    },
    {
      id: 'budgets' as const,
      label: 'Budgets',
      linearIcon: PieChartLinearIcon,
      boldIcon: PieChartBoldIcon,
    },
  ];

  return (
    <nav className="h-14 w-full bg-white/80 backdrop-blur-2xl border border-zinc-200/80 p-1 rounded-full shadow-lg shadow-zinc-900/10 flex items-center justify-between gap-0.5 relative">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = isActive ? tab.boldIcon : tab.linearIcon;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className="relative h-10 flex-1 min-w-0 flex items-center justify-center gap-1 px-1 rounded-full cursor-pointer select-none focus:outline-none"
          >
            {/* Sliding Pill Background Indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-zinc-900 rounded-full shadow-xs transform-gpu will-change-transform"
                transition={{ type: 'spring', damping: 26, stiffness: 450 }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center gap-1 min-w-0">
              <Icon size={17} className={`shrink-0 transition-colors duration-150 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
              <span className={`text-[11px] font-bold truncate transition-colors duration-150 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                {tab.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
