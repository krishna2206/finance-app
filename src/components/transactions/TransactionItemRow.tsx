import React from 'react';
import { View, Text } from 'react-native';
import { TransactionItem } from '../../types';

interface TransactionItemRowProps {
  item: TransactionItem;
}

export function TransactionItemRow({ item }: TransactionItemRowProps) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-white/5">
      <View className="flex-1 pr-2">
        <Text className="text-sm font-medium text-zinc-200">
          {item.name}
        </Text>
        {item.unitPrice && (
          <Text className="text-xs text-zinc-500 mt-0.5">
            {item.quantity}x {item.unitPrice.toLocaleString('fr-FR')} Ar {item.unit ? `/${item.unit}` : ''}
          </Text>
        )}
      </View>

      <Text className="text-sm font-semibold text-zinc-100">
        {item.totalPrice.toLocaleString('fr-FR')} Ar
      </Text>
    </View>
  );
}
