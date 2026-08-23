import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { getDatabase } from '../src/db/database';
import { useWalletStore } from '../src/stores/useWalletStore';
import { useBudgetStore } from '../src/stores/useBudgetStore';
import { useTransactionStore } from '../src/stores/useTransactionStore';
import { SmsToastBanner } from '../src/components/feedback/SmsToastBanner';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  useEffect(() => {
    async function init() {
      await getDatabase();
      await Promise.all([loadWallets(), loadBudgets(), loadTransactions()]);
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <StatusBar style="light" />
        <SmsToastBanner />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#090A0C' },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="(modals)/quick-add"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/scan-receipt"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/paste-sms"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="transaction/[id]"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
