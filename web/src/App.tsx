import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from './stores/useWalletStore';
import { useSavingsStore } from './stores/useSavingsStore';
import { useBudgetStore } from './stores/useBudgetStore';
import { useTransactionStore } from './stores/useTransactionStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { initSmsListener } from './services/smsListener';
import { ToastContainer } from './components/common/ToastContainer';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { BudgetsView } from './components/views/BudgetsView';
import { NotificationsView } from './components/views/NotificationsView';
import { SettingsView } from './components/views/SettingsView';
import { FloatingTabBar, ActiveTab } from './components/layout/FloatingTabBar';
import { FloatingActionStack } from './components/layout/FloatingActionStack';
import { QuickAddBottomSheet } from './components/sheets/QuickAddBottomSheet';
import { AddWalletBottomSheet } from './components/sheets/AddWalletBottomSheet';
import { TransactionDetailBottomSheet } from './components/sheets/TransactionDetailBottomSheet';
import { BudgetEditBottomSheet } from './components/sheets/BudgetEditBottomSheet';
import { CreateCategoryBottomSheet } from './components/sheets/CreateCategoryBottomSheet';
import { CreateSavingsBottomSheet } from './components/sheets/CreateSavingsBottomSheet';
import { CreateGoalBottomSheet } from './components/sheets/CreateGoalBottomSheet';
import { GoalActionBottomSheet } from './components/sheets/GoalActionBottomSheet';
import { SavingsActionBottomSheet, SavingsActionType } from './components/sheets/SavingsActionBottomSheet';
import { AssignBudgetBottomSheet } from './components/sheets/AssignBudgetBottomSheet';
import { Transaction, Budget, Savings, SavingsGoal } from './types/models';

const TAB_ORDER: Record<ActiveTab, number> = {
  dashboard: 0,
  transactions: 1,
  budgets: 2,
};

type NavDirection = number | 'push-right' | 'pop-right' | 'push-left' | 'pop-left';

const slideVariants = {
  enter: (direction: NavDirection) => {
    if (direction === 'push-left') {
      return { x: -60, opacity: 0 };
    }
    if (direction === 'pop-left') {
      return { x: 30, opacity: 0 };
    }
    if (direction === 'push-right') {
      return { x: 60, opacity: 0 };
    }
    if (direction === 'pop-right') {
      return { x: -30, opacity: 0 };
    }
    const num = typeof direction === 'number' ? direction : 0;
    return {
      x: num > 0 ? 40 : num < 0 ? -40 : 0,
      opacity: 0,
    };
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: NavDirection) => {
    if (direction === 'push-left') {
      return { x: 30, opacity: 0 };
    }
    if (direction === 'pop-left') {
      return { x: -60, opacity: 0 };
    }
    if (direction === 'push-right') {
      return { x: -30, opacity: 0 };
    }
    if (direction === 'pop-right') {
      return { x: 60, opacity: 0 };
    }
    const num = typeof direction === 'number' ? direction : 0;
    return {
      x: num > 0 ? -40 : num < 0 ? 40 : 0,
      opacity: 0,
    };
  },
};

