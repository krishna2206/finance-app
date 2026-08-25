import { MapPointBoldIcon } from '@solar-icons/react';

interface LocationBadgeProps {
  placeName: string;
}

export function LocationBadge({ placeName }: LocationBadgeProps) {
  if (!placeName) return null;

  return (
    <div className="inline-flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] text-zinc-600 font-medium mt-1 border border-zinc-200">
      <MapPointBoldIcon size={12} className="text-zinc-400 shrink-0" />
      <span>{placeName}</span>
    </div>
  );
}
