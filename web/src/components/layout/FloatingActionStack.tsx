import { PlusIcon } from '@heroicons/react/24/solid';

interface FloatingActionStackProps {
  onOpenQuickAdd: () => void;
}

export function FloatingActionStack({ onOpenQuickAdd }: FloatingActionStackProps) {
  return (
    <div className="flex flex-col items-end gap-2.5">
      {/* Main Action Button (+) - Exactly matches FloatingTabBar height (h-14) */}
      <button
        onClick={onOpenQuickAdd}
        title="Ajouter une dépense"
        className="w-14 h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-zinc-900/25 transition-all duration-150 cursor-pointer"
      >
        <PlusIcon className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}