export function App() {
  const [[activeTab, direction], setTabState] = useState<[ActiveTab, NavDirection]>(['dashboard', 0]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);

  // Savings & Goals Bottom Sheets mounted at Root z-50
  const [isCreateSavingsOpen, setIsCreateSavingsOpen] = useState(false);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [createGoalDefaultSavingsId, setCreateGoalDefaultSavingsId] = useState<string | undefined>(undefined);

  const [isSavingsActionOpen, setIsSavingsActionOpen] = useState(false);
  const [selectedSavingsForAction, setSelectedSavingsForAction] = useState<Savings | null>(null);
  const [savingsDefaultAction, setSavingsDefaultAction] = useState<SavingsActionType>('DEPOSIT');
  const [savingsDefaultAmount, setSavingsDefaultAmount] = useState<number | undefined>(undefined);

  const [isNotificationsViewOpen, setIsNotificationsViewOpen] = useState(false);
  const [isSettingsViewOpen, setIsSettingsViewOpen] = useState(false);

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
  const pendingBudgetConflict = useTransactionStore(state => state.pendingBudgetConflict);
  const setPendingBudgetConflict = useTransactionStore(state => state.setPendingBudgetConflict);
  const updateTransaction = useTransactionStore(state => state.updateTransaction);

  useEffect(() => {
    loadSettings();
    loadWallets();
    loadSavingsAndGoals();
    loadBudgets();
    loadTransactions();

    const cleanupSms = initSmsListener();
    return () => {
      cleanupSms();
    };
  }, [loadSettings, loadWallets, loadSavingsAndGoals, loadBudgets, loadTransactions]);

  const handleTabChange = (newTab: ActiveTab) => {
    setIsNotificationsViewOpen(false);
    setIsSettingsViewOpen(false);
    if (newTab === activeTab) return;
    const newIndex = TAB_ORDER[newTab];
    const oldIndex = TAB_ORDER[activeTab];
    setTabState([newTab, newIndex > oldIndex ? 1 : -1]);
  };

  const openNotifications = () => {
    setTabState([activeTab, 'push-right']);
    setIsSettingsViewOpen(false);
    setIsNotificationsViewOpen(true);
  };

  const closeNotifications = () => {
    setTabState([activeTab, 'pop-right']);
    setIsNotificationsViewOpen(false);
  };

  const openSettings = () => {
    setTabState([activeTab, 'push-left']);
    setIsNotificationsViewOpen(false);
    setIsSettingsViewOpen(true);
  };

  const closeSettings = () => {
    setTabState([activeTab, 'pop-left']);
    setIsSettingsViewOpen(false);
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
  const currentViewKey = isNotificationsViewOpen ? 'notifications' : isSettingsViewOpen ? 'settings' : activeTab;

  return (
    <>
      <ToastContainer />
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
          className="min-h-screen bg-zinc-100 flex justify-center text-zinc-900 selection:bg-zinc-900 selection:text-white relative"
        >
          {/* Mobile-Only Frame (Locked in Portrait ~430px width) */}
          <div className="w-full max-w-[430px] min-h-screen bg-zinc-50 border-x border-zinc-200/80 relative flex flex-col shadow-sm px-4 pb-28">
            {/* Active Tab View with Instant Simultaneous Directional Slide */}
            <main className="flex-1 relative w-full">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={currentViewKey}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    duration: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full"
                >
                  {isNotificationsViewOpen ? (
                    <NotificationsView
                      onBack={closeNotifications}
                      onOpenSavingsWithAmount={(amount) => {
                        setSavingsDefaultAmount(amount);
                        setSelectedSavingsForAction(null);
                        setSavingsDefaultAction('DEPOSIT');
                        setIsSavingsActionOpen(true);
                      }}
                    />
                  ) : isSettingsViewOpen ? (
                    <SettingsView
                      onBack={closeSettings}
                      onOpenCreateCategory={() => setIsCreateCategoryOpen(true)}
                      onOpenAddWallet={() => setIsAddWalletOpen(true)}
                    />
                  ) : (
                    <>
                      {activeTab === 'dashboard' && (
                        <DashboardView
                          onSelectTransaction={setSelectedTransaction}
                          onNavigateToTransactions={() => handleTabChange('transactions')}
                          onNavigateToBudgets={() => handleTabChange('budgets')}
                          onOpenAddWallet={() => setIsAddWalletOpen(true)}
                          onOpenSavingsAction={() => {
                            setSavingsDefaultAmount(undefined);
                            setIsSavingsActionOpen(true);
                          }}
                          onOpenNotifications={openNotifications}
                          onOpenSettings={openSettings}
                        />
                      )}

                      {activeTab === 'transactions' && (
                        <TransactionsView onSelectTransaction={setSelectedTransaction} />
                      )}

                      {activeTab === 'budgets' && (
                        <BudgetsView
                          onEditBudget={(b) => setEditingBudget(b)}
                          onOpenCreateBudget={() => setIsCreateBudgetOpen(true)}
                          onOpenCreateCategory={() => setIsCreateCategoryOpen(true)}
                          onOpenCreateSavings={() => setIsCreateSavingsOpen(true)}
                          onOpenCreateGoal={(savingsId) => {
                            setCreateGoalDefaultSavingsId(savingsId);
                            setIsCreateGoalOpen(true);
                          }}
                          onOpenSavingsAction={(s, act) => {
                            setSelectedSavingsForAction(s);
                            setSavingsDefaultAction(act);
                            setSavingsDefaultAmount(undefined);
                            setIsSavingsActionOpen(true);
                          }}
                          onOpenGoalAction={(g, act) => {
                            setSelectedGoalForAction(g);
                            setGoalDefaultAction(act);
                            setIsGoalActionOpen(true);
                          }}
                        />
                      )}
                    </>
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
            <div className="fixed bottom-5 left-0 right-0 max-w-[430px] mx-auto px-4 z-40 pointer-events-none flex items-center gap-2">
              <div className="flex-1 min-w-0 pointer-events-auto">
                <FloatingTabBar activeTab={activeTab} onChangeTab={handleTabChange} />
              </div>
              <div className="shrink-0 pointer-events-auto">
                <FloatingActionStack onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
              </div>
            </div>

            {/* Root-Level Bottom Sheets */}
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
              budget={editingBudget}
              isOpen={isCreateBudgetOpen || Boolean(editingBudget)}
              onClose={() => {
                setEditingBudget(null);
                setIsCreateBudgetOpen(false);
              }}
            />

            <CreateCategoryBottomSheet
              isOpen={isCreateCategoryOpen}
              onClose={() => setIsCreateCategoryOpen(false)}
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
                setSavingsDefaultAmount(undefined);
              }}
              savings={selectedSavingsForAction}
              defaultAction={savingsDefaultAction}
              defaultAmount={savingsDefaultAmount}
            />

            <AssignBudgetBottomSheet
              isOpen={Boolean(pendingBudgetConflict)}
              transaction={pendingBudgetConflict?.transaction || null}
              matchingBudgets={pendingBudgetConflict?.matchingBudgets || []}
              onClose={() => setPendingBudgetConflict(null)}
              onAssignBudget={async (txnId, budgetId) => {
                await updateTransaction(txnId, { budgetId });
                setPendingBudgetConflict(null);
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

export default App;
