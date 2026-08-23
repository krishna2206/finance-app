import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBudgetStore } from '../../src/stores/useBudgetStore';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { calculateMVolaFees } from '../../src/services/mvolaFeeCalculator';
import { WalletSource } from '../../src/types';
import { X, Smartphone, Banknote, Building2, ShieldCheck, Check } from 'lucide-react-native';

export default function QuickAddModal() {
  const router = useRouter();
  const categories = useBudgetStore(state => state.categories);
  const addTransaction = useTransactionStore(state => state.addTransaction);

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletSource>('CASH');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [includeFees, setIncludeFees] = useState(true);

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const numericAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;
  const { transferFee } = calculateMVolaFees(numericAmount);
  const feeAmount = (selectedWallet === 'MVOLA' && includeFees) ? transferFee : 0;
  const totalImpact = numericAmount + feeAmount;

  const handleSubmit = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant supérieur à 0 Ar.');
      return;
    }

    const finalTitle = title.trim() || categories.find(c => c.id === selectedCategoryId)?.name || 'Dépense';

    await addTransaction({
      flow: 'DEBIT',
      operationType: 'EXPENSE_GENERAL',
      wallet: selectedWallet,
      amount: numericAmount,
      feeAmount,
      totalImpact,
      title: finalTitle,
      categoryId: selectedCategoryId || categories[0]?.id,
      date: new Date().toISOString(),
      source: 'MANUAL',
    });

    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 px-4 pt-2">
      {/* Header */}
      <View className="flex-row justify-between items-center py-3 border-b border-white/5">
        <Text className="text-lg font-bold text-zinc-50 tracking-tight">
          Nouvelle Dépense
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <X size={20} color="#A1A1AA" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-4">
        {/* Amount Input */}
        <View className="items-center py-4 bg-zinc-900/60 rounded-3xl border border-white/5 mb-5">
          <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Montant de la dépense
          </Text>
          <View className="flex-row items-baseline">
            <TextInput
              autoFocus
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#52525B"
              className="text-4xl font-bold text-zinc-50 text-center tracking-tight"
            />
            <Text className="text-2xl font-bold text-zinc-400 ml-1.5">Ar</Text>
          </View>

          {selectedWallet === 'MVOLA' && transferFee > 0 && (
            <TouchableOpacity
              onPress={() => setIncludeFees(!includeFees)}
              className="flex-row items-center mt-2 bg-amber-400/15 px-3 py-1 rounded-full border border-amber-400/30"
            >
              <View className={`w-3.5 h-3.5 rounded mr-1.5 items-center justify-center ${includeFees ? 'bg-amber-400' : 'border border-amber-400'}`}>
                {includeFees && <Check size={10} color="#090A0C" />}
              </View>
              <Text className="text-xs font-semibold text-amber-400">
                +{transferFee} Ar frais MVola (Total : {totalImpact.toLocaleString('fr-FR')} Ar)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title / Description */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Description (Optionnel)
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Courses au marché, Déjeuner..."
            placeholderTextColor="#52525B"
            className="bg-zinc-900 border border-white/10 rounded-2xl p-4 text-sm text-zinc-100 font-medium"
          />
        </View>

        {/* Wallet Selection */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Moyen de Paiement
          </Text>
          <View className="flex-row space-x-2">
            {[
              { id: 'CASH', label: 'Espèces', icon: Banknote, color: '#34D399' },
              { id: 'MVOLA', label: 'MVola', icon: Smartphone, color: '#FBBF24' },
              { id: 'BANK', label: 'Banque', icon: Building2, color: '#60A5FA' },
            ].map(w => {
              const isSelected = selectedWallet === w.id;
              const Icon = w.icon;
              return (
                <TouchableOpacity
                  key={w.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedWallet(w.id as WalletSource)}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${
                    isSelected
                      ? 'bg-zinc-800 border-white/20'
                      : 'bg-zinc-900/60 border-white/5'
                  }`}
                >
                  <Icon size={16} color={w.color} />
                  <Text className={`text-xs font-bold ml-1.5 ${isSelected ? 'text-zinc-50' : 'text-zinc-400'}`}>
                    {w.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Selection */}
        <View className="mb-8">
          <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Catégorie
          </Text>
          <View className="flex-row flex-wrap">
            {expenseCategories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={{
                    backgroundColor: isSelected ? `${cat.color}25` : '#18181B',
                    borderColor: isSelected ? cat.color : 'rgba(255, 255, 255, 0.05)',
                  }}
                  className="px-3.5 py-2.5 rounded-2xl mr-2 mb-2 border flex-row items-center"
                >
                  <View
                    style={{ backgroundColor: cat.color }}
                    className="w-2.5 h-2.5 rounded-full mr-2"
                  />
                  <Text
                    style={{ color: isSelected ? cat.color : '#A1A1AA' }}
                    className="text-xs font-semibold"
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="py-4 border-t border-white/5">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          className="bg-emerald-500 rounded-2xl py-4 items-center shadow-lg shadow-emerald-500/20"
        >
          <Text className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
            Enregistrer ({totalImpact.toLocaleString('fr-FR')} Ar)
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
