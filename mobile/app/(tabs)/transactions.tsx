import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { TransactionRow } from '../../src/components/transactions/TransactionRow';
import { Plus } from 'lucide-react-native';

export default function TransactionsScreen() {
  const router = useRouter();
  const transactions = useTransactionStore(state => state.transactions);
  const filter = useTransactionStore(state => state.filter);
  const setFilter = useTransactionStore(state => state.setFilter);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (filter === 'INCOME') return transactions.filter(t => t.flow === 'CREDIT');
    if (filter === 'EXPENSE') return transactions.filter(t => t.flow === 'DEBIT' && t.operationType !== 'WITHDRAWAL_CASH');
    if (filter === 'TRANSFER') return transactions.filter(t => t.operationType === 'WITHDRAWAL_CASH' || t.operationType === 'SAVINGS_TRANSFER' || t.operationType === 'TRANSFER_P2P');
    return transactions;
  }, [transactions, filter]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    filteredTransactions.forEach(t => {
      const dateKey = t.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const formatDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dateStr === today) return "Aujourd'hui";
    if (dateStr === yesterday) return "Hier";

    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-zinc-950">
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-white/5">
        <View>
          <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Grand Livre
          </Text>
          <Text className="text-xl font-bold text-zinc-50 tracking-tight">
            Historique ({filteredTransactions.length})
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(modals)/quick-add')}
          className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center shadow-lg"
        >
          <Plus size={20} color="#090A0C" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="px-4 py-3 flex-row space-x-2">
        {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map(f => {
          const isActive = filter === f;
          const label = f === 'ALL' ? 'Tous' : f === 'EXPENSE' ? 'Dépenses' : f === 'INCOME' ? 'Entrées' : 'Transferts';
          return (
            <TouchableOpacity
              key={f}
              activeOpacity={0.7}
              onPress={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full border ${
                isActive
                  ? 'bg-zinc-100 border-zinc-100'
                  : 'bg-zinc-900 border-white/5'
              }`}
            >
              <Text className={`text-xs font-semibold ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {Object.keys(groupedTransactions).length === 0 ? (
          <View className="py-16 items-center">
            <Text className="text-xs text-zinc-500 font-medium">
              Aucune transaction trouvée pour ce filtre.
            </Text>
          </View>
        ) : (
          Object.entries(groupedTransactions).map(([dateKey, txns]) => (
            <View key={dateKey} className="mb-4">
              <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-2 capitalize">
                {formatDateLabel(dateKey)}
              </Text>
              {txns.map(t => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onPress={() => router.push(`/transaction/${t.id}`)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
