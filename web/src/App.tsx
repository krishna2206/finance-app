import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from './stores/useWalletStore';
import { useSavingsStore } from './stores/useSavingsStore';
import { useBudgetStore } from './stores/useBudgetStore';
import { useTransactionStore } from './stores/useTransactionStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { BudgetsView } from './components/views/BudgetsView';
import { FloatingTabBar, ActiveTab } from './components/layout/FloatingTabBar';
import { FloatingActionStack } from './components/layout/FloatingActionStack';
import { QuickAddBottomSheet } from './components/sheets/QuickAddBottomSheet';
import { AddWalletBottomSheet } from './components/sheets/AddWalletBottomSheet';
import { TransactionDetailBottomSheet } from './components/sheets/TransactionDetailBottomSheet';
import { BudgetEditBottomSheet } from './components/sheets/BudgetEditBottomSheet';
import { CreateSavingsBottomSheet } from './components/sheets/CreateSavingsBottomSheet';
import { CreateGoalBottomSheet } from './components/sheets/CreateGoalBottomSheet';
import { GoalActionBottomSheet } from './components/sheets/GoalActionBottomSheet';
import { SavingsActionBottomSheet, SavingsActionType } from './components/sheets/SavingsActionBottomSheet';
import { Transaction, Category, Savings, SavingsGoal } from './types/models';

const TAB_ORDER: Record<ActiveTab, number> = {
  dashboard: 0,
  transactions: 1,
  budgets: 2,
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : direction < 0 ? -60 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : direction < 0 ? 60 : 0,
    opacity: 0,
  }),
};

