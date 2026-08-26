import { motion, AnimatePresence } from 'framer-motion';
import { TrashBinTrashLinearIcon, DangerTriangleBoldIcon } from '@solar-icons/react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  icon?: 'trash' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  isDestructive = true,
  isLoading = false,
  icon = 'trash',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={isLoading ? undefined : onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer pointer-events-auto"
          />

          {/* Modal Dialog Card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400, mass: 0.7 }}
            className="relative w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200/90 text-center pointer-events-auto z-10 select-none transform-gpu will-change-transform"
          >
            {/* Icon */}
            <div className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
              {icon === 'trash' ? (
                <TrashBinTrashLinearIcon size={24} />
              ) : (
                <DangerTriangleBoldIcon size={24} />
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-black text-zinc-900 tracking-tight leading-snug mb-1.5">
              {title}
            </h3>

            {/* Description / Message */}
            <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-5">
              {message}
            </p>

            {/* Actions: 2 buttons side by side */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={onCancel}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={onConfirm}
                className={`w-full py-2.5 px-3 rounded-xl text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {isLoading ? 'Patientez...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
