import React from 'react';
import { View, Text } from 'react-native';
import { CadenceMetrics } from '../../services/burnRateCalculator';

interface CadenceProgressBarProps {
  metrics: CadenceMetrics;
}

export function CadenceProgressBar({ metrics }: CadenceProgressBarProps) {
  const {
    totalBudget,
    totalSpent,
    percentageMonthElapsed,
    percentageBudgetConsumed,
    isAhead,
  } = metrics;

  const barColor = isAhead ? '#34D399' : '#FB7185';

  return (
    <View className="bg-zinc-900/90 rounded-3xl p-5 border border-white/5 shadow-xl">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Cadence du Budget Mensuel
        </Text>
        <Text className="text-xs font-medium text-zinc-300">
          {totalSpent.toLocaleString('fr-FR')} / {totalBudget.toLocaleString('fr-FR')} Ar
        </Text>
      </View>

      {/* Progress Bar Container */}
      <View className="relative w-full h-4 bg-zinc-800 rounded-full my-4 overflow-visible">
        {/* Filled Progress Bar */}
        <View
          style={{
            width: `${Math.min(100, percentageBudgetConsumed)}%`,
            backgroundColor: barColor,
          }}
          className="h-full rounded-full"
        />

        {/* Day-of-month Threshold Marker (|) */}
        <View
          style={{
            left: `${Math.min(98, Math.max(2, percentageMonthElapsed))}%`,
          }}
          className="absolute -top-1.5 bottom-0 w-1 bg-white rounded-full shadow-lg shadow-white/50 h-7 z-10 -ml-0.5"
        />
      </View>

      {/* Legend & Labels */}
      <View className="flex-row justify-between items-center text-xs text-zinc-500">
        <Text className="text-xs text-zinc-400">
          Consommé : <Text className="font-semibold text-zinc-200">{percentageBudgetConsumed}%</Text>
        </Text>
        <View className="flex-row items-center">
          <View className="w-1.5 h-3 bg-white rounded-full mr-1.5" />
          <Text className="text-xs text-zinc-400">
            Jour J : <Text className="font-semibold text-zinc-200">{percentageMonthElapsed}% du mois</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
