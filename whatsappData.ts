import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, DollarSign, TrendingUp, User, Briefcase, Building2, CheckCircle2, AlertCircle, Coffee, ShieldCheck, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Worker, AttendanceRecord, SystemSettings } from '../types';
import { cn, formatCurrency, getLocalDateString, safeShowPicker } from '../lib/utils';

interface WorkerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  attendance: AttendanceRecord[];
  settings: SystemSettings;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  isOpen,
  onClose,
  worker,
  attendance,
  settings
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const formattedMonthText = useMemo(() => {
    if (!selectedMonth) return '';
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }, [selectedMonth]);

  const [year, month] = selectedMonth.split('-').map(Number);
  
  // Calculate all days in the selected month
  const allDaysInMonth = useMemo(() => {
    const days = [];
    const lastDay = new Date(year, month, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [year, month]);

  const workerRecordsByDate = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    if (!worker) return map;
    attendance.forEach(r => {
      if (r.workerIds?.includes(worker.id)) {
        if (!map[r.date]) map[r.date] = [];
        map[r.date].push(r);
      }
    });
    return map;
  }, [attendance, worker?.id]);

  const stats = useMemo(() => {
    const monthRecords = Object.values(workerRecordsByDate).flat().filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const presentDays = monthRecords.filter(r => r.status === 'present').length;
    const totalDaysLogged = monthRecords.length;
    const totalDaysInMonth = allDaysInMonth.length;
    const unmarkedDays = totalDaysInMonth - totalDaysLogged;

    return {
      totalHours: monthRecords.reduce((sum, r) => sum + Math.min(Number(r.hours) || 0, 9), 0),
      totalOT: monthRecords.reduce((sum, r) => sum + (r.otHours !== undefined ? Number(r.otHours) : Math.max(0, (Number(r.hours) || 0) - (9))), 0),
      presentDays,
      absentDays: monthRecords.filter(r => r.status === 'absent').length,
      unmarkedDays,
      attendanceRate: totalDaysLogged > 0 ? (presentDays / totalDaysLogged) * 100 : 0
    };
  }, [workerRecordsByDate, year, month, allDaysInMonth]);

  if (!worker || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-[#0a0a0a] rounded-[32px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            {/* Header / Profile Section */}
            <div className="p-8 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-transparent border-b border-line dark:border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex gap-6">
                  <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner group">
                    <User size={48} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{worker.name}</h2>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        worker.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" : "bg-[#F5F5F7]0/10 text-zinc-500"
                      )}>{worker.status}</span>
                    </div>
                    <p className="text-zinc-500 flex items-center gap-2 text-sm font-medium">
                      <Briefcase size={14} /> {worker.role} • <Building2 size={14} /> {worker.company}
                    </p>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        <Calendar size={12} /> Joined {new Date(worker.joiningDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        <ShieldCheck size={12} /> ID: {worker.workerNumber}
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-[#E5E5E5] dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Tabs / Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {/* Month Selector */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">Select Report Month</h3>
                  <div className="flex items-center gap-2 mt-1 relative">
                    <button
                      onClick={() => {
                        const [y, m] = selectedMonth.split('-').map(Number);
                        const prev = new Date(y, m - 2, 1);
                        setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                      }}
                      type="button"
                      className="p-1.5 border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors relative z-10"
                      title="Previous Month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <label className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#F5F5F7] dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-xl text-sm font-bold transition-all relative cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 w-[150px]">
                      <Calendar className="text-emerald-500 shrink-0" size={16} />
                      <span className="text-zinc-900 dark:text-white uppercase tracking-widest text-center">
                        {formattedMonthText}
                      </span>
                      <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedMonth(e.target.value);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
                      />
                    </label>
                    <button
                      onClick={() => {
                        const [y, m] = selectedMonth.split('-').map(Number);
                        const next = new Date(y, m, 1);
                        setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                      }}
                      type="button"
                      className="p-1.5 border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors relative z-10"
                      title="Next Month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{stats.presentDays} Present</p>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{stats.absentDays} Absent</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stats.unmarkedDays} Unmarked</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <DetailStatCard label="Total Attendance" value={`${stats.attendanceRate.toFixed(1)}%`} icon={<TrendingUp className="text-emerald-500" />} />
                <DetailStatCard label="Total Hours" value={`${stats.totalHours}h`} icon={<Clock className="text-blue-500" />} />
                <DetailStatCard label="Total OT" value={`${stats.totalOT}h`} icon={<TrendingUp className="text-amber-500" />} />
                <DetailStatCard label="Base Salary" value={formatCurrency(worker.monthlySalary, settings.currency)} icon={<DollarSign className="text-zinc-400" />} />
              </div>

              {/* History List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Calendar size={14} /> Full Monthly Attendance Sheet
                  </h3>
                  <p className="text-[10px] text-zinc-500 italic">Showing all days for {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>

                <div className="bg-[#F5F5F7] dark:bg-white/[0.02] rounded-3xl border border-line dark:border-white/5 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-line dark:border-white/5 bg-[#E5E5E5]/50 dark:bg-zinc-900/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Site</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Hours</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">OT</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                      {allDaysInMonth.map((dateStr) => {
                        const records = workerRecordsByDate[dateStr] || [];
                        const isToday = dateStr === getLocalDateString();
                        const [y, m, d] = dateStr.split('-');
                        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                        const isSunday = dateObj.getDay() === 0; // Sunday
                        
                        if (records.length === 0) {
                          return (
                            <tr key={dateStr} className={cn(
                              "hover:bg-[#E5E5E5] dark:hover:bg-white/5 transition-colors group",
                              isToday && "bg-blue-500/5 opacity-60",
                              "opacity-60"
                            )}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className={cn("text-sm font-bold", isToday ? "text-blue-500" : "text-zinc-900 dark:text-zinc-100")}>
                                    {dateObj.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                  </span>
                                  <span className="text-[9px] uppercase font-black text-zinc-400 tracking-tighter">
                                    {dateObj.toLocaleDateString(undefined, { weekday: 'long' })}
                                    {isSunday && " (Weekend)"}
                                  </span>
                                </div>
                              </td>
                              {isSunday ? (
                                <>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <MapPin size={12} className="text-zinc-300" />
                                      <span className="text-xs font-medium text-zinc-400 italic">Paid Leave</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500">9h</span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="text-zinc-300 font-mono text-xs">-</span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500/50">
                                      OFF
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <td className="px-6 py-4" colSpan={4}>
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    <Clock size={10} />
                                    UNMARKED
                                  </span>
                                </td>
                              )}
                            </tr>
                          );
                        }

                        return records.map((record, rIndex) => {
                          const hoursWorked = Number(record.hours) || 0;
                          const otHours = Number(record.otHours) || 0;
                          const isAbsent = record.status === 'absent';
                          
                          let displayNorm = Math.min(hoursWorked, 9);
                          let displayOT = otHours > 0 ? otHours : Math.max(0, hoursWorked - 9);

                          if (isSunday) {
                            const sundayPaidHours = (hoursWorked * 1.5) + 9;
                            displayNorm = Math.min(9, sundayPaidHours);
                            displayOT = Math.max(0, sundayPaidHours - 9);
                          }

                          return (
                            <tr key={`${dateStr}-${rIndex}`} className={cn(
                              "hover:bg-[#E5E5E5] dark:hover:bg-white/5 transition-colors group",
                              isToday && "bg-blue-500/5"
                            )}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {rIndex === 0 && (
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "text-sm font-bold",
                                      isToday ? "text-blue-500" : "text-zinc-900 dark:text-zinc-100"
                                    )}>
                                      {dateObj.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                    </span>
                                    <span className="text-[9px] uppercase font-black text-zinc-400 tracking-tighter">
                                      {dateObj.toLocaleDateString(undefined, { weekday: 'long' })}
                                      {isSunday && " (Weekend)"}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <MapPin size={12} className="text-zinc-500" />
                                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-400 truncate max-w-[200px]">{record.site}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold",
                                  displayNorm >= 9 ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-100 dark:bg-white/5 text-zinc-500"
                                )}>{displayNorm}h</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {displayOT > 0 ? (
                                  <span className="text-xs font-mono font-bold text-amber-500">+{displayOT}h</span>
                                ) : (
                                  <span className="text-zinc-300 font-mono text-xs">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                                  record.status === 'absent' ? "text-red-500" : "text-emerald-500"
                                )}>
                                  {record.status === 'absent' ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                                  {record.status || 'present'}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DetailStatCard = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
  <div className="bg-[#F5F5F7] dark:bg-white/[0.02] p-5 rounded-3xl border border-line dark:border-white/5 group hover:border-emerald-500/30 transition-all">
    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{value}</p>
  </div>
);

const Tooltip = ({ label, icon }: { label: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-help" title={label}>
    {icon}
  </div>
);
