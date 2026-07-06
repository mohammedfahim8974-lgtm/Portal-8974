import React from 'react';
import { X, Building2, MapPin, Info, DollarSign, Folder, ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (siteName: string, rate: number, folder?: string) => void;
  existingSites: string[];
  folders: string[];
  initialSite?: string;
  initialRate?: number;
  initialFolder?: string;
}

export const SiteModal: React.FC<SiteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSites,
  folders,
  initialSite = '',
  initialRate = 0,
  initialFolder = ''
}) => {
  const [name, setName] = React.useState(initialSite);
  const [rate, setRate] = React.useState<number | ''>(initialRate || '');
  const [folder, setFolder] = React.useState(initialFolder);
  const [newFolder, setNewFolder] = React.useState('');
  const [isAddingNewFolder, setIsAddingNewFolder] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName(initialSite);
      setRate(initialRate || '');
      setFolder(initialFolder);
      setNewFolder('');
      setIsAddingNewFolder(false);
      setError('');
    }
  }, [isOpen, initialSite, initialRate, initialFolder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim().toUpperCase();
    
    if (!trimmedName) {
      setError('Site name is required');
      return;
    }

    if (trimmedName.toLowerCase() !== initialSite.toLowerCase() && existingSites.some(s => s.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A site with this name already exists');
      return;
    }

    const finalFolder = isAddingNewFolder ? newFolder.trim() : folder;
    onSave(trimmedName, Number(rate) || 0, finalFolder || undefined);
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
            className="relative w-full max-w-xl glass-card p-10 overflow-hidden group"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-opacity group-hover:opacity-30" />
            
            <div className="relative flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-zinc-900 dark:bg-white rounded-2xl shadow-2xl shadow-black/10 dark:shadow-white/10">
                  <MapPin size={24} className="text-white dark:text-black" />
                </div>
                <div>
                  <h2 className="luxury-heading text-3xl">{initialSite ? 'Site Intelligence' : 'New Location'}</h2>
                  <p className="text-[10px] text-zinc-500 font-black tracking-[0.3em] uppercase mt-1.5 opacity-60">Geospatial Asset Management</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 col-span-full">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-1 italic font-serif">
                    Site Designation
                  </label>
                  <div className="relative group">
                    <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-200" size={18} />
                    <input
                      autoFocus
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value.toUpperCase());
                        setError('');
                      }}
                      className="input-field pl-16 uppercase bg-white dark:bg-zinc-900/50"
                      placeholder="e.g. DOWNTOWN PLAZA"
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

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-1 italic font-serif">
                    Target Folder
                  </label>
                  {!isAddingNewFolder ? (
                    <div className="space-y-3">
                      <div className="relative group">
                        <Folder className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-200" size={18} />
                        <select
                          value={folder}
                          onChange={(e) => setFolder(e.target.value)}
                          className="input-field pl-16 appearance-none uppercase bg-white dark:bg-zinc-900/50"
                        >
                          <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">UNCATEGORIZED</option>
                          {folders.filter(f => f !== 'Uncategorized').map(f => (
                            <option key={f} value={f} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                              {f.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewFolder(true)}
                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors ml-1"
                      >
                        + Create New Folder
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative group">
                        <Plus className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-200" size={18} />
                        <input
                          type="text"
                          value={newFolder}
                          onChange={(e) => setNewFolder(e.target.value)}
                          className="input-field pl-16 uppercase bg-white dark:bg-zinc-900/50"
                          placeholder="NEW FOLDER NAME"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewFolder(false)}
                        className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-400 transition-colors ml-1"
                      >
                        ← Back to List
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-1 italic font-serif">
                    Standard Rate
                  </label>
                  <div className="relative group">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-200" size={18} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(e.target.value ? parseFloat(e.target.value) : '')}
                      className="input-field pl-16 bg-white dark:bg-zinc-900/50"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Info className="text-blue-500" size={20} />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  {initialSite 
                    ? "Updating the site will preserve existing records while applying the new configuration."
                    : "Setting a standard rate and folder organizes the site within your intelligence dashboard."}
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
                  {initialSite ? 'Update Site' : 'Create Site'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
