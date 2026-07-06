import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderPlus, X, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  folderToEdit?: string;
  onDelete?: (name: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  folderToEdit,
  onDelete
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit);
    } else {
      setName('');
    }
  }, [folderToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-[40px] border border-line dark:border-white/10 shadow-3xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                    <FolderPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                      {folderToEdit ? 'Edit Folder' : 'New Folder'}
                    </h3>
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-1">
                      {folderToEdit ? 'Modify folder identity' : 'Create organization unit'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-2xl transition-all"
                >
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Folder Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter folder name..."
                    className="w-full h-16 px-6 bg-zinc-50 dark:bg-black/40 border-2 border-zinc-100 dark:border-white/5 rounded-3xl text-zinc-900 dark:text-white font-black placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:border-blue-500/50 focus:ring-0 transition-all outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  {folderToEdit && onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(folderToEdit);
                        onClose();
                      }}
                      className="h-16 px-6 bg-red-500/10 text-red-500 rounded-3xl hover:bg-red-500 hover:text-white transition-all duration-300"
                    >
                      <Trash2 size={24} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className={cn(
                      "flex-1 h-16 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 shadow-xl",
                      name.trim() 
                        ? "bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20" 
                        : "bg-zinc-100 dark:bg-white/5 text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                    )}
                  >
                    {folderToEdit ? 'Save Changes' : 'Create Folder'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
