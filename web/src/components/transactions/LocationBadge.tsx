import { MapPinIcon } from '@heroicons/react/24/solid';

interface LocationBadgeProps {
  placeName: string;
}

export function LocationBadge({ placeName }: LocationBadgeProps) {
  if (!placeName) return null;

  return (
    <div className="inline-flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded-md text-[10px] text-zinc-400 font-medium mt-1">
      <MapPinIcon className="w-3 h-3 text-zinc-500" />
      <span>{placeName}</span>
    </div>
  );
}
