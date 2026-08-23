import React from 'react';

interface InsetGroupedCardProps {
  children: React.ReactNode;
  className?: string;
}

export function InsetGroupedCard({ children, className = '' }: InsetGroupedCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function InsetGroupedRow({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3.5 border-b border-zinc-100 last:border-b-0 flex items-center justify-between transition-colors ${
        onClick ? 'cursor-pointer hover:bg-zinc-50 active:bg-zinc-100' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
