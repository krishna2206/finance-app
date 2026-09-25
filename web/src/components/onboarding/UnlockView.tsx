import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { KeyMinimalisticBoldIcon } from '@solar-icons/react';

export function UnlockView() {
  const unlock = useAuthStore(state => state.unlock);
  const error = useAuthStore(state => state.error);
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await unlock(token);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-zinc-100 flex justify-center text-zinc-900 selection:bg-zinc-900 selection:text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[430px] h-full bg-zinc-50 border-x border-zinc-200/80 flex flex-col justify-center shadow-sm px-5 space-y-5"
      >
        <div>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">
            Accès sécurisé
          </span>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Déverrouiller l'application
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Saisissez le jeton d'accès affiché au démarrage du serveur. Il est mémorisé sur cet appareil.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1">
            Jeton d'accès
          </label>
          <div className="relative flex items-center">
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 shadow-xs"
            />
            <KeyMinimalisticBoldIcon size={16} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
          </div>
          {error && (
            <p className="text-xs font-semibold text-rose-600 mt-1.5">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !token.trim()}
          className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          {isSubmitting ? 'Vérification...' : 'Déverrouiller'}
        </button>
      </form>
    </div>
  );
}
