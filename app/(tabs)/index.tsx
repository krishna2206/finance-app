import React from 'react';
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
import { Plus, Camera, ArrowRight, ShieldAlert } from 'lucide-react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  const transactions = useTransactionStore(state => state.transactions);
  const metrics = useBudgetStore(state => state.getMetrics(transactions));

  const recentTransactions = transactions.slice(0, 5);

  // Calculate monthly total fees
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyFees = transactions
    .filter(t => t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + (t.feeAmount || 0), 0);

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
            className="flex-1 mr-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl py-3.5 px-4 flex-row items-center justify-center"
          >
            <Plus size={18} color="#34D399" />
            <Text className="text-xs font-bold text-emerald-400 ml-2">
              Dépense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(modals)/scan-receipt')}
            className="flex-1 ml-2 bg-zinc-900 border border-white/10 rounded-2xl py-3.5 px-4 flex-row items-center justify-center"
          >
            <Camera size={18} color="#F4F4F5" />
            <Text className="text-xs font-semibold text-zinc-100 ml-2">
              Scan Reçu
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
