import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Transaction } from '../../types';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { LocationBadge } from './LocationBadge';
import {
  ShoppingCart,
  Home,
  Car,
  Wifi,
  Utensils,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  Tag,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const categories = useBudgetStore(state => state.categories);
  const category = categories.find(c => c.id === transaction.categoryId);

  const isDebit = transaction.flow === 'DEBIT';
  const hasItems = transaction.items && transaction.items.length > 0;

  // Icon mapping
  const renderCategoryIcon = () => {
    const iconName = transaction.icon || category?.icon || 'tag';
    const color = category?.color || '#A1A1AA';

    switch (iconName) {
      case 'shopping-cart':
        return <ShoppingCart size={18} color={color} />;
      case 'home':
        return <Home size={18} color={color} />;
      case 'car':
        return <Car size={18} color={color} />;
      case 'wifi':
        return <Wifi size={18} color={color} />;
      case 'utensils':
        return <Utensils size={18} color={color} />;
      case 'alert-triangle':
        return <AlertTriangle size={18} color={color} />;
      case 'credit-card':
        return <CreditCard size={18} color={color} />;
      case 'shield-check':
        return <ShieldCheck size={18} color={color} />;
      default:
        return <Tag size={18} color={color} />;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row items-center justify-between p-4 bg-zinc-900/60 rounded-2xl mb-2.5 border border-white/5"
    >
      <View className="flex-row items-center flex-1 pr-3">
        {/* Category Icon Container */}
        <View
          style={{ backgroundColor: `${category?.color || '#3F3F46'}20` }}
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        >
          {renderCategoryIcon()}
        </View>

        {/* Details */}
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-sm font-semibold text-zinc-100 mr-2" numberOfLines={1}>
              {transaction.title}
            </Text>

            {/* Receipt Items Badge */}
            {hasItems && (
              <View className="flex-row items-center bg-zinc-800 px-1.5 py-0.5 rounded-md">
                <Receipt size={10} color="#34D399" />
                <Text className="text-[10px] font-bold text-emerald-400 ml-1">
                  {transaction.items?.length}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center mt-0.5">
            <Text className="text-xs text-zinc-400">
              {category?.name || 'Catégorie'}
            </Text>
            <Text className="text-xs text-zinc-600 mx-1.5">•</Text>
            <Text className="text-xs text-zinc-500 font-medium">
              {transaction.wallet}
            </Text>
          </View>

          {transaction.location?.placeName && (
            <LocationBadge placeName={transaction.location.placeName} />
          )}
        </View>
      </View>

      {/* Amount & Fees */}
      <View className="items-end">
        <Text className={`text-sm font-bold ${isDebit ? 'text-zinc-100' : 'text-emerald-400'}`}>
          {isDebit ? '-' : '+'}{transaction.amount.toLocaleString('fr-FR')} Ar
        </Text>

        {transaction.feeAmount > 0 && (
          <Text className="text-[10px] font-medium text-amber-400/90 mt-0.5">
            +{transaction.feeAmount.toLocaleString('fr-FR')} Ar frais
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
