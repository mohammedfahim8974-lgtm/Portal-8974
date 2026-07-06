import React from 'react';
import { X, Building2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyName: string) => void;
  existingCompanies: string[];
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingCompanies
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
      setError('Company name is required');
      return;
    }

    if (existingCompanies.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A company with this name already exists');
      return;
    }

    onSave(trimmedName);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg glass-card p-10 overflow-hidden group"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-opacity group-hover:opacity-30" />
            
            <div className="relative flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-zinc-900 dark:bg-white rounded-2xl shadow-2xl shadow-black/10 dark:shadow-white/10">
                  <Building2 size={24} className="text-white dark:text-black" />
                </div>
                <div>
                  <h2 className="luxury-heading text-3xl">Entity Registry</h2>
                  <p className="text-[10px] text-zinc-500 font-black tracking-[0.3em] uppercase mt-1.5 opacity-60">Corporate Identity Management</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="relative space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-1 italic font-serif">
                  Company Legal Name
                </label>
                <div className="relative group">
                  <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors duration-200" size={18} />
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    className="input-field pl-16 bg-white dark:bg-zinc-900/50 uppercase"
                    placeholder="e.g. LUXURY CONSTRUCTIONS LTD"
                    required
                  />
                </div>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 text-red-400 text-[10px] font-black uppercase tracking-widest ml-1"
                  >
                    <Info size={14} />
                    {error}
                  </motion.div>
                )}
              </div>

              <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Info className="text-emerald-500" size={20} />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  New companies will be integrated into the global directory. Personnel management will be enabled upon profile creation.
                </p>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary !px-8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary !px-10"
                >
                  Register Entity
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