export function App() {
  const [[activeTab, direction], setTabState] = useState<[ActiveTab, number]>(['dashboard', 0]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Savings & Goals Bottom Sheets mounted at Root z-50
  const [isCreateSavingsOpen, setIsCreateSavingsOpen] = useState(false);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [createGoalDefaultSavingsId, setCreateGoalDefaultSavingsId] = useState<string | undefined>(undefined);

  const [isSavingsActionOpen, setIsSavingsActionOpen] = useState(false);
  const [selectedSavingsForAction, setSelectedSavingsForAction] = useState<Savings | null>(null);
  const [savingsDefaultAction, setSavingsDefaultAction] = useState<SavingsActionType>('DEPOSIT');

  const [isGoalActionOpen, setIsGoalActionOpen] = useState(false);
  const [selectedGoalForAction, setSelectedGoalForAction] = useState<SavingsGoal | null>(null);
  const [goalDefaultAction, setGoalDefaultAction] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const settings = useSettingsStore(state => state.settings);
  const isSettingsLoading = useSettingsStore(state => state.isLoading);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadSavingsAndGoals = useSavingsStore(state => state.loadSavingsAndGoals);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  useEffect(() => {
    loadSettings();
    loadWallets();
    loadSavingsAndGoals();
    loadBudgets();
    loadTransactions();
  }, [loadSettings, loadWallets, loadSavingsAndGoals, loadBudgets, loadTransactions]);

  const handleTabChange = (newTab: ActiveTab) => {
    if (newTab === activeTab) return;
    const newIndex = TAB_ORDER[newTab];
    const oldIndex = TAB_ORDER[activeTab];
    setTabState([newTab, newIndex > oldIndex ? 1 : -1]);
  };

  // If settings are loading initially
  if (isSettingsLoading && !settings) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs font-semibold uppercase tracking-widest">
        Chargement...
      </div>
    );
  }

  const showOnboarding = Boolean(settings && !settings.onboardingCompleted);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showOnboarding ? (
        <motion.div
          key="onboarding-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 w-full h-full"
        >
          <OnboardingView />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard-app"
          initial={{ opacity: 0, scale: 1.02, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen bg-zinc-100 flex justify-center text-zinc-900 selection:bg-zinc-900 selection:text-white"
        >
          {/* Mobile-Only Frame (Locked in Portrait ~430px width) */}
          <div className="w-full max-w-[430px] min-h-screen bg-zinc-50 border-x border-zinc-200/80 relative flex flex-col shadow-sm overflow-x-hidden px-4 pt-4 pb-28">
            {/* Active Tab View with Instant Simultaneous Directional Slide */}
            <main className="flex-1 relative w-full">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={activeTab}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    duration: 0.13,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full transform-gpu will-change-transform"
                >
                  {activeTab === 'dashboard' && (
                    <DashboardView
                      onSelectTransaction={setSelectedTransaction}
                      onNavigateToTransactions={() => handleTabChange('transactions')}
                      onOpenAddWallet={() => setIsAddWalletOpen(true)}
                    />
                  )}

                  {activeTab === 'transactions' && (
                    <TransactionsView onSelectTransaction={setSelectedTransaction} />
                  )}

                  {activeTab === 'budgets' && (
                    <BudgetsView
                      onEditCategory={setEditingCategory}
                      onOpenCreateSavings={() => setIsCreateSavingsOpen(true)}
                      onOpenCreateGoal={(savingsId) => {
                        setCreateGoalDefaultSavingsId(savingsId);
                        setIsCreateGoalOpen(true);
                      }}
                      onOpenSavingsAction={(s, act) => {
                        setSelectedSavingsForAction(s);
                        setSavingsDefaultAction(act);
                        setIsSavingsActionOpen(true);
                      }}
                      onOpenGoalAction={(g, act) => {
                        setSelectedGoalForAction(g);
                        setGoalDefaultAction(act);
                        setIsGoalActionOpen(true);
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Progressive Frosted Bottom Mask */}
            <div
              className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto h-28 pointer-events-none z-30 bg-gradient-to-t from-zinc-50 via-zinc-50/70 to-transparent backdrop-blur-md"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)',
              }}
            />

            {/* Floating Bottom Bar */}
            <div className="fixed bottom-5 left-0 right-0 max-w-[430px] mx-auto px-4 z-40 pointer-events-none flex items-center gap-3">
              <div className="flex-1 min-w-0 pointer-events-auto">
                <FloatingTabBar activeTab={activeTab} onChangeTab={handleTabChange} />
              </div>
              <div className="shrink-0 pointer-events-auto">
                <FloatingActionStack onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
              </div>
            </div>

            {/* Root-Level Bottom Sheets (z-50, Flush at Viewport Bottom) */}
            <QuickAddBottomSheet
              isOpen={isQuickAddOpen}
              onClose={() => setIsQuickAddOpen(false)}
            />

            <AddWalletBottomSheet
              isOpen={isAddWalletOpen}
              onClose={() => setIsAddWalletOpen(false)}
            />

            <TransactionDetailBottomSheet
              transaction={selectedTransaction}
              onClose={() => setSelectedTransaction(null)}
            />

            <BudgetEditBottomSheet
              category={editingCategory}
              onClose={() => setEditingCategory(null)}
            />

            <CreateSavingsBottomSheet
              isOpen={isCreateSavingsOpen}
              onClose={() => setIsCreateSavingsOpen(false)}
            />

            <CreateGoalBottomSheet
              isOpen={isCreateGoalOpen}
              onClose={() => setIsCreateGoalOpen(false)}
              defaultSavingsId={createGoalDefaultSavingsId}
              onOpenCreateSavings={() => setIsCreateSavingsOpen(true)}
            />

            <GoalActionBottomSheet
              isOpen={isGoalActionOpen}
              onClose={() => {
                setIsGoalActionOpen(false);
                setSelectedGoalForAction(null);
              }}
              goal={selectedGoalForAction}
              defaultAction={goalDefaultAction}
            />

            <SavingsActionBottomSheet
              isOpen={isSavingsActionOpen}
              onClose={() => {
                setIsSavingsActionOpen(false);
                setSelectedSavingsForAction(null);
              }}
              savings={selectedSavingsForAction}
              defaultAction={savingsDefaultAction}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
