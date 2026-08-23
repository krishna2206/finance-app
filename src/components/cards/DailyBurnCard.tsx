import React from 'react';
import { View, Text } from 'react-native';
import { Flame, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { CadenceMetrics } from '../../services/burnRateCalculator';

interface DailyBurnCardProps {
  metrics: CadenceMetrics;
}

export function DailyBurnCard({ metrics }: DailyBurnCardProps) {
  const isHealthy = metrics.dailyBurnRate > 0 && metrics.isAhead;

  return (
    <View className="bg-zinc-900/90 rounded-3xl p-5 border border-white/5 shadow-xl">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className={`w-8 h-8 rounded-full items-center justify-center ${isHealthy ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            {isHealthy ? (
              <CheckCircle size={18} color="#34D399" />
            ) : (
              <AlertTriangle size={18} color="#FB7185" />
            )}
          </View>
          <View className="ml-3">
            <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Reste à Vivre Quotidien
            </Text>
            <Text className="text-xs text-zinc-500 font-medium">
              Pour les {metrics.remainingDays} jours restants du mois
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-baseline justify-between">
        <Text className="text-3xl font-bold text-zinc-50 tracking-tight">
          {metrics.dailyBurnRate.toLocaleString('fr-FR')} <Text className="text-xl text-zinc-400 font-semibold">Ar/j</Text>
        </Text>

        <View className={`px-3 py-1 rounded-full ${metrics.isAhead ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
          <Text className={`text-xs font-semibold ${metrics.isAhead ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.isAhead ? `+${metrics.deltaPercentage}% avance` : `-${metrics.deltaPercentage}% rythme`}
          </Text>
        </View>
      </View>
    </View>
  );
}
