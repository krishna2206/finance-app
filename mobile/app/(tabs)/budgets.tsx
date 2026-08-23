import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBudgetStore } from '../../src/stores/useBudgetStore';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { SavingsTargetCard } from '../../src/components/cards/SavingsTargetCard';
import { Category } from '../../src/types';
import { Edit3, Check, X, ShieldAlert } from 'lucide-react-native';

export default function BudgetsScreen() {
  const categories = useBudgetStore(state => state.categories);
  const updateCategoryBudget = useBudgetStore(state => state.updateCategoryBudget);
  const transactions = useTransactionStore(state => state.transactions);

  const spendingMap = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.flow === 'DEBIT' && t.date.startsWith(currentYearMonth)) {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.totalImpact;
      }
    });
    return map;
  }, [transactions]);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setBudgetInput(String(cat.monthlyBudget));
  };

  const handleSaveBudget = async () => {
    if (!editingCategory) return;
    const newAmount = parseInt(budgetInput.replace(/\s/g, ''), 10);
    if (isNaN(newAmount) || newAmount < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }

    await updateCategoryBudget(editingCategory.id, newAmount);
    setEditingCategory(null);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-zinc-950">
      <View className="px-4 py-3 border-b border-white/5">
        <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Gestion des Enveloppes
        </Text>
        <Text className="text-xl font-bold text-zinc-50 tracking-tight">
          Budgets & Épargne
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* 1. Épargne Sanctuarisée Card */}
        <View className="mb-6">
          <SavingsTargetCard />
        </View>

        {/* 2. Enveloppes de Dépenses */}
        <View className="mb-8">
          <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            Enveloppes de Dépenses Mensuelles ({expenseCategories.length})
          </Text>

          {expenseCategories.map(cat => {
            const spent = spendingMap[cat.id] || 0;
            const percentage = cat.monthlyBudget > 0
              ? Math.min(100, Math.round((spent / cat.monthlyBudget) * 100))
              : 0;
            const isOverBudget = spent > cat.monthlyBudget;
            const remaining = cat.monthlyBudget - spent;

            return (
              <View
                key={cat.id}
                className="bg-zinc-900/70 border border-white/5 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row justify-between items-center mb-1.5">
                  <View className="flex-row items-center flex-1">
                    <View
                      style={{ backgroundColor: cat.color }}
                      className="w-3 h-3 rounded-full mr-2"
                    />
                    <Text className="text-sm font-bold text-zinc-100 mr-2" numberOfLines={1}>
                      {cat.name}
                    </Text>
                    {cat.isEssential && (
                      <View className="bg-zinc-800 px-1.5 py-0.5 rounded">
                        <Text className="text-[10px] text-zinc-400 font-semibold">Fixe</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleOpenEdit(cat)}
                    className="p-1"
                  >
                    <Edit3 size={14} color="#71717A" />
                  </TouchableOpacity>
                </View>

                {/* Amounts */}
                <View className="flex-row justify-between items-baseline my-1">
                  <Text className="text-xs text-zinc-400">
                    Dépensé : <Text className="font-semibold text-zinc-200">{spent.toLocaleString('fr-FR')} Ar</Text>
                  </Text>
                  <Text className="text-xs text-zinc-400">
                    Plafond : <Text className="font-semibold text-zinc-200">{cat.monthlyBudget.toLocaleString('fr-FR')} Ar</Text>
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden my-1.5">
                  <View
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isOverBudget ? '#FB7185' : cat.color,
                    }}
                    className="h-full rounded-full"
                  />
                </View>

                {/* Footer status */}
                <View className="flex-row justify-between items-center mt-1">
                  <Text className="text-[10px] text-zinc-500">
                    {percentage}% consommé
                  </Text>
                  <Text className={`text-[10px] font-semibold ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isOverBudget
                      ? `Dépassement de ${Math.abs(remaining).toLocaleString('fr-FR')} Ar`
                      : `Reste : ${remaining.toLocaleString('fr-FR')} Ar`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal to edit budget */}
      <Modal visible={Boolean(editingCategory)} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="w-full bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-zinc-50">
                Modifier le budget : {editingCategory?.name}
              </Text>
              <TouchableOpacity onPress={() => setEditingCategory(null)}>
                <X size={20} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-zinc-400 mb-2">
              Nouveau plafond mensuel (en Ariary) :
            </Text>

            <TextInput
              keyboardType="numeric"
              value={budgetInput}
              onChangeText={setBudgetInput}
              className="bg-zinc-800 text-zinc-50 text-xl font-bold rounded-2xl p-4 mb-6 border border-white/10"
              placeholder="0"
              placeholderTextColor="#52525B"
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setEditingCategory(null)}
                className="flex-1 bg-zinc-800 py-3.5 rounded-2xl items-center"
              >
                <Text className="text-xs font-semibold text-zinc-300">Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveBudget}
                className="flex-1 bg-emerald-500 py-3.5 rounded-2xl items-center"
              >
                <Text className="text-xs font-bold text-zinc-950">Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
