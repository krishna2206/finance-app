import React from 'react';

interface InsetGroupedCardProps {
  children: React.ReactNode;
  className?: string;
}

export function InsetGroupedCard({ children, className = '' }: InsetGroupedCardProps) {
  return (
    <div className={`bg-[#13151A] rounded-3xl border border-white/5 overflow-hidden shadow-xl ${className}`}>
      {children}
    </div>
  );
}

export function InsetGroupedRow({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`px-5 py-3.5 border-b border-white/5 last:border-b-0 flex items-center justify-between transition-colors ${
        onClick ? 'cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.06]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
