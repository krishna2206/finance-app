import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { geminiClient } from '../../src/ai/client';
import { findMatchingTransactionForReceipt } from '../../src/services/receiptReconciliation';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { useBudgetStore } from '../../src/stores/useBudgetStore';
import { ReceiptScanResult, Transaction } from '../../src/types';
import { TransactionItemRow } from '../../src/components/transactions/TransactionItemRow';
import { Camera, Image as ImageIcon, X, Check, AlertCircle, Link2, Plus } from 'lucide-react-native';

export default function ScanReceiptModal() {
  const router = useRouter();
  const categories = useBudgetStore(state => state.categories);
  const addTransaction = useTransactionStore(state => state.addTransaction);
  const enrichWithReceipt = useTransactionStore(state => state.enrichWithReceipt);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [matchingTxn, setMatchingTxn] = useState<Transaction | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à l'appareil photo est nécessaire pour scanner les tickets.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImageUri(result.assets[0].uri);
      await processImage(result.assets[0].base64);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImageUri(result.assets[0].uri);
      await processImage(result.assets[0].base64);
    }
  };

  const processImage = async (base64Data: string) => {
    setIsScanning(true);
    try {
      const parsed = await geminiClient.scanReceiptBase64(base64Data);
      setScanResult(parsed);

      // Check for matching existing transaction
      const match = await findMatchingTransactionForReceipt(parsed.totalAmount, parsed.date);
      setMatchingTxn(match);
    } catch (err: any) {
      Alert.alert('Erreur Vision', err.message || "Impossible d'analyser le ticket.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleMerge = async () => {
    if (!matchingTxn || !scanResult) return;

    const formattedItems = scanResult.items.map((it, idx) => ({
      id: `${matchingTxn.id}-item-${idx}`,
      name: it.name,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      unit: it.unit,
    }));

    await enrichWithReceipt(
      matchingTxn.id,
      formattedItems,
      scanResult.placeName ? { placeName: scanResult.placeName } : undefined
    );

    Alert.alert('Succès', 'La dépense existante a été enrichie avec les articles du ticket !', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleCreateNew = async () => {
    if (!scanResult) return;

    const foodCat = categories.find(c => c.name.toLowerCase().includes('nourriture') || c.name.toLowerCase().includes('courses')) || categories[0];

    const formattedItems = scanResult.items.map((it, idx) => ({
      id: `new-item-${idx}-${Date.now()}`,
      name: it.name,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      unit: it.unit,
    }));

    await addTransaction({
      flow: 'DEBIT',
      operationType: 'EXPENSE_GENERAL',
      wallet: 'MVOLA',
      amount: scanResult.totalAmount,
      feeAmount: 0,
      totalImpact: scanResult.totalAmount,
      title: scanResult.merchant || 'Achat Supermarché',
      categoryId: foodCat.id,
      date: scanResult.date || new Date().toISOString(),
      location: scanResult.placeName ? { placeName: scanResult.placeName } : undefined,
      items: formattedItems,
      source: 'IMAGE_OCR',
    });

    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 px-4 pt-2">
      {/* Header */}
      <View className="flex-row justify-between items-center py-3 border-b border-white/5">
        <Text className="text-lg font-bold text-zinc-50 tracking-tight">
          Scanner un Ticket SCORE
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <X size={20} color="#A1A1AA" />
        </TouchableOpacity>
      </View>

      {!scanResult && !isScanning && (
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 rounded-full bg-zinc-900 border border-white/10 items-center justify-center mb-6">
            <Camera size={36} color="#34D399" />
          </View>
          <Text className="text-base font-bold text-zinc-100 text-center mb-2">
            Prends en photo ton ticket de caisse
          </Text>
          <Text className="text-xs text-zinc-400 text-center mb-8">
            L'IA Gemini va extraire automatiquement le montant, le magasin et la liste détaillée de chaque produit acheté.
          </Text>

          <View className="w-full space-y-3">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={takePhoto}
              className="bg-emerald-500 rounded-2xl py-4 flex-row items-center justify-center mb-3"
            >
              <Camera size={18} color="#090A0C" />
              <Text className="text-sm font-bold text-zinc-950 ml-2">Prendre une photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={pickImage}
              className="bg-zinc-900 border border-white/10 rounded-2xl py-4 flex-row items-center justify-center"
            >
              <ImageIcon size={18} color="#F4F4F5" />
              <Text className="text-sm font-semibold text-zinc-100 ml-2">Choisir depuis la galerie</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isScanning && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#34D399" />
          <Text className="text-sm font-semibold text-zinc-200 mt-4">
            Analyse multimodale Gemini en cours...
          </Text>
          <Text className="text-xs text-zinc-500 mt-1">
            Extraction des articles et du total
          </Text>
        </View>
      )}

      {scanResult && !isScanning && (
        <ScrollView className="flex-1 pt-4" showsVerticalScrollIndicator={false}>
          {/* Matching Banner (Anti-Doublon) */}
          {matchingTxn ? (
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center mb-1">
                <Link2 size={16} color="#34D399" />
                <Text className="text-xs font-bold text-emerald-400 ml-2 uppercase tracking-wider">
                  Dépense Correspondante Trouvée
                </Text>
              </View>
              <Text className="text-xs text-zinc-300">
                Une transaction MVola de {matchingTxn.amount.toLocaleString('fr-FR')} Ar a été enregistrée le {matchingTxn.date.slice(0, 10)}. Fusionner attachera les articles sans débiter ton solde une 2ème fois !
              </Text>
            </View>
          ) : (
            <View className="bg-zinc-900 border border-white/5 rounded-2xl p-3 mb-4 flex-row items-center">
              <AlertCircle size={16} color="#A1A1AA" />
              <Text className="text-xs text-zinc-400 ml-2">
                Aucune transaction existante correspondante. Une nouvelle dépense sera créée.
              </Text>
            </View>
          )}

          {/* Receipt Summary Card */}
          <View className="bg-zinc-900 rounded-3xl p-5 border border-white/5 mb-4">
            <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Marchand
            </Text>
            <Text className="text-lg font-bold text-zinc-100 mb-1">
              {scanResult.merchant || 'Supermarché'}
            </Text>
            {scanResult.placeName && (
              <Text className="text-xs text-zinc-400 mb-3">
                📍 {scanResult.placeName}
              </Text>
            )}

            <View className="pt-3 border-t border-white/5 flex-row justify-between items-baseline">
              <Text className="text-xs font-semibold text-zinc-400 uppercase">Total Reçu</Text>
              <Text className="text-2xl font-bold text-emerald-400">
                {scanResult.totalAmount.toLocaleString('fr-FR')} Ar
              </Text>
            </View>
          </View>

          {/* Items List */}
          <View className="bg-zinc-900/60 rounded-3xl p-5 border border-white/5 mb-8">
            <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Articles Détectés ({scanResult.items.length})
            </Text>
            {scanResult.items.map((item, idx) => (
              <TransactionItemRow
                key={idx}
                item={{
                  id: `temp-${idx}`,
                  name: item.name,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  unit: item.unit,
                }}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View className="mb-8 space-y-3">
            {matchingTxn && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleMerge}
                className="bg-emerald-500 rounded-2xl py-4 flex-row items-center justify-center mb-3"
              >
                <Check size={18} color="#090A0C" />
                <Text className="text-sm font-bold text-zinc-950 ml-2">
                  Fusionner et Enrichir
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCreateNew}
              className={`rounded-2xl py-4 flex-row items-center justify-center ${
                matchingTxn ? 'bg-zinc-900 border border-white/10' : 'bg-emerald-500'
              }`}
            >
              <Plus size={18} color={matchingTxn ? '#F4F4F5' : '#090A0C'} />
              <Text className={`text-sm font-bold ml-2 ${matchingTxn ? 'text-zinc-100' : 'text-zinc-950'}`}>
                Créer comme nouvelle dépense
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
