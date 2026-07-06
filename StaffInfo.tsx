import React from 'react';
import { X, FileSpreadsheet, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sheetName: string) => void;
  existingSheets: string[];
}

export const SheetModal: React.FC<SheetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSheets
}) => {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Sheet name is required');
      return;
    }

    if (existingSheets.includes(trimmedName)) {
      setError('A sheet with this name already exists');
      return;
    }

    onSave(trimmedName);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-line dark:border-zinc-800"
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-[#F5F5F7]/50 dark:bg-zinc-800/50">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Add New Data Sheet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Create a new group to organize your workers.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#E5E5E5] dark:hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">Sheet Name</label>
                  <div className="relative">
                    <FileSpreadsheet className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      autoFocus
                      required
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-[#F5F5F7] dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:text-white transition-all"
                      placeholder="e.g. Contractors 2026"
                    />
                  </div>
                  {error && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{error}</p>
                  )}
                </div>

                <div className="p-4 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700 flex gap-3">
                  <Info className="text-zinc-400 shrink-0" size={18} />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Sheets help you categorize workers into logical groups. You can move workers between sheets by editing their profile.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-[#E5E5E5] dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg"
                >
                  Create Sheet
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
