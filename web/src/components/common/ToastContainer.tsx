import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, ToastItem } from '../../stores/useToastStore';
import {
  InfoCircleLinearIcon,
  LetterLinearIcon,
  CheckCircleLinearIcon,
  DangerTriangleLinearIcon,
} from '@solar-icons/react';

function getToastIcon(type: ToastItem['type']) {
  switch (type) {
    case 'sms':
      return LetterLinearIcon;
    case 'success':
      return CheckCircleLinearIcon;
    case 'warning':
    case 'error':
      return DangerTriangleLinearIcon;
    default:
      return InfoCircleLinearIcon;
  }
}

const DEFAULT_GAP = 10;
const DEFAULT_SCALE_FACTOR = 0.045;
const DEFAULT_MAX_VISIBLE_TOAST = 3;

export function ToastContainer() {
  const toasts = useToastStore(state => state.toasts);
  const dismissToast = useToastStore(state => state.dismissToast);

  return (
    <div className="fixed top-4 left-0 right-0 max-w-[430px] mx-auto px-4 z-50 pointer-events-none flex justify-center">
      <div className="relative w-full max-w-[400px] h-14">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => {
            const Icon = getToastIcon(toast.type);
            const isFrontmost = index === 0;
            const isHidden = index >= DEFAULT_MAX_VISIBLE_TOAST;
            const translateY = index * DEFAULT_GAP;
            const scale = 1 - index * DEFAULT_SCALE_FACTOR;
            const zIndex = 50 - index;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{
                  opacity: isHidden ? 0 : 1,
                  y: translateY,
                  scale,
                  zIndex,
                }}
                exit={{
                  opacity: 0,
                  y: -30,
                  scale: 0.92,
                  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1], // HeroUI smooth 400ms curve
                }}
                whileTap={isFrontmost ? { scale: 0.98 } : undefined}
                drag={isFrontmost ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -15) {
                    dismissToast(toast.id);
                  }
                }}
                onClick={() => {
                  if (isFrontmost) dismissToast(toast.id);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex,
                  transformOrigin: 'top center',
                }}
                className={`w-full bg-white/95 backdrop-blur-2xl border border-zinc-200/80 text-zinc-900 rounded-[24px] px-4 py-3 shadow-lg shadow-zinc-900/10 flex flex-row items-center justify-start gap-3 select-none transition-shadow ${
                  isFrontmost ? 'pointer-events-auto cursor-pointer shadow-xl shadow-zinc-900/12' : 'pointer-events-none'
                }`}
              >
                {/* Vertically Centered Monochrome Icon */}
                <div className="shrink-0 text-zinc-900 flex items-center justify-center">
                  <Icon size={19} />
                </div>

                {/* Toast Content (Title & Description) */}
                <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                  <div className="text-sm leading-tight font-semibold text-zinc-900 tracking-tight truncate w-full">
                    {toast.title}
                  </div>
                  {toast.description && (
                    <div className="text-xs leading-tight font-normal text-zinc-500 truncate w-full mt-1">
                      {toast.description}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}


