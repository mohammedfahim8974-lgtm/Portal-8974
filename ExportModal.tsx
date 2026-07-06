import React from 'react';
import { X, Calendar, ArrowRight, Copy, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CopyRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (
    sourceStart: string,
    sourceEnd: string,
    destStart: string,
    destEnd: string
  ) => void;
  defaultMonth: Date;
  entityName: string;
}

export const CopyRangeModal: React.FC<CopyRangeModalProps> = ({
  isOpen,
  onClose,
  onCopy,
  defaultMonth,
  entityName
}) => {
  const [sourceStart, setSourceStart] = React.useState('');
  const [sourceEnd, setSourceEnd] = React.useState('');
  const [destStart, setDestStart] = React.useState('');
  const [destEnd, setDestEnd] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      const year = defaultMonth.getFullYear();
      const monthVal = defaultMonth.getMonth();
      const monthStr = String(monthVal + 1).padStart(2, '0');
      
      // Default Source to May 1 (or 1st of month)
      setSourceStart(`${year}-${monthStr}-01`);
      
      // Default Source End to 15th/17th of the month or last day
      const lastDay = new Date(year, monthVal + 1, 0).getDate();
      setSourceEnd(`${year}-${monthStr}-${String(Math.min(17, lastDay)).padStart(2, '0')}`);
      
      // Default Dest Start to one day after sourceEnd
      const nextDay = Math.min(17, lastDay) + 1;
      if (nextDay <= lastDay) {
        setDestStart(`${year}-${monthStr}-${String(nextDay).padStart(2, '0')}`);
        setDestEnd(`${year}-${monthStr}-${String(Math.min(nextDay + 2, lastDay)).padStart(2, '0')}`);
      } else {
        // Fallback to next month's beginning if overflowing
        const nextMonthYear = monthVal === 11 ? year + 1 : year;
        const nextMonthVal = monthVal === 11 ? 1 : monthVal + 2;
        const nextMonthStr = String(nextMonthVal).padStart(2, '0');
        setDestStart(`${nextMonthYear}-${nextMonthStr}-01`);
        setDestEnd(`${nextMonthYear}-${nextMonthStr}-03`);
      }
      
      setError('');
    }
  }, [isOpen, defaultMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sourceStart || !sourceEnd || !destStart || !destEnd) {
      setError('All date fields are required');
      return;
    }

    if (new Date(sourceStart) > new Date(sourceEnd)) {
      setError('Source Start date cannot be after Source End date');
      return;
    }

    if (new Date(destStart) > new Date(destEnd)) {
      setError('Destination Start date cannot be after Destination End date');
      return;
    }

    onCopy(sourceStart, sourceEnd, destStart, destEnd);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
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
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl overflow-hidden group"
          >
            {/* Ambient Background Radial Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[120px] rounded-full -mr-40 -mt-40 transition-opacity group-hover:opacity-40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full -ml-40 -mb-40 transition-opacity group-hover:opacity-40 pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between mb-8 pb-4 border-b border-zinc-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Copy size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic font-serif">
                    Replicate Attendance Data
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-extrabold tracking-[0.3em] uppercase mt-1">
                    Continuous Range Cloning: {entityName}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="relative space-y-8">
              {/* Scope Warning Card */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-white/5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  This tool replicates attendance profiles (manpower lists, working hours) from the source interval and distributes them iteratively across your destination dates. Any existing logs for <strong className="text-zinc-800 dark:text-white">{entityName}</strong> on the targeted destination dates will be safely overwritten.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SOURCE CARD */}
                <div className="p-6 bg-[#F5F5F7] dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-white/5 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest font-serif">
                      1. Source range
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1.5 italic font-serif">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={sourceStart}
                        onChange={(e) => {
                          setSourceStart(e.target.value);
                          setError('');
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1.5 italic font-serif">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={sourceEnd}
                        onChange={(e) => {
                          setSourceEnd(e.target.value);
                          setError('');
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* DESTINATION CARD */}
                <div className="p-6 bg-[#F5F5F7] dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-white/5 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-serif">
                      2. Destination range
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1.5 italic font-serif">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={destStart}
                        onChange={(e) => {
                          setDestStart(e.target.value);
                          setError('');
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1.5 italic font-serif">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={destEnd}
                        onChange={(e) => {
                          setDestEnd(e.target.value);
                          setError('');
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 text-red-500 text-[10px] font-black uppercase tracking-widest ml-1"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-black text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-all duration-200 shadow-xl shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Duplicate Data Ranges
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
