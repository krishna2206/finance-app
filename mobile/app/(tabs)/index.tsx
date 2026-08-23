import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletBalanceCard } from '../../src/components/cards/WalletBalanceCard';
import { DailyBurnCard } from '../../src/components/cards/DailyBurnCard';
import { CadenceProgressBar } from '../../src/components/charts/CadenceProgressBar';
import { TransactionRow } from '../../src/components/transactions/TransactionRow';
import { VoiceRecordButton } from '../../src/components/voice/VoiceRecordButton';
import { useWalletStore } from '../../src/stores/useWalletStore';
import { useBudgetStore } from '../../src/stores/useBudgetStore';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { calculateCadenceMetrics } from '../../src/services/burnRateCalculator';
import { Plus, Camera, ArrowRight, ShieldAlert, Smartphone } from 'lucide-react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  const transactions = useTransactionStore(state => state.transactions);
  const categories = useBudgetStore(state => state.categories);
  const wallets = useWalletStore(state => state.wallets);
  const monthlySavingsTarget = useBudgetStore(state => state.monthlySavingsTarget);

  const metrics = useMemo(() => {
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
    const totalBudget = expenseCategories.reduce((sum, c) => sum + c.monthlyBudget, 0);
    const spendableBalance = Object.values(wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);

    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const spendingMap: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.flow === 'DEBIT' && t.date.startsWith(currentYearMonth)) {
        spendingMap[t.categoryId] = (spendingMap[t.categoryId] || 0) + t.totalImpact;
      }
    });

    let totalSpent = 0;
    let fixedChargesRemaining = 0;
    expenseCategories.forEach(c => {
      const spent = spendingMap[c.id] || 0;
      totalSpent += spent;
      if (c.isEssential && spent < c.monthlyBudget) {
        fixedChargesRemaining += (c.monthlyBudget - spent);
      }
    });

    const savingsVaultBalance = wallets.SAVINGS_VAULT?.balance || 0;
    const remainingSavings = Math.max(0, monthlySavingsTarget - savingsVaultBalance);

    return calculateCadenceMetrics(
      totalBudget,
      totalSpent,
      spendableBalance,
      remainingSavings,
      fixedChargesRemaining
    );
  }, [transactions, categories, wallets, monthlySavingsTarget]);

  const recentTransactions = transactions.slice(0, 5);

  // Calculate monthly total fees
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyFees = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + (t.feeAmount || 0), 0);
  }, [transactions, currentMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWallets(), loadBudgets(), loadTransactions()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-zinc-950">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#34D399" />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center py-4">
          <View>
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Tableau de bord
            </Text>
            <Text className="text-2xl font-bold text-zinc-50 tracking-tight">
              Aperçu Financier
            </Text>
          </View>
          <VoiceRecordButton size="md" />
        </View>

        {/* 1. Solde Réel Total Card */}
        <View className="mb-4">
          <WalletBalanceCard />
        </View>

        {/* Quick Actions */}
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(modals)/quick-add')}
            className="flex-1 mr-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl py-3.5 px-2 flex-row items-center justify-center"
          >
            <Plus size={16} color="#34D399" />
            <Text className="text-xs font-bold text-emerald-400 ml-1.5">
              Dépense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(modals)/scan-receipt')}
            className="flex-1 mx-1.5 bg-zinc-900 border border-white/10 rounded-2xl py-3.5 px-2 flex-row items-center justify-center"
          >
            <Camera size={16} color="#F4F4F5" />
            <Text className="text-xs font-semibold text-zinc-100 ml-1.5">
              Scan Reçu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(modals)/paste-sms')}
            className="flex-1 ml-1.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl py-3.5 px-2 flex-row items-center justify-center"
          >
            <Smartphone size={16} color="#FBBF24" />
            <Text className="text-xs font-semibold text-amber-400 ml-1.5">
              Simuler SMS
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Reste à Vivre Journalier Card */}
        <View className="mb-4">
          <DailyBurnCard metrics={metrics} />
        </View>

        {/* 3. Barre de Cadence Budgétaire */}
        <View className="mb-4">
          <CadenceProgressBar metrics={metrics} />
        </View>

        {/* 4. Total des Frais Mobiles du mois */}
        {monthlyFees > 0 && (
          <View className="bg-zinc-900/60 border border-amber-400/20 rounded-2xl p-3.5 mb-5 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <ShieldAlert size={16} color="#FBBF24" />
              <Text className="text-xs text-zinc-400 ml-2">
                Frais Mobile Money cumulés ce mois :
              </Text>
            </View>
            <Text className="text-xs font-bold text-amber-400">
              {monthlyFees.toLocaleString('fr-FR')} Ar
            </Text>
          </View>
        )}

        {/* 5. Dernières Transactions */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              Activités Récentes
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/transactions')}
              className="flex-row items-center"
            >
              <Text className="text-xs text-emerald-400 font-semibold mr-1">Voir tout</Text>
              <ArrowRight size={12} color="#34D399" />
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View className="bg-zinc-900/40 rounded-2xl p-6 items-center border border-white/5">
              <Text className="text-xs text-zinc-500 text-center font-medium">
                Aucune transaction pour le moment.{"\n"}Tape sur "+" ou utilise le micro pour enregistrer ta première dépense !
              </Text>
            </View>
          ) : (
            recentTransactions.map(txn => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                onPress={() => router.push(`/transaction/${txn.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
