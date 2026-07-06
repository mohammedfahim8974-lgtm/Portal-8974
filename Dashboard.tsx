import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md glass-card p-10 overflow-hidden group"
          >
            {/* Background Glow */}
            <div className={cn(
              "absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full -mr-32 -mt-32 transition-opacity group-hover:opacity-30",
              type === 'danger' ? 'bg-red-500/10' : type === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
            )} />
            
            <div className="relative flex flex-col items-center text-center space-y-8">
              <div className={cn(
                "p-6 rounded-3xl border shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6",
                type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10' : 
                type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-amber-500/10' : 
                'bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-blue-500/10'
              )}>
                <AlertTriangle size={48} />
              </div>
              
              <div className="space-y-4">
                <h2 className="luxury-heading text-3xl text-white">
                  {title}
                </h2>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
                  {message}
                </p>
              </div>

              <div className="flex flex-col w-full gap-4 pt-4">
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-lg active:scale-95",
                    type === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 
                    type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' : 
                    'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
                  )}
                >
                  {confirmLabel}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/5 active:scale-95"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
