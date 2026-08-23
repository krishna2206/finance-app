import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useWalletStore } from '../../stores/useWalletStore';
import { Smartphone, Banknote, ShieldCheck } from 'lucide-react-native';

export function WalletBalanceCard() {
  const wallets = useWalletStore(state => state.wallets);
  const totalSpendable = useWalletStore(state => state.getTotalSpendableBalance());

  const mvolaBalance = wallets.MVOLA?.balance || 0;
  const cashBalance = wallets.CASH?.balance || 0;
  const savingsBalance = wallets.SAVINGS_VAULT?.balance || 0;

  return (
    <View className="bg-zinc-900/90 rounded-3xl p-6 border border-white/5 shadow-2xl">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Solde Réel Disponible
        </Text>
        <View className="flex-row items-center space-x-1">
          <View className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Text className="text-xs font-medium text-emerald-400">En direct</Text>
        </View>
      </View>

      <Text className="text-4xl font-bold text-zinc-50 tracking-tight mb-6">
        {totalSpendable.toLocaleString('fr-FR')} <Text className="text-2xl text-zinc-400 font-semibold">Ar</Text>
      </Text>

      {/* Breakdown by wallets */}
      <View className="flex-row justify-between pt-4 border-t border-white/5">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center mb-1">
            <Smartphone size={14} color="#FBBF24" />
            <Text className="text-xs text-zinc-400 ml-1.5 font-medium">MVola</Text>
          </View>
          <Text className="text-sm font-semibold text-zinc-100">
            {mvolaBalance.toLocaleString('fr-FR')} Ar
          </Text>
        </View>

        <View className="w-[1px] bg-white/5 h-8 self-center" />

        <View className="flex-1 px-2">
          <View className="flex-row items-center mb-1">
            <Banknote size={14} color="#34D399" />
            <Text className="text-xs text-zinc-400 ml-1.5 font-medium">Espèces</Text>
          </View>
          <Text className="text-sm font-semibold text-zinc-100">
            {cashBalance.toLocaleString('fr-FR')} Ar
          </Text>
        </View>

        <View className="w-[1px] bg-white/5 h-8 self-center" />

        <View className="flex-1 pl-2">
          <View className="flex-row items-center mb-1">
            <ShieldCheck size={14} color="#60A5FA" />
            <Text className="text-xs text-zinc-400 ml-1.5 font-medium">Épargne</Text>
          </View>
          <Text className="text-sm font-semibold text-emerald-400">
            {savingsBalance.toLocaleString('fr-FR')} Ar
          </Text>
        </View>
      </View>
    </View>
  );
}
