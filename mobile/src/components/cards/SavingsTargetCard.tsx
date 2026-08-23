import React from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';

export function SavingsTargetCard() {
  const savingsVaultBalance = useWalletStore(state => state.wallets.SAVINGS_VAULT?.balance || 0);
  const monthlySavingsTarget = useBudgetStore(state => state.monthlySavingsTarget);

  const percentage = monthlySavingsTarget > 0
    ? Math.min(100, Math.round((savingsVaultBalance / monthlySavingsTarget) * 100))
    : 0;

  return (
    <View className="bg-zinc-900/90 rounded-3xl p-5 border border-white/5 shadow-xl">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center mr-2.5">
            <ShieldCheck size={18} color="#34D399" />
          </View>
          <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Objectif Épargne du Mois
          </Text>
        </View>
        <Text className="text-sm font-bold text-emerald-400">{percentage}%</Text>
      </View>

      <View className="flex-row items-baseline justify-between my-2">
        <Text className="text-2xl font-bold text-zinc-50 tracking-tight">
          {savingsVaultBalance.toLocaleString('fr-FR')} <Text className="text-sm text-zinc-400">/ {monthlySavingsTarget.toLocaleString('fr-FR')} Ar</Text>
        </Text>
      </View>

      {/* Progress */}
      <View className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
        <View
          style={{ width: `${percentage}%` }}
          className="h-full bg-emerald-400 rounded-full"
        />
      </View>
    </View>
  );
}
