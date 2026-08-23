import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import '../src/styles/global.css';
import { getDatabase } from '../src/db/database';
import { useWalletStore } from '../src/stores/useWalletStore';
import { useBudgetStore } from '../src/stores/useBudgetStore';
import { useTransactionStore } from '../src/stores/useTransactionStore';
import { SmsToastBanner } from '../src/components/feedback/SmsToastBanner';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#090A0C', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#FB7185', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            Une erreur est survenue
          </Text>
          <Text style={{ color: '#A1A1AA', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#34D399', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#090A0C', fontWeight: 'bold', fontSize: 14 }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();
        await Promise.all([loadWallets(), loadBudgets(), loadTransactions()]);
      } catch (err) {
        console.error('Error initializing database or stores:', err);
      }
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <RootErrorBoundary>
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
          </RootErrorBoundary>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
