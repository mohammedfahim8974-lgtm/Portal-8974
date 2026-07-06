import React from 'react';
import { X, Calendar, Download, Database, AlertCircle, CalendarRange } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (scope: 'all' | 'period', filters?: { year: number; month?: number | null }) => void;
  defaultMonth: Date;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  defaultMonth
}) => {
  const [exportScope, setExportScope] = React.useState<'all' | 'period'>('all');
  const [periodType, setPeriodType] = React.useState<'month' | 'year'>('month');
  
  const currentYear = defaultMonth.getFullYear();
  const currentMonth = defaultMonth.getMonth(); // 0-indexed

  const [selectedYear, setSelectedYear] = React.useState(currentYear);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(currentMonth);

  const years = Array.from({ length: 8 }, (_, i) => currentYear - 4 + i);
  const months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];

  const handleDownload = () => {
    if (exportScope === 'all') {
      onExport('all');
    } else {
      onExport('period', {
        year: selectedYear,
        month: periodType === 'month' ? selectedMonth : null
      });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden group"
          >
            {/* Ambient background glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-zinc-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Download size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic font-serif">
                    Download Attendance Data
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                    Select scope and date filters for export
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6">
              {/* Scope selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Export Option */}
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden",
                    exportScope === 'all'
                      ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
                      : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      exportScope === 'all' ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    )}>
                      <Database size={16} />
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      exportScope === 'all'
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-zinc-300 dark:border-zinc-700"
                    )}>
                      {exportScope === 'all' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <span className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider font-serif">
                    Full System Export
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-medium">
                    Download complete records: all attendance history, active workers roster, and settings configuration.
                  </p>
                </button>

                {/* Period Export Option */}
                <button
                  type="button"
                  onClick={() => setExportScope('period')}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden",
                    exportScope === 'period'
                      ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10"
                      : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      exportScope === 'period' ? "bg-blue-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    )}>
                      <CalendarRange size={16} />
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      exportScope === 'period'
                        ? "border-blue-500 bg-blue-500"
                        : "border-zinc-300 dark:border-zinc-700"
                    )}>
                      {exportScope === 'period' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <span className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider font-serif">
                    Specific Period
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-medium">
                    Select a designated Month or Year. Filters out of scope logs while matching essential active roster profiles.
                  </p>
                </button>
              </div>

              {/* Conditional Period Inputs */}
              {exportScope === 'period' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-white/5 rounded-2xl space-y-4"
                >
                  <div className="flex items-center gap-4 border-b border-zinc-200/50 dark:border-white/5 pb-3">
                    <button
                      type="button"
                      onClick={() => setPeriodType('month')}
                      className={cn(
                        "text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all",
                        periodType === 'month'
                          ? "border-blue-500 text-blue-500 dark:text-blue-400 font-serif"
                          : "border-transparent text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      Month & Year Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodType('year')}
                      className={cn(
                        "text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all",
                        periodType === 'year'
                          ? "border-blue-500 text-blue-500 dark:text-blue-400 font-serif"
                          : "border-transparent text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      Entire Year Selection
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {periodType === 'month' && (
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 font-serif">
                          Select Month
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-blue-500"
                        >
                          {months.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={cn(periodType === 'year' ? "col-span-2" : "col-span-1")}>
                      <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 font-serif">
                        Select Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-blue-500"
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Informational Card */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/50 dark:border-white/5 flex gap-3">
                <AlertCircle className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div className="text-[10px] text-zinc-500 leading-normal font-medium">
                  Exports are structured inside dynamic standard JSON packets. They can be safely uploaded to other machines or re-restored directly inside Settings to revive historical archives cleanly.
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 hover:bg-zinc-200/70 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-2.5 text-xs font-black text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-all shadow-md shadow-blue-500/10 hover:-translate-y-0.5"
                >
                  Export & Save JSON
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
