import { PlusIcon } from '@heroicons/react/24/solid';

interface FloatingActionStackProps {
  onOpenQuickAdd: () => void;
}

export function FloatingActionStack({ onOpenQuickAdd }: FloatingActionStackProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
      {/* Main Action Button (+) */}
      <button
        onClick={onOpenQuickAdd}
        title="Ajouter une dépense"
        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 flex items-center justify-center shadow-2xl shadow-emerald-500/30 transition-all duration-200 cursor-pointer"
      >
        <PlusIcon className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
}
