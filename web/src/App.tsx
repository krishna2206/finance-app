import { useState, useEffect } from 'react';
import { useWalletStore } from './stores/useWalletStore';
import { useBudgetStore } from './stores/useBudgetStore';
import { useTransactionStore } from './stores/useTransactionStore';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { BudgetsView } from './components/views/BudgetsView';
import { FloatingTabBar, ActiveTab } from './components/layout/FloatingTabBar';
import { FloatingActionStack } from './components/layout/FloatingActionStack';
import { QuickAddBottomSheet } from './components/sheets/QuickAddBottomSheet';
import { TransactionDetailBottomSheet } from './components/sheets/TransactionDetailBottomSheet';
import { BudgetEditBottomSheet } from './components/sheets/BudgetEditBottomSheet';
import { Transaction, Category } from './types/models';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  useEffect(() => {
    loadWallets();
    loadBudgets();
    loadTransactions();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 flex justify-center text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Mobile-Only Frame (Locked in Portrait ~430px width) */}
      <div className="w-full max-w-[430px] min-h-screen bg-zinc-50 border-x border-zinc-200/80 relative flex flex-col shadow-sm overflow-x-hidden px-4 pt-4 pb-28">
        {/* Active Tab View */}
        <main className="flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView
              onSelectTransaction={setSelectedTransaction}
              onNavigateToTransactions={() => setActiveTab('transactions')}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView onSelectTransaction={setSelectedTransaction} />
          )}

          {activeTab === 'budgets' && (
            <BudgetsView onEditCategory={setEditingCategory} />
          )}
        </main>

        {/* Floating Bottom Bar (Dynamically adapts on all screen sizes with guaranteed gap) */}
        <div className="fixed bottom-5 left-0 right-0 max-w-[430px] mx-auto px-4 z-40 pointer-events-none flex items-center gap-3">
          <div className="flex-1 min-w-0 pointer-events-auto">
            <FloatingTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
          </div>
          <div className="shrink-0 pointer-events-auto">
            <FloatingActionStack onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
          </div>
        </div>

        {/* Bottom Sheets */}
        <QuickAddBottomSheet
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
        />

        <TransactionDetailBottomSheet
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />

        <BudgetEditBottomSheet
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      </div>
    </div>
  );
}

export default App;
