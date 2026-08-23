import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { useBudgetStore } from '../../src/stores/useBudgetStore';
import { TransactionItemRow } from '../../src/components/transactions/TransactionItemRow';
import { LocationBadge } from '../../src/components/transactions/LocationBadge';
import { X, Trash2, Calendar, Smartphone, Banknote, Building2, Tag, Receipt } from 'lucide-react-native';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const transactions = useTransactionStore(state => state.transactions);
  const deleteTransaction = useTransactionStore(state => state.deleteTransaction);
  const categories = useBudgetStore(state => state.categories);

  const transaction = transactions.find(t => t.id === id);

  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950 px-4 justify-center items-center">
        <Text className="text-zinc-400 text-sm mb-4">Transaction introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-zinc-800 px-4 py-2 rounded-xl">
          <Text className="text-zinc-200 text-xs font-semibold">Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const category = categories.find(c => c.id === transaction.categoryId);
  const isDebit = transaction.flow === 'DEBIT';

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la transaction',
      'Es-tu sûr de vouloir supprimer cette transaction ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(transaction.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 px-4 pt-2">
      {/* Header */}
      <View className="flex-row justify-between items-center py-3 border-b border-white/5">
        <Text className="text-lg font-bold text-zinc-50 tracking-tight">
          Détail de l'opération
        </Text>
        <View className="flex-row items-center space-x-1">
          <TouchableOpacity onPress={handleDelete} className="p-2">
            <Trash2 size={18} color="#FB7185" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <X size={20} color="#A1A1AA" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-4">
        {/* Main Amount Card */}
        <View className="bg-zinc-900 rounded-3xl p-6 border border-white/5 mb-5 items-center">
          <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
            {transaction.title}
          </Text>
          <Text className={`text-4xl font-bold tracking-tight mb-1 ${isDebit ? 'text-zinc-50' : 'text-emerald-400'}`}>
            {isDebit ? '-' : '+'}{transaction.amount.toLocaleString('fr-FR')} Ar
          </Text>

          {transaction.feeAmount > 0 && (
            <Text className="text-xs text-amber-400 font-medium">
              +{transaction.feeAmount.toLocaleString('fr-FR')} Ar frais inclus (Total : {transaction.totalImpact.toLocaleString('fr-FR')} Ar)
            </Text>
          )}

          {transaction.location?.placeName && (
            <View className="mt-3">
              <LocationBadge placeName={transaction.location.placeName} />
            </View>
          )}
        </View>

        {/* Metadata List */}
        <View className="bg-zinc-900/60 rounded-3xl p-5 border border-white/5 mb-5 space-y-3">
          <View className="flex-row justify-between items-center py-1">
            <View className="flex-row items-center">
              <Tag size={16} color="#A1A1AA" />
              <Text className="text-xs text-zinc-400 ml-2">Catégorie</Text>
            </View>
            <Text className="text-xs font-semibold text-zinc-100">
              {category?.name || 'Inconnue'}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-1">
            <View className="flex-row items-center">
              <Smartphone size={16} color="#A1A1AA" />
              <Text className="text-xs text-zinc-400 ml-2">Moyen de paiement</Text>
            </View>
            <Text className="text-xs font-semibold text-zinc-100">
              {transaction.wallet}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-1">
            <View className="flex-row items-center">
              <Calendar size={16} color="#A1A1AA" />
              <Text className="text-xs text-zinc-400 ml-2">Date & Heure</Text>
            </View>
            <Text className="text-xs font-semibold text-zinc-100">
              {new Date(transaction.date).toLocaleString('fr-FR')}
            </Text>
          </View>

          {transaction.source === 'SMS_AUTO' && (
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-zinc-400">Origine</Text>
              <Text className="text-xs font-semibold text-amber-400">
                Capture SMS Automatique
              </Text>
            </View>
          )}
        </View>

        {/* Itemized list if available */}
        {transaction.items && transaction.items.length > 0 && (
          <View className="bg-zinc-900/60 rounded-3xl p-5 border border-white/5 mb-8">
            <View className="flex-row items-center mb-3">
              <Receipt size={16} color="#34D399" />
              <Text className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-2">
                Articles du Ticket ({transaction.items.length})
              </Text>
            </View>

            {transaction.items.map((item, idx) => (
              <TransactionItemRow key={idx} item={item} />
            ))}
          </View>
        )}

        {/* Raw SMS text if present */}
        {transaction.rawSmsText && (
          <View className="bg-zinc-900/40 rounded-2xl p-4 border border-white/5 mb-8">
            <Text className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              SMS Original Reçu
            </Text>
            <Text className="text-xs text-zinc-400 font-mono leading-relaxed">
              {transaction.rawSmsText}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
