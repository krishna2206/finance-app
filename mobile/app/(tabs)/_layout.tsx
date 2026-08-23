import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Receipt, PieChart, Sparkles } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#13151A',
          borderTopColor: 'rgba(255, 255, 255, 0.06)',
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#34D399',
        tabBarInactiveTintColor: '#71717A',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => <Receipt size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, size }) => <PieChart size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant IA',
          tabBarIcon: ({ color, size }) => <Sparkles size={size || 20} color={color} />,
        }}
      />
    </Tabs>
  );
}
