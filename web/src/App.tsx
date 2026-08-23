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
    <div className="min-h-screen bg-[#090A0C] text-[#F4F4F5] px-4 pt-6 pb-28 selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Active Tab View */}
      <main className="max-w-2xl mx-auto">
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

      {/* Floating Layout at Bottom */}
      <FloatingTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
      <FloatingActionStack onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

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
  );
}

export default App;
