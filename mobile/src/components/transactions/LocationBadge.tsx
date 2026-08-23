import React from 'react';
import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';

interface LocationBadgeProps {
  placeName: string;
}

export function LocationBadge({ placeName }: LocationBadgeProps) {
  if (!placeName) return null;

  return (
    <View className="flex-row items-center bg-zinc-800/80 px-2 py-0.5 rounded-md self-start mt-1">
      <MapPin size={10} color="#A1A1AA" />
      <Text className="text-[10px] text-zinc-400 font-medium ml-1">
        {placeName}
      </Text>
    </View>
  );
}
