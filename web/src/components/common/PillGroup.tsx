interface PillOption<T extends string> {
  value: T;
  label: string;
}

interface PillGroupProps<T extends string> {
  label: string;
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Choix exclusif en pastilles, au style des pastilles d'enveloppe de la saisie. */
export function PillGroup<T extends string>({ label, options, value, onChange }: PillGroupProps<T>) {
  return (
    <div className="px-4 py-2.5 space-y-1.5">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5" role="group" aria-label={label}>
        {options.map(option => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
