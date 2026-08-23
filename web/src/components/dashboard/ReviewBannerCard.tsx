import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { NewspaperIcon } from '@heroicons/react/24/outline';

interface ReviewBannerCardProps {
  transactionCount: number;
  onViewMore: () => void;
}

export function ReviewBannerCard({ transactionCount, onViewMore }: ReviewBannerCardProps) {
  const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <InsetGroupedCard className="p-4 bg-zinc-50 border-zinc-200/90">
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
        <NewspaperIcon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider capitalize">
          Période : {currentMonth}
        </span>
      </div>

      <h2 className="text-base font-bold text-zinc-900 tracking-tight mb-1">
        Votre mois en revue
      </h2>

      <p className="text-xs text-zinc-600 leading-relaxed mb-3">
        {transactionCount > 0
          ? `${transactionCount} transaction${transactionCount > 1 ? 's' : ''} enregistrée${transactionCount > 1 ? 's' : ''} ce mois-ci. Un suivi continu sur les dépenses et les soldes.`
          : "Aucune dépense pour l'instant. Votre solde reste stable et prêt pour vos premiers achats."}
      </p>

      <button
        onClick={onViewMore}
        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
      >
        Voir plus
      </button>
    </InsetGroupedCard>
  );
}
