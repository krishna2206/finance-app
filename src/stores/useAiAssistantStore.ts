import { create } from 'zustand';
import { AiChatMessage } from '../types';
import { geminiClient } from '../ai/client';
import { buildSystemPrompt } from '../ai/agentHarness';
import { useWalletStore } from './useWalletStore';
import { useBudgetStore } from './useBudgetStore';
import { useTransactionStore } from './useTransactionStore';
import * as Crypto from 'expo-crypto';

interface AiAssistantState {
  messages: AiChatMessage[];
  isThinking: boolean;
  isRecording: boolean;
  isTranscribing: boolean;

  sendMessage: (text: string) => Promise<void>;
  processAudioVoiceMemo: (audioBase64: string) => Promise<string>;
  clearHistory: () => void;
  setRecording: (recording: boolean) => void;
}

export const useAiAssistantStore = create<AiAssistantState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Bonjour ! Je suis ton AI Assistant financier. Tu peux me dicter une dépense, m'envoyer un reçu ou me demander l'impact d'un achat sur ton reste à vivre.",
      timestamp: Date.now(),
    },
  ],
  isThinking: false,
  isRecording: false,
  isTranscribing: false,

  setRecording: (recording) => {
    set({ isRecording: recording });
  },

  processAudioVoiceMemo: async (audioBase64: string) => {
    set({ isTranscribing: true });
    try {
      const text = await geminiClient.transcribeAudioBase64(audioBase64);
      set({ isTranscribing: false });
      return text;
    } catch (error: any) {
      set({ isTranscribing: false });
      throw error;
    }
  },

  sendMessage: async (userText: string) => {
    const userMsg: AiChatMessage = {
      id: Crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    set(state => ({
      messages: [...state.messages, userMsg],
      isThinking: true,
    }));

    try {
      const wallets = useWalletStore.getState().wallets;
      const categories = useBudgetStore.getState().categories;
      const transactions = useTransactionStore.getState().transactions;
      const metrics = useBudgetStore.getState().getMetrics(transactions);

      const systemPrompt = buildSystemPrompt(wallets, categories, metrics, transactions);

      // Build history for Gemini
      const history = get().messages.map(m => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      }));

      const response = await geminiClient.sendAgentMessage(systemPrompt, history);

      let finalContent = response.text || '';
      const executedToolResults: Array<{ name: string; args: any; result: any }> = [];

      // Execute tool calls if returned by Gemini
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const tc of response.toolCalls) {
          if (tc.name === 'record_expense') {
            const { title, amount, feeAmount = 0, categoryId, wallet, date, note, placeName } = tc.args;
            const category = categories.find(c => c.id === categoryId) || categories[0];
            const totalImpact = Number(amount) + Number(feeAmount);

            const created = await useTransactionStore.getState().addTransaction({
              flow: 'DEBIT',
              operationType: 'EXPENSE_GENERAL',
              wallet: wallet || 'CASH',
              amount: Number(amount),
              feeAmount: Number(feeAmount),
              totalImpact,
              title: title || 'Dépense',
              categoryId: category.id,
              date: date || new Date().toISOString(),
              note: note || undefined,
              location: placeName ? { placeName } : undefined,
              source: 'VOICE',
            });

            executedToolResults.push({
              name: 'record_expense',
              args: tc.args,
              result: { success: true, transactionId: created.id, totalImpact },
            });

            finalContent = finalContent || `Dépense de ${Number(amount).toLocaleString('fr-FR')} Ar enregistrée dans "${category.name}" (${wallet}).`;
          } else if (tc.name === 'record_income') {
            const { title, amount, wallet, date, note } = tc.args;
            const salaryCat = categories.find(c => c.name.toLowerCase().includes('revenu') || c.name.toLowerCase().includes('salaire')) || categories[0];

            const created = await useTransactionStore.getState().addTransaction({
              flow: 'CREDIT',
              operationType: 'INCOME_TRANSFER',
              wallet: wallet || 'MVOLA',
              amount: Number(amount),
              feeAmount: 0,
              totalImpact: Number(amount),
              title: title || 'Entrée d argent',
              categoryId: salaryCat.id,
              date: date || new Date().toISOString(),
              note: note || undefined,
              source: 'VOICE',
            });

            executedToolResults.push({
              name: 'record_income',
              args: tc.args,
              result: { success: true, transactionId: created.id },
            });

            finalContent = finalContent || `Entrée de ${Number(amount).toLocaleString('fr-FR')} Ar créditée sur ${wallet}.`;
          } else if (tc.name === 'adjust_budget') {
            const { categoryId, newMonthlyBudget } = tc.args;
            await useBudgetStore.getState().updateCategoryBudget(categoryId, Number(newMonthlyBudget));
            executedToolResults.push({
              name: 'adjust_budget',
              args: tc.args,
              result: { success: true },
            });
            finalContent = finalContent || `Budget mis à jour à ${Number(newMonthlyBudget).toLocaleString('fr-FR')} Ar.`;
          }
        }
      }

      const assistantMsg: AiChatMessage = {
        id: Crypto.randomUUID(),
        role: 'assistant',
        content: finalContent || "C'est noté !",
        timestamp: Date.now(),
        toolCalls: executedToolResults,
      };

      set(state => ({
        messages: [...state.messages, assistantMsg],
        isThinking: false,
      }));
    } catch (error: any) {
      const errorMsg: AiChatMessage = {
        id: Crypto.randomUUID(),
        role: 'assistant',
        content: `Désolé, une erreur est survenue : ${error.message || error}`,
        timestamp: Date.now(),
      };
      set(state => ({
        messages: [...state.messages, errorMsg],
        isThinking: false,
      }));
    }
  },

  clearHistory: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Historique réinitialisé. Comment puis-je t'aider aujourd'hui ?",
          timestamp: Date.now(),
        },
      ],
    });
  },
}));
