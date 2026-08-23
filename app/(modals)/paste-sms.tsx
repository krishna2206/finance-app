import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseMobileMoneySms } from '../../src/services/smsParser';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { X, Smartphone, Sparkles, Send } from 'lucide-react-native';

const SAMPLE_SMS = [
  {
    label: 'Transfert sortant MVola',
    text: "Nandefa 25 000 Ar tany amin'ny 0341122233. Frais: 450 Ar. Solde restant: 570 050 Ar. Ref: 189283749",
  },
  {
    label: 'Retrait Cash Point',
    text: "Retrait de 40 000 Ar au Cash Point Ankorondrano. Frais: 1 800 Ar. Solde restant: 528 250 Ar. Ref: 987654321",
  },
  {
    label: 'Réception Salaire',
    text: "Voaray ny 800 000 Ar avy tamin'ny Entreprise Salaire tamin'ny 21/08/26. Solde: 1 328 250 Ar. Ref: 55443322",
  },
  {
    label: 'Achat Forfait Net',
    text: "Nividy tolotra 10 000 Ar Net One. Solde restant: 518 250 Ar. Ref: 88776655",
  },
];

export default function PasteSmsModal() {
  const router = useRouter();
  const [smsText, setSmsText] = useState('');
  const setPendingSms = useTransactionStore(state => state.setPendingSms);

  const handleProcessSms = (textToParse: string) => {
    if (!textToParse.trim()) {
      Alert.alert('Erreur', 'Veuillez coller le texte d un SMS.');
      return;
    }

    const parsed = parseMobileMoneySms(textToParse);
    if (!parsed.isMatch) {
      Alert.alert('Format non reconnu', "Le texte saisi ne correspond pas à un format SMS MVola ou Mobile Money connu.");
      return;
    }

    // Set pending SMS to trigger the in-app interactive toast
    setPendingSms(parsed);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 px-4 pt-2">
      {/* Header */}
      <View className="flex-row justify-between items-center py-3 border-b border-white/5">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-amber-400/20 items-center justify-center mr-2.5">
            <Smartphone size={16} color="#FBBF24" />
          </View>
          <Text className="text-lg font-bold text-zinc-50 tracking-tight">
            Coller / Simuler un SMS
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <X size={20} color="#A1A1AA" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-4">
        <Text className="text-xs text-zinc-400 mb-3 leading-relaxed">
          Colle ici le texte d'un SMS de transfert ou de retrait MVola reçu sur ton téléphone pour tester l'interception automatique et l'auto-catégorisation en direct.
        </Text>

        <TextInput
          multiline
          numberOfLines={4}
          value={smsText}
          onChangeText={setSmsText}
          placeholder="Colle ton SMS MVola ici (ex: Nandefa 25 000 Ar...)"
          placeholderTextColor="#52525B"
          className="bg-zinc-900 border border-white/10 rounded-2xl p-4 text-sm text-zinc-100 font-medium mb-4 min-h-[100px]"
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleProcessSms(smsText)}
          disabled={!smsText.trim()}
          className={`py-3.5 rounded-2xl flex-row items-center justify-center mb-6 shadow-lg ${
            smsText.trim() ? 'bg-amber-400 shadow-amber-400/20' : 'bg-zinc-900 border border-white/5'
          }`}
        >
          <Send size={16} color={smsText.trim() ? '#090A0C' : '#71717A'} />
          <Text className={`text-xs font-bold ml-2 ${smsText.trim() ? 'text-zinc-950' : 'text-zinc-500'}`}>
            Analyser et Capturer
          </Text>
        </TouchableOpacity>

        {/* Sample SMS buttons */}
        <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
          Ou teste avec un exemple type :
        </Text>

        <View className="space-y-2.5 mb-8">
          {SAMPLE_SMS.map((sample, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => handleProcessSms(sample.text)}
              className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3.5 mb-2"
            >
              <View className="flex-row items-center mb-1">
                <Sparkles size={12} color="#FBBF24" />
                <Text className="text-xs font-bold text-zinc-200 ml-1.5">
                  {sample.label}
                </Text>
              </View>
              <Text className="text-[11px] text-zinc-500 font-mono" numberOfLines={2}>
                {sample.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
