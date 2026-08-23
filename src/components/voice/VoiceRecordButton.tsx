import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Mic, Square } from 'lucide-react-native';
import { useAiAssistantStore } from '../../stores/useAiAssistantStore';

interface VoiceRecordButtonProps {
  onTranscriptionComplete?: (text: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceRecordButton({ onTranscriptionComplete, size = 'md' }: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const isTranscribing = useAiAssistantStore(state => state.isTranscribing);
  const processAudioVoiceMemo = useAiAssistantStore(state => state.processAudioVoiceMemo);
  const sendMessage = useAiAssistantStore(state => state.sendMessage);

  const startRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return;

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.log('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await recorder.stop();
      setIsRecording(false);
      const uri = recorder.uri;

      if (uri) {
        // Read audio file as base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          if (base64Data) {
            const transcribedText = await processAudioVoiceMemo(base64Data);
            if (onTranscriptionComplete) {
              onTranscriptionComplete(transcribedText);
            } else if (transcribedText) {
              await sendMessage(transcribedText);
            }
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      setIsRecording(false);
      console.log('Failed to stop recording', err);
    }
  };

  const buttonSize = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = size === 'lg' ? 26 : size === 'sm' ? 18 : 22;

  if (isTranscribing) {
    return (
      <View className={`${buttonSize} rounded-full bg-zinc-800 items-center justify-center border border-white/10`}>
        <ActivityIndicator size="small" color="#34D399" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={startRecording}
      onPressOut={stopRecording}
      className={`${buttonSize} rounded-full items-center justify-center shadow-lg ${
        isRecording
          ? 'bg-rose-500 shadow-rose-500/50 scale-105'
          : 'bg-emerald-500 shadow-emerald-500/30'
      }`}
    >
      {isRecording ? (
        <Square size={iconSize} color="#FFFFFF" />
      ) : (
        <Mic size={iconSize} color="#090A0C" />
      )}
    </TouchableOpacity>
  );
}
