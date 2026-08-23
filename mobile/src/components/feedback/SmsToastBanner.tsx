import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { Smartphone, Check, X } from 'lucide-react-native';

export function SmsToastBanner() {
  const pendingSms = useTransactionStore(state => state.pendingSms);
  const confirmPendingSms = useTransactionStore(state => state.confirmPendingSms);
  const setPendingSms = useTransactionStore(state => state.setPendingSms);
  const categories = useBudgetStore(state => state.categories);

  if (!pendingSms) return null;

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const handleSelectCategory = async (categoryId: string) => {
    await confirmPendingSms(categoryId);
  };

  const handleDismiss = () => {
    setPendingSms(null);
  };

  return (
    <View className="absolute top-12 left-4 right-4 z-50 bg-zinc-900 border border-amber-400/30 rounded-3xl p-4 shadow-2xl">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full bg-amber-400/20 items-center justify-center mr-2">
            <Smartphone size={12} color="#FBBF24" />
          </View>
          <Text className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            SMS {pendingSms.operator} Détecté
          </Text>
        </View>

        <TouchableOpacity onPress={handleDismiss} className="p-1">
          <X size={16} color="#71717A" />
        </TouchableOpacity>
      </View>

      <Text className="text-sm font-semibold text-zinc-100 mb-1">
        {pendingSms.amount.toLocaleString('fr-FR')} Ar {pendingSms.feeAmount > 0 ? `(+${pendingSms.feeAmount} Ar frais)` : ''}
      </Text>
      <Text className="text-xs text-zinc-400 mb-3" numberOfLines={2}>
        {pendingSms.rawText}
      </Text>

      <Text className="text-[11px] font-semibold text-zinc-400 mb-2">
        Confirmer la catégorie :
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
        {expenseCategories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            activeOpacity={0.7}
            onPress={() => handleSelectCategory(cat.id)}
            style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}60` }}
            className="px-3 py-1.5 rounded-full mr-2 border flex-row items-center"
          >
            <Text style={{ color: cat.color }} className="text-xs font-semibold">
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
