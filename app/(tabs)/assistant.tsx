import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAiAssistantStore } from '../../src/stores/useAiAssistantStore';
import { VoiceRecordButton } from '../../src/components/voice/VoiceRecordButton';
import { Send, Trash2, Sparkles, CheckCircle2 } from 'lucide-react-native';

export default function AssistantScreen() {
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const messages = useAiAssistantStore(state => state.messages);
  const isThinking = useAiAssistantStore(state => state.isThinking);
  const isTranscribing = useAiAssistantStore(state => state.isTranscribing);
  const sendMessage = useAiAssistantStore(state => state.sendMessage);
  const clearHistory = useAiAssistantStore(state => state.clearHistory);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(text);
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-zinc-950">
      {/* Header */}
      <View className="px-4 py-3 border-b border-white/5 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center mr-2.5">
            <Sparkles size={16} color="#34D399" />
          </View>
          <View>
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Copilote Financier
            </Text>
            <Text className="text-base font-bold text-zinc-50 tracking-tight">
              AI Assistant
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={clearHistory} className="p-2">
          <Trash2 size={16} color="#71717A" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={msg.id}
              className={`mb-4 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <View
                className={`max-w-[85%] rounded-3xl p-4 ${
                  isUser
                    ? 'bg-emerald-500 text-zinc-950 rounded-br-sm'
                    : 'bg-zinc-900 border border-white/5 rounded-bl-sm'
                }`}
              >
                <Text
                  className={`text-sm leading-relaxed ${
                    isUser ? 'text-zinc-950 font-medium' : 'text-zinc-200 font-normal'
                  }`}
                >
                  {msg.content}
                </Text>

                {/* Tool calls execution feedback badges */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <View className="mt-2.5 pt-2 border-t border-white/10">
                    {msg.toolCalls.map((tc, idx) => (
                      <View key={idx} className="flex-row items-center bg-zinc-800/80 px-2 py-1 rounded-md mb-1">
                        <CheckCircle2 size={12} color="#34D399" />
                        <Text className="text-[10px] text-emerald-400 font-semibold ml-1.5">
                          Action exécutée : {tc.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {isThinking && (
          <View className="mb-4 flex-row justify-start">
            <View className="bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3 flex-row items-center">
              <ActivityIndicator size="small" color="#34D399" />
              <Text className="text-xs text-zinc-400 ml-2 font-medium">
                L'assistant analyse tes données...
              </Text>
            </View>
          </View>
        )}

        {isTranscribing && (
          <View className="mb-4 flex-row justify-start">
            <View className="bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3 flex-row items-center">
              <ActivityIndicator size="small" color="#FBBF24" />
              <Text className="text-xs text-amber-400 ml-2 font-medium">
                Transcription vocale Gemini en cours...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="px-4 py-3 bg-zinc-900/90 border-t border-white/5 flex-row items-center space-x-2">
          <VoiceRecordButton size="md" />

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écris ou dicte ta dépense..."
            placeholderTextColor="#52525B"
            className="flex-1 bg-zinc-800 text-zinc-100 px-4 py-3 rounded-2xl text-sm font-medium"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            className={`w-11 h-11 rounded-2xl items-center justify-center ${
              inputText.trim() ? 'bg-emerald-500' : 'bg-zinc-800'
            }`}
          >
            <Send size={18} color={inputText.trim() ? '#090A0C' : '#52525B'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
