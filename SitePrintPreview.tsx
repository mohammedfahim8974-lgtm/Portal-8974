import React from 'react';
import { Worker, AttendanceRecord, SystemSettings, AdvancePayment, PettyCashTransaction } from '../types';
import { Search, Printer, FileText, ArrowLeft, ShieldCheck, Download, Calendar, ChevronRight, ChevronLeft, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, safeShowPicker , getSiteSettings } from '../lib/utils';

interface LabourCardProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  settings: SystemSettings;
  initialWorkerId?: string | null;
  onUpdateWorker: (worker: Worker) => Promise<void>;
  onUpdateAttendance: (records: AttendanceRecord[]) => Promise<void>;
  onUpdateSettings: (settings: SystemSettings) => Promise<void>;
  isMasterControlLocked?: boolean;
}

export const LabourCard: React.FC<LabourCardProps> = ({ 
  workers, 
  attendance, 
  settings, 
  initialWorkerId,
  onUpdateWorker,
  onUpdateAttendance,
  onUpdateSettings,
  isMasterControlLocked: propMasterControlLocked = false
}) => {
  const isMasterControlLocked = false; // Excluded from the master system - always public and visible
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(initialWorkerId || null);
  const [search, setSearch] = React.useState('');
  const [reportDate, setReportDate] = React.useState(new Date());
  const [editingDay, setEditingDay] = React.useState<number | null>(null);
  const [editHoursValue, setEditHoursValue] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [comments, setComments] = React.useState('');
  const [selectedManagerId, setSelectedManagerId] = React.useState<string>("none");
  
  const inputRef1 = React.useRef<HTMLInputElement>(null);
  const inputRef2 = React.useRef<HTMLInputElement>(null);

  // Local state for glitch-free editing
  const [localWorkerData, setLocalWorkerData] = React.useState<{
    name: string;
    workerNumber: string;
    role: string;
    monthlySalary: string;
    additions: string;
    advances: string;
    deductions: string;
  } | null>(null);

  const selectedWorker = selectedWorkerId ? workers.find(w => w.id === selectedWorkerId) : null;

  React.useEffect(() => {
    setSelectedWorkerId(initialWorkerId || null);
  }, [initialWorkerId]);

  // Sync local data when worker changes
  React.useEffect(() => {
    if (selectedWorker) {
      setLocalWorkerData({
        name: selectedWorker.name || '',
        workerNumber: selectedWorker.workerNumber || '',
        role: selectedWorker.role || '',
        monthlySalary: String(selectedWorker.monthlySalary || 0),
        additions: String(selectedWorker.additions || 0),
        advances: String(selectedWorker.advances || 0),
        deductions: String(selectedWorker.deductions || 0),
      });
      setComments(selectedWorker.comment || '');
      setSelectedManagerId("none"); // Reset to none when worker changes
    } else {
      setLocalWorkerData(null);
      setComments('');
      setSelectedManagerId("none");
    }
  }, [selectedWorker?.id, selectedWorker?.comment, selectedWorker?.monthlySalary, selectedWorker?.additions, selectedWorker?.advances, selectedWorker?.deductions, settings.managerWallets]);

  const handleBlurSync = async (field: keyof Worker, value: any) => {
    if (!selectedWorker) return;
    setIsUpdating(true);
    try {
      await onUpdateWorker({ ...selectedWorker, [field]: value });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdvanceBlur = async (newValue: number) => {
    if (!selectedWorker) return;
    const oldValue = selectedWorker.advances || 0;
    const diff = newValue - oldValue;

    if (diff === 0) return;

    setIsUpdating(true);
    try {
      let updatedWallets = [...(settings.managerWallets || [])];
      let updatedPcTransactions = [...(settings.pettyCashTransactions || [])];
      const ledgerId = `ledger-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const selectedManager = settings.managerWallets?.find(w => w.id === selectedManagerId);

      // 1. If manager is selected and we are increasing advance, deduct from wallet
      if (selectedManagerId !== "none" && diff > 0) {
        updatedWallets = updatedWallets.map(w => 
          w.id === selectedManagerId 
            ? { ...w, balance: w.balance - diff, updatedAt: new Date().toISOString() } 
            : w
        );

        const newPcTx: PettyCashTransaction = {
          id: `pc-tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'ADVANCE_DEBIT',
          amount: diff,
          managerId: selectedManagerId,
          managerName: selectedManager?.managerName || '',
          date: new Date().toISOString().split("T")[0],
          remarks: `Advance given to ${selectedWorker.name} (via Labour Card)`,
          workerId: selectedWorker.id,
          workerName: selectedWorker.name,
          linkedLedgerId: ledgerId,
        };
        updatedPcTransactions.push(newPcTx);
      } 
      // 2. If manager is selected and we are decreasing advance (refunding), refund to wallet
      else if (selectedManagerId !== "none" && diff < 0) {
        const refundAmt = Math.abs(diff);
        updatedWallets = updatedWallets.map(w => 
          w.id === selectedManagerId 
            ? { ...w, balance: w.balance + refundAmt, updatedAt: new Date().toISOString() } 
            : w
        );

        const newPcTx: PettyCashTransaction = {
          id: `pc-tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'MANUAL_CREDIT', // Log refund as direct credit adjustment
          amount: refundAmt,
          managerId: selectedManagerId,
          managerName: selectedManager?.managerName || '',
          date: new Date().toISOString().split("T")[0],
          remarks: `Advance refund from ${selectedWorker.name} (via Labour Card)`,
        };
        updatedPcTransactions.push(newPcTx);
      }

      // Update worker with new ledger entry to keep Accounts page in perfect sync!
      const currentPayments = selectedWorker.advancePayments || [];
      const newPayment: AdvancePayment = {
        id: ledgerId,
        amount: diff,
        date: new Date().toISOString().split("T")[0],
        remarks: diff > 0 ? "Advance taken (via Labour Card)" : "Advance refund/adjustment",
        managerId: selectedManagerId !== "none" ? selectedManagerId : undefined,
        managerName: selectedManager ? selectedManager.managerName : undefined,
      };
      
      const updatedPayments = [...currentPayments, newPayment];
      updatedPayments.sort((a, b) => a.date.localeCompare(b.date));

      const updatedWorker: Worker = {
        ...selectedWorker,
        advances: newValue,
        advancePayments: updatedPayments,
      };

      // Save both settings and worker
      if (selectedManagerId !== "none") {
        await onUpdateSettings({
          ...settings,
          managerWallets: updatedWallets,
          pettyCashTransactions: updatedPcTransactions,
        });
      }

      await onUpdateWorker(updatedWorker);
    } catch (err) {
      console.error("Failed to sync advance update:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredByMonth = React.useMemo(() => {
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth();
    
    const activeIds = new Set(attendance.filter(a => {
      if (!a.date) return false;
      const [y, m, d] = a.date.split('-');
      return parseInt(y) === year && (parseInt(m) - 1) === month;
    }).flatMap(a => a.workerIds));

    return workers.filter(w => 
      (w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.workerNumber.toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => {
      const aActive = activeIds.has(a.id) ? 1 : 0;
      const bActive = activeIds.has(b.id) ? 1 : 0;
      return bActive - aActive;
    });
  }, [workers, search, reportDate, attendance]);

  const handleDayEdit = async (day: number) => {
    if (!selectedWorker) return;
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const val = parseFloat(editHoursValue);

    setIsUpdating(true);
    setEditingDay(null);

    // Filter out the selected worker from all existing records on that date
    const updatedAttendance = attendance.map(record => {
      if (record.date === dateStr && record.workerIds.includes(selectedWorker.id)) {
        return {
          ...record,
          workerIds: record.workerIds.filter(id => id !== selectedWorker.id)
        };
      }
      return record;
    }).filter(record => record.workerIds.length > 0 || record.status === 'absent'); 
    
    // If the new value is > 0, create a new record for this worker
    if (!isNaN(val) && val > 0) {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
        date: dateStr,
        hours: val,
        workerIds: [selectedWorker.id],
        mp: 1,
        rate: 0,
        total: 0,
        companyName: selectedWorker.company || 'Unknown',
        site: 'Labour Portal Adjustment'
      };
      updatedAttendance.push(newRecord);
    } else if (editHoursValue.toLowerCase() === 'a') {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
        date: dateStr,
        hours: 0,
        status: 'absent',
        workerIds: [selectedWorker.id],
        mp: 0,
        rate: 0,
        total: 0,
        companyName: selectedWorker.company || 'Unknown',
        site: 'Labour Portal Adjustment'
      };
      updatedAttendance.push(newRecord);
    }

    try {
      await onUpdateAttendance(updatedAttendance);
    } catch (err) {
      console.error('Failed to update attendance:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Precise Calculation Core ---
  const workerStats = React.useMemo(() => {
    const stats: Record<string, { totalHours: number, totalOT: number, totalFridayOT: number, netPayable: number, attendanceDays: number, grossTotal: number }> = {};
    const standardHours = 9;
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthRecords = attendance.filter(a => {
      if (!a.date) return false;
      const [y, m] = a.date.split('-');
      return parseInt(y) === year && (parseInt(m) - 1) === month;
    });

    workers.forEach(w => {
      const monthlySalary = Number(w.monthlySalary) || 0;
      const hourlyRate = monthlySalary / (30 * standardHours);
      const otRate = hourlyRate;
      
      let totalHours = 0;
      let totalOTHours = 0;
      let totalSundayOT = 0;
      let attendanceDays = 0;
      let grossTotal = 0;

      // Group records by date for this worker
      const recordsByDate: Record<string, typeof monthRecords> = {};
      let maxDayWithAttendance = 0;
      monthRecords.forEach(r => {
        if (r.workerIds.includes(w.id)) {
          if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
          recordsByDate[r.date].push(r);
          
          const [,, dayStr] = r.date.split('-');
          const dNum = parseInt(dayStr, 10);
          if (dNum > maxDayWithAttendance) {
            maxDayWithAttendance = dNum;
          }
        }
      });

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const curDate = new Date(year, month, d);
        const isSunday = curDate.getDay() === 0;

        const recordsForDay = recordsByDate[dateStr] || [];
        let dayNorm = 0;
        let dayOT = 0;
        let isAbsent = true;

        recordsForDay.forEach(record => {
          if (record.status !== 'absent') {
            isAbsent = false;
            const h = Number(record.hours) || 0;
            const ot = Number(record.otHours) || 0;
            const rSiteConfig = getSiteSettings(record.site || "", settings.siteSettings);
            const stdHours = rSiteConfig?.workerStandardHours || 9;
            const calcOt = ot > 0 ? ot : Math.max(0, h - stdHours);
            const calcNorm = h > 0 ? (ot > 0 ? Math.min(Math.max(0, h - ot), stdHours) : Math.min(h, stdHours)) : 0;
            dayNorm += calcNorm;
            dayOT += calcOt;
          }
        });

        if (isSunday) {
          if (d > maxDayWithAttendance) {
            // Sunday in the future/not reached yet, do not include it
          } else {
            const isWorked = !isAbsent && (dayNorm > 0 || dayOT > 0);
            const hoursWorked = isWorked ? (dayNorm + dayOT) : 0;
            const sundayPaidHours = (hoursWorked * 1.5) + 9;
            
            const sNorm = Math.min(9, sundayPaidHours);
            const sOT = Math.max(0, sundayPaidHours - 9);

            totalHours += sNorm;
            totalSundayOT += sOT;
            if (isWorked) {
              attendanceDays++;
            }
            grossTotal += sundayPaidHours * hourlyRate;
          }
        } else {
          if (!isAbsent && (dayNorm > 0 || dayOT > 0)) {
            attendanceDays++;
            totalHours += dayNorm;
            totalOTHours += dayOT;
            grossTotal += (dayNorm * hourlyRate) + (dayOT * otRate);
          }
        }
      }
      
      const advances = Number(w.advances) || 0;
      const deductions = Number(w.deductions) || 0;
      const additions = Number(w.additions) || 0;
      const netPayable = grossTotal + additions - advances - deductions;

      stats[w.id] = {
        totalHours,
        totalOT: totalOTHours,
        totalFridayOT: totalSundayOT, // maps Sunday OT to maintaining stats template compatible
        attendanceDays,
        netPayable,
        grossTotal
      };
    });

    return stats;
  }, [workers, attendance, 9, reportDate]);

  const {
    year,
    month,
    daysInMonth,
    totalHours, 
    totalOTHours, 
    totalFridayOT, 
    attendanceDays, 
    effectiveBillableHours, 
    dailyGrid,
    baseYield,
    accruedOT,
    grossTotal,
    netPayable,
    hourlyRate
  } = React.useMemo(() => {
    if (!selectedWorker) {
      return {
        year: reportDate.getFullYear(),
        month: reportDate.getMonth(),
        daysInMonth: new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate(),
        totalHours: 0, totalOTHours: 0, totalFridayOT: 0, attendanceDays: 0,
        effectiveBillableHours: 0, dailyGrid: {}, baseYield: 0, accruedOT: 0,
        grossTotal: 0, netPayable: 0, hourlyRate: 0
      };
    }
    const standardHours = 9;
    const monthlySalary = Number(selectedWorker?.monthlySalary) || 0;
    const hourlyRate = monthlySalary / (30 * standardHours);
    const otRate = hourlyRate;

    // Month stats
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let totalHours = 0;
    let totalOTHours = 0;
    let totalSundayOT = 0;
    let attendanceDays = 0;
    let effectiveBillableHours = 0;
    let grossTotal = 0;

    const monthRecords = attendance.filter(a => {
      if (!a.date) return false;
      const [y, m, d] = a.date.split('-');
      return parseInt(y) === year && (parseInt(m) - 1) === month && a.workerIds.includes(selectedWorker?.id || '');
    });

    let maxDayWithAttendance = 0;
    monthRecords.forEach(r => {
      const [,, dayStr] = r.date.split('-');
      const dNum = parseInt(dayStr, 10);
      if (dNum > maxDayWithAttendance) {
        maxDayWithAttendance = dNum;
      }
    });

    const dailyGrid: { [day: number]: { h: number, ot: number, status: string, isFriday: boolean, sitesCount?: number } } = {};

    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSunday = curDate.getDay() === 0;
      
      // Default
      dailyGrid[i] = { h: 0, ot: 0, status: '-', isFriday: isSunday };

      const recordsForDay = monthRecords.filter(r => r.date === dateStr);
      let dayNorm = 0;
      let dayOT = 0;
      let isAbsent = true;
      let sitesCount = 0;

      recordsForDay.forEach(record => {
        if (record.status !== 'absent') {
          isAbsent = false;
          sitesCount++;
          const h = Number(record.hours) || 0;
          const ot = Number(record.otHours) || 0;
          const rSiteConfig = getSiteSettings(record.site || "", settings.siteSettings);
          const stdHours = rSiteConfig?.workerStandardHours || 9;
          const calcOt = ot > 0 ? ot : Math.max(0, h - stdHours);
          const calcNorm = h > 0 ? (ot > 0 ? Math.min(Math.max(0, h - ot), stdHours) : Math.min(h, stdHours)) : 0;
          
          dayNorm += calcNorm;
          dayOT += calcOt;
        }
      });

      if (isSunday) {
        if (i > maxDayWithAttendance) {
          // Sunday is zero until the date is reached
        } else {
          const isWorked = !isAbsent && (dayNorm > 0 || dayOT > 0);
          const hoursWorked = isWorked ? (dayNorm + dayOT) : 0;
          const sundayPaidHours = (hoursWorked * 1.5) + 9;
          
          const sNorm = Math.min(9, sundayPaidHours);
          const sOT = Math.max(0, sundayPaidHours - 9);

          totalHours += sNorm;
          totalSundayOT += sOT;
          if (isWorked) {
            attendanceDays++;
            effectiveBillableHours += hoursWorked;
            dailyGrid[i] = { h: sNorm, ot: sOT, status: 'P', isFriday: isSunday, sitesCount };
          } else {
            dailyGrid[i] = {
              h: 9,
              ot: 0,
              status: 'PL',
              isFriday: isSunday
            };
          }
          grossTotal += sundayPaidHours * hourlyRate;
        }
      } else {
        if (!isAbsent && (dayNorm > 0 || dayOT > 0)) {
          attendanceDays++;
          totalHours += dayNorm;
          totalOTHours += dayOT;
          effectiveBillableHours += dayNorm + dayOT;
          grossTotal += (dayNorm * hourlyRate) + (dayOT * otRate);

          dailyGrid[i] = { h: dayNorm, ot: dayOT, status: 'P', isFriday: isSunday, sitesCount };
        } else if (isAbsent && recordsForDay.length > 0) {
          dailyGrid[i] = { h: 0, ot: 0, status: 'A', isFriday: isSunday };
        }
      }
    }

    const baseYield = totalHours * hourlyRate;
    const accruedOT = (totalOTHours * otRate) + (totalSundayOT * otRate);
    
    const advances = Number(selectedWorker?.advances) || 0;
    const deductions = Number(selectedWorker?.deductions) || 0;
    const additions = Number(selectedWorker?.additions) || 0;
    const netPayable = grossTotal + additions - advances - deductions;

    return {
      year,
      month,
      daysInMonth,
      totalHours,
      totalOTHours,
      totalFridayOT: totalSundayOT, // maps Sunday OT to maintaining compatibility
      attendanceDays,
      effectiveBillableHours,
      dailyGrid,
      baseYield,
      accruedOT,
      grossTotal,
      netPayable,
      hourlyRate
    };
  }, [selectedWorker?.id, selectedWorker?.monthlySalary, selectedWorker?.advances, selectedWorker?.deductions, selectedWorker?.additions, selectedWorker, attendance, settings, reportDate]);

  if (!selectedWorker || !localWorkerData) {
    return (
      <div className="p-6 md:p-10 max-w-[1400px] mx-auto min-h-[90vh] flex flex-col font-sans relative">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-8 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-950 dark:from-white dark:to-zinc-200 rounded-2xl flex items-center justify-center shadow-xl ring-1 ring-zinc-900/5 dark:ring-white/10 overflow-hidden relative group">
               <div className="absolute inset-0 bg-white/20 dark:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
               <img 
                src="https://cdn-icons-png.flaticon.com/512/2921/2921225.png" 
                alt="Construction Logo" 
                className="w-8 h-8 object-contain dark:invert"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">Labour Portal</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Payroll & Compliance System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800/50 backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-line dark:border-white/10 shadow-sm relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              onClick={() => setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors relative z-10"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <label className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors overflow-hidden select-none relative z-10">
              <Calendar className="text-emerald-500 shrink-0" size={16} />
              <span className="text-zinc-800 dark:text-zinc-200 text-base font-semibold min-w-[100px] text-center">
                {reportDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
              </span>
              <input 
                type="month" 
                value={`${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m] = e.target.value.split('-');
                    setReportDate(new Date(parseInt(y), parseInt(m) - 1, 1));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
              />
            </label>
            <button
              onClick={() => setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors relative z-10"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-12 relative z-10">
          <div className="relative flex-1 group w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
            <div className="relative flex items-center bg-white dark:bg-zinc-900/80 backdrop-blur-xl border border-line dark:border-white/10 rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all duration-300">
              <div className="pl-6 pr-3">
                <Search className="text-zinc-400 group-focus-within:text-emerald-500 transition-colors duration-300" size={22} />
              </div>
              <input 
                type="text" 
                placeholder="Search staff identity, index number, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-5 pr-6 bg-transparent border-none outline-none text-lg text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400/70 font-medium"
              />
              <div className="pr-4 hidden sm:flex items-center gap-2">
                <div className="px-4 py-1.5 bg-[#E5E5E5] dark:bg-white/5 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 border border-line dark:border-white/10 tracking-widest uppercase shadow-inner">
                  {filteredByMonth.length} Records
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1 overflow-y-auto pb-12 custom-scrollbar relative z-10">
          <AnimatePresence>
            {filteredByMonth.map((w, idx) => (
              <motion.button 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  delay: idx * 0.03, 
                  duration: 0.4, 
                  type: "spring", 
                  stiffness: 100, 
                  damping: 15 
                }}
                key={w.id}
                onClick={() => setSelectedWorkerId(w.id)}
                className="group relative flex flex-col text-left bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-line dark:border-white/10 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 hover:border-emerald-500/40 dark:hover:border-emerald-500/40"
              >
                {/* Top Banner / Color Hint */}
                <div className="h-20 w-full bg-gradient-to-r from-zinc-100 to-white dark:from-white/5 dark:to-transparent border-b border-zinc-100 dark:border-white/5 group-hover:from-emerald-500/10 group-hover:to-transparent transition-colors duration-500 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 text-emerald-500/10 dark:text-white/5 transform group-hover:scale-110 group-hover:rotate-[15deg] transition-transform duration-700">
                    <FileText size={100} strokeWidth={1} />
                  </div>
                </div>

                <div className="px-6 pb-6 pt-0 flex-1 flex flex-col -mt-10 relative z-10">
                  <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-[1.25rem] flex items-center justify-center text-zinc-800 dark:text-zinc-200 shadow-xl border-4 border-white dark:border-zinc-900 ring-1 ring-zinc-100 dark:ring-white/5 mb-5 group-hover:bg-emerald-500 group-hover:border-emerald-500 group-hover:text-white group-hover:shadow-emerald-500/20 transition-all duration-500 transform group-hover:scale-105 group-hover:-rotate-3">
                    <span className="font-extrabold text-3xl tracking-tight font-serif italic">{w.name.charAt(0)}</span>
                  </div>
                  
                  <div className="mb-6 flex-1">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1.5 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{w.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1">{w.role || 'Unassigned Role'}</span>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-[#F5F5F7] dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Attendance</p>
                        <p className="text-lg font-black text-zinc-900 dark:text-white leading-none">{workerStats[w.id]?.attendanceDays || 0} <span className="text-[10px] text-zinc-500 font-bold uppercase ml-0.5">Days</span></p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-500/10">
                         <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mb-1">Net Pay</p>
                         <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none truncate">{workerStats[w.id]?.netPayable.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0} <span className="text-[10px] text-emerald-500/70 font-bold uppercase ml-0.5">AED</span></p>
                      </div>
                      <div className="col-span-2 bg-[#F5F5F7] dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-white/5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Standard</p>
                          <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{workerStats[w.id]?.totalHours.toFixed(1) || '0.0'}h</p>
                        </div>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-white/10" />
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest mb-1">Overtime</p>
                          <p className="text-sm font-black text-amber-500">{((workerStats[w.id]?.totalOT || 0) + (workerStats[w.id]?.totalFridayOT || 0)).toFixed(1)}h</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-white/10 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-bold mb-1">Index Number</span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-[#E5E5E5] dark:bg-white/5 px-2 py-0.5 rounded-md w-fit">#{w.workerNumber}</span>
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F7] dark:bg-white/5 shadow-sm border border-line dark:border-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500 group-hover:border-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300 transform group-hover:translate-x-1">
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
        
        {filteredByMonth.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 mt-12 mb-12 relative z-10 max-w-md mx-auto text-center">
             <div className="w-24 h-24 bg-white dark:bg-zinc-900 shadow-xl border border-line dark:border-white/10 rounded-[2rem] flex items-center justify-center mb-6 relative group transform hover:scale-105 transition-transform duration-500">
               <div className="absolute inset-0 bg-emerald-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <Search size={40} strokeWidth={1.5} className="text-zinc-300 dark:text-zinc-600 relative z-10 transition-colors group-hover:text-emerald-500" />
             </div>
             <p className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">No identities found</p>
             <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">We couldn't find any staff records matching your search criteria. Try adjusting your terms or <span className="text-emerald-500 cursor-pointer hover:underline" onClick={() => setSearch('')}>clear the search</span>.</p>
          </div>
        )}
        
        {/* Advanced Decorative Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden dark:block">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-12 min-h-screen bg-[#F5F5F7] dark:bg-[#050505] print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto print:max-w-none print:m-0">
        
        <div className="flex items-center justify-between mb-8 print:hidden">
          <button 
            onClick={() => setSelectedWorkerId(null)}
            className="flex items-center gap-2 text-sm font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={16} /> Exit Portal
          </button>
          
          <div className="flex items-center gap-4">
             <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              <Printer size={16} /> Print Card
            </button>
          </div>
        </div>

        {/* --- LABOUR CARD DESIGN --- */}
        <div className="relative bg-white dark:bg-[#0a0a0a] border border-line dark:border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] hover:shadow-[0_60px_120px_-20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-500 overflow-hidden group/card print:shadow-none print:border-none print:rounded-none print:w-[210mm] print:mx-auto print:bg-white print:text-black">
          {/* Cyberpunk background glows inside card */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/8 blur-[120px] -mr-32 -mt-32 rounded-full transition-all duration-500 group-hover/card:bg-emerald-500/12 pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/3 dark:bg-blue-500/5 blur-[120px] -ml-32 -mb-32 rounded-full transition-all duration-500 pointer-events-none" />
          
          {/* Screen Header */}
          <div className="bg-zinc-900 dark:bg-zinc-950 p-8 flex items-center justify-between print:hidden relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-zinc-900/50 to-transparent mix-blend-overlay" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                 <img 
                  src="https://cdn-icons-png.flaticon.com/512/2921/2921225.png" 
                  alt="Construction Logo" 
                  className="w-8 h-8 object-contain invert brightness-0"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Labour Record</h1>
                <p className="text-xs font-semibold text-emerald-400 mt-1 uppercase tracking-widest">Confidential / Payroll Dept</p>
              </div>
            </div>
            <div className="text-right relative z-10 flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-xl border border-white/10 backdrop-blur-sm transition-all relative z-10">
                <button
                  onClick={() => setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1))}
                  className="p-1 hover:bg-white/10 text-[#a1a1aa] hover:text-white rounded transition-colors relative z-10"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <label className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:bg-white/10 rounded transition-colors overflow-hidden select-none relative z-10">
                  <Calendar className="text-emerald-400 shrink-0" size={16} />
                  <span className="text-white text-base font-bold min-w-[90px] text-center">
                    {reportDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                  </span>
                  <input 
                    type="month" 
                    value={`${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m] = e.target.value.split('-');
                        setReportDate(new Date(parseInt(y), parseInt(m) - 1, 1));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto [color-scheme:dark]"
                  />
                </label>
                <button
                  onClick={() => setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 1))}
                  className="p-1 hover:bg-white/10 text-[#a1a1aa] hover:text-white rounded transition-colors relative z-10"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Print Only Header */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 border-2 border-black rounded-xl flex items-center justify-center">
                 <img 
                  src="https://cdn-icons-png.flaticon.com/512/2921/2921225.png" 
                  alt="Construction Logo" 
                  className="w-8 h-8 object-contain custom-print-filter grayscale" 
                  style={{ filter: "brightness(0)" }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-3xl font-black text-black uppercase tracking-widest">Labour Record</h1>
                <p className="text-[10px] font-bold text-black border-t border-black pt-1 uppercase tracking-[0.2em]">Confidential / Payroll Dept</p>
              </div>
            </div>
            <div className="text-right border-l-2 border-black pl-6">
              <p className="text-[10px] font-bold text-black uppercase tracking-widest mb-1">Period</p>
              <p className="text-2xl font-black text-black">
                {reportDate.toLocaleString('default', { month: 'long' })} {year}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 print:p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:gap-4 print:mb-4 text-zinc-800 dark:text-zinc-200">
              <div className="space-y-6 print:space-y-4">
                <div className="relative group p-6 rounded-[2rem] bg-[#F5F5F7]/50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 hover:border-emerald-500/20 transition-all print:p-0 print:border-none print:shadow-none">
                  <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                     <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse print:hidden shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                     EMPLOYEE PROFILE
                     <span className="ml-auto font-serif italic normal-case text-zinc-400 font-medium">श्रम कार्ड / لیبر کارڈ</span>
                  </h2>
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Identity / कर्मचारी पहचान / ملازم کی شناخت</p>
                    <input 
                      className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase bg-transparent border-none outline-none w-full focus:ring-4 focus:ring-emerald-500/10 rounded-2xl print:text-3xl transition-all"
                      value={localWorkerData.name}
                      onChange={(e) => setLocalWorkerData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                      onBlur={(e) => handleBlurSync('name', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 print:gap-2 px-1">
                  <div className="p-4 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-emerald-500/20 transition-all group print:border-none print:shadow-none print:p-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Index No. / انڈیکس</p>
                    <input 
                      className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-emerald-500/20 rounded-lg print:text-xl"
                      value={localWorkerData.workerNumber}
                      onChange={(e) => setLocalWorkerData(prev => prev ? ({ ...prev, workerNumber: e.target.value }) : null)}
                      onBlur={(e) => handleBlurSync('workerNumber', e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-emerald-500/20 transition-all group print:border-none print:shadow-none print:p-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Profession / پیشہ</p>
                    <input 
                      className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight italic font-serif bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-emerald-500/20 rounded-lg print:text-xl"
                      value={localWorkerData.role}
                      onChange={(e) => setLocalWorkerData(prev => prev ? ({ ...prev, role: e.target.value }) : null)}
                      onBlur={(e) => handleBlurSync('role', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F5F7] dark:bg-white/[0.01] rounded-[2.5rem] p-6 border border-zinc-100 dark:border-white/5 shadow-inner relative overflow-hidden print:p-0 print:border-none print:shadow-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 relative z-10 print:gap-y-2 print:gap-x-2">
                  <div className="relative p-5 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm group hover:border-emerald-500/20 transition-all print:p-0 print:border-none print:shadow-none">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-1 flex gap-1">Attendance <span className="opacity-50">/ حاضری</span></p>
                    <div className="flex items-baseline gap-2">
                       <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight print:text-2xl">{attendanceDays}</p>
                       <span className="text-[10px] font-bold text-zinc-400 uppercase italic">Days</span>
                    </div>
                  </div>
                  <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 shadow-sm group hover:bg-emerald-500/10 transition-all print:p-0 print:border-none print:shadow-none print:bg-transparent">
                    <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1 flex gap-1">Hourly Rate <span className="opacity-50">/ شرح</span></p>
                    <div className="flex items-baseline gap-2">
                       <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight print:text-2xl">
                         {hourlyRate.toFixed(2)}
                       </p>
                       <span className="text-[10px] font-bold text-emerald-500/70 uppercase italic">AED</span>
                    </div>
                  </div>
                  <div className="p-5 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm group hover:border-blue-500/20 transition-all print:p-0 print:border-none print:shadow-none">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors line-clamp-1 flex gap-1">Standard Hrs <span className="opacity-50">/ मानक</span></p>
                    <div className="flex items-baseline gap-2">
                       <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight print:text-2xl">{totalHours.toFixed(1)}</p>
                       <span className="text-[10px] font-bold text-zinc-400 uppercase italic">Hrs</span>
                    </div>
                  </div>
                  <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10 shadow-sm group hover:bg-amber-500/10 transition-all print:p-0 print:border-none print:shadow-none print:bg-transparent flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase tracking-widest mb-1 group-hover:text-amber-500 transition-colors line-clamp-1 flex gap-1">Overtime Hrs <span className="opacity-50">/ اوور ٹائم</span></p>
                      <div className="flex items-baseline gap-2">
                         <p className="text-3xl font-black text-amber-500 tracking-tight print:text-2xl">{(totalOTHours + totalFridayOT).toFixed(1)}</p>
                         <span className="text-[10px] font-bold text-amber-500/70 uppercase italic">Hrs</span>
                      </div>
                    </div>
                    <p className="text-[9px] font-bold mt-2 uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 inline-block px-2 py-1 rounded w-fit">
                       Total: {(totalHours + totalOTHours + totalFridayOT).toFixed(1)} Hrs
                    </p>
                  </div>
                </div>
                
                 <div className="mt-6 pt-6 border-t border-line dark:border-white/5 space-y-4 print:mt-2 print:pt-2 print:space-y-2 relative z-10">
                   <div className="flex items-center justify-between bg-white dark:bg-[#0a0a0a] p-3 rounded-xl border border-zinc-100 dark:border-white/5 shadow-sm print:p-0 print:border-none print:shadow-none group hover:border-zinc-300 transition-all">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-800 dark:group-hover:text-zinc-200">Standard Scale</p>
                      <div className="flex items-center gap-2">
                         <input 
                          type="number"
                          className="text-lg font-black text-zinc-900 dark:text-white bg-transparent border-none outline-none w-16 text-right focus:ring-2 focus:ring-emerald-500/20 rounded-lg print:text-base transition-all"
                          value={9}
                          onChange={(e) => onUpdateSettings({ ...settings, standardWorkingHours: Number(e.target.value) })}
                        />
                        <span className="text-xs font-bold text-zinc-400 uppercase bg-[#E5E5E5] dark:bg-white/5 px-2 py-1 rounded text-center">Hrs / Day</span>
                      </div>
                   </div>

                   <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-white/5 dark:to-transparent p-4 rounded-xl border border-line dark:border-white/10 shadow-sm print:p-0 print:border-none print:shadow-none group hover:border-emerald-500/30 transition-all">
                       <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-2">Base Compensation</p>
                       <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Monthly Yield</p>
                          <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-1.5 rounded-lg border border-line dark:border-white/10 group-hover:border-emerald-500/30 transition-all">
                            <input 
                              type="text"
                              disabled={isMasterControlLocked}
                              className="text-xl font-black text-zinc-900 dark:text-white bg-transparent border-none outline-none w-24 text-right focus:ring-0 rounded-lg print:text-base tracking-tighter"
                              value={localWorkerData.monthlySalary}
                              onChange={(e) => setLocalWorkerData(prev => prev ? ({ ...prev, monthlySalary: e.target.value }) : null)}
                              onBlur={(e) => handleBlurSync('monthlySalary', Number(e.target.value))}
                            />
                            <span className="text-xs font-bold text-zinc-400 uppercase">AED</span>
                          </div>
                       </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="mb-12 print:mb-4">
               <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-[0.5em] mb-6 flex items-center gap-4 print:mb-1 print:text-[8px]">
                  <span className="w-12 h-px bg-zinc-900 dark:bg-white" />
                  TIMESHEET LEDGER
                  {isUpdating && <span className="text-[8px] animate-pulse text-emerald-500 print:hidden">SAVING CHANGES...</span>}
               </h4>

               <div className="space-y-4 print:space-y-1">
                  <div className="grid grid-cols-[120px_repeat(16,1fr)] border border-line dark:border-white/5 rounded-2xl overflow-hidden divide-x divide-zinc-200 dark:divide-white/5 bg-white dark:bg-zinc-800/50 shadow-sm print:rounded-none print:text-[7px] print:border-zinc-300">
                    <div className="bg-[#F5F5F7] dark:bg-zinc-800 p-2 flex items-center justify-center border-b border-line dark:border-white/5 print:p-0.5">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Days 1-16</span>
                    </div>
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const day = idx + 1;
                      const date = new Date(year, month, day);
                      const isSunday = date.getDay() === 0;
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
                      return (
                        <div key={idx} className={cn("bg-[#F5F5F7] dark:bg-zinc-800 p-2 flex flex-col items-center justify-center border-b border-line dark:border-white/5 print:p-0.5", isSunday && "bg-zinc-900 dark:bg-zinc-700")}>
                          <span className={cn("text-[8px] font-black uppercase text-zinc-400", isSunday && "text-emerald-500")}>{dayName}</span>
                          <span className={cn("text-xs font-black text-zinc-900 dark:text-white", isSunday && "text-white")}>{day}</span>
                        </div>
                      );
                    })}

                    <div className="bg-white/50 dark:bg-transparent p-2 flex items-center justify-center border-b border-zinc-100 dark:border-white/5 print:p-0.5">
                      <span className="text-[9px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Standard</span>
                    </div>
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const day = idx + 1;
                      const data = dailyGrid[day];
                      const isEditing = editingDay === day;
                      const isSunday = new Date(year, month, day).getDay() === 0;

                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "relative p-1 flex flex-col items-center justify-center border-b border-zinc-100 dark:border-white/5 cursor-pointer hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors group/cell print:p-0",
                            isSunday && "bg-emerald-500/5"
                          )}
                          onClick={() => {
                            if (!isEditing) {
                              setEditingDay(day);
                              setEditHoursValue(data?.status === 'A' ? 'A' : (data?.h ? String(data.h) : ''));
                            }
                          }}
                        >
                          {isEditing ? (
                            <input 
                              autoFocus
                              className="w-full text-center bg-transparent font-black text-emerald-500 outline-none"
                              value={editHoursValue}
                              onChange={(e) => setEditHoursValue(e.target.value)}
                              onBlur={() => handleDayEdit(day)}
                              onKeyDown={(e) => e.key === 'Enter' && handleDayEdit(day)}
                            />
                          ) : (
                            <span className={cn(
                              "text-sm font-black transition-colors print:text-[10px]",
                              data?.status === 'A' ? "text-red-500" : 
                              data?.h > 0 ? (isSunday ? "text-emerald-500" : "text-zinc-600 dark:text-zinc-300") : "text-zinc-200 dark:text-white/5"
                            )}>
                              {data?.status === 'A' ? 'A' : (data?.h > 0 ? data.h : '-')}
                            </span>
                          )}
                          {data?.sitesCount && data.sitesCount >= 2 && (
                            <span className="absolute top-[2px] right-[2px] w-3 h-3 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm" title={`Worked on ${data.sitesCount} sites`}>
                              {data.sitesCount}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    <div className="bg-[#F5F5F7]/50 dark:bg-white/[0.02] p-2 flex items-center justify-center print:p-0.5">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Overtime</span>
                    </div>
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const day = idx + 1;
                      const data = dailyGrid[day];
                      return (
                        <div key={idx} className="p-2 flex flex-col items-center justify-center print:p-0">
                          <span className={cn(
                            "text-[10px] font-black font-mono print:text-[8px]",
                            data?.ot > 0 ? "text-amber-500" : "text-transparent"
                          )}>
                             {data?.ot > 0 ? `+${data.ot}` : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-[120px_repeat(16,1fr)] border border-line dark:border-white/5 rounded-2xl overflow-hidden divide-x divide-zinc-200 dark:divide-white/5 bg-white dark:bg-zinc-800/50 shadow-sm print:rounded-none print:text-[7px] print:border-zinc-300">
                    <div className="bg-[#F5F5F7] dark:bg-zinc-800 p-2 flex items-center justify-center border-b border-line dark:border-white/5 print:p-0.5">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Days 17-31</span>
                    </div>
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const day = idx + 17;
                      if (day > daysInMonth) return <div key={idx} className="bg-[#F5F5F7] dark:bg-zinc-800 border-b border-line dark:border-white/5 opacity-50" />;
                      const date = new Date(year, month, day);
                      const isSunday = date.getDay() === 0;
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
                      return (
                        <div key={idx} className={cn("bg-[#F5F5F7] dark:bg-zinc-800 p-2 flex flex-col items-center justify-center border-b border-line dark:border-white/5 print:p-0.5", isSunday && "bg-zinc-900 dark:bg-zinc-700")}>
                          <span className={cn("text-[8px] font-black uppercase text-zinc-400", isSunday && "text-emerald-500")}>{dayName}</span>
                          <span className={cn("text-xs font-black text-zinc-900 dark:text-white", isSunday && "text-white")}>{day}</span>
                        </div>
                      );
                    })}

                    <div className="bg-white/50 dark:bg-transparent p-2 flex items-center justify-center border-b border-zinc-100 dark:border-white/5 print:p-0.5">
                      <span className="text-[9px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Standard</span>
                    </div>
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const day = idx + 17;
                      if (day > daysInMonth) return <div key={idx} className="border-b border-zinc-100 dark:border-white/5 bg-[#F5F5F7]/20 dark:bg-transparent" />;
                      const data = dailyGrid[day];
                      const isEditing = editingDay === day;
                      const isSunday = new Date(year, month, day).getDay() === 0;

                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "relative p-1 flex flex-col items-center justify-center border-b border-zinc-100 dark:border-white/5 cursor-pointer hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors group/cell print:p-0",
                            isSunday && "bg-emerald-500/5"
                          )}
                          onClick={() => {
                            if (!isEditing) {
                              setEditingDay(day);
                              setEditHoursValue(data?.status === 'A' ? 'A' : (data?.h ? String(data.h) : ''));
                            }
                          }}
                        >
                          {isEditing ? (
                            <input 
                              autoFocus
                              className="w-full text-center bg-transparent font-black text-emerald-500 outline-none"
                              value={editHoursValue}
                              onChange={(e) => setEditHoursValue(e.target.value)}
                              onBlur={() => handleDayEdit(day)}
                              onKeyDown={(e) => e.key === 'Enter' && handleDayEdit(day)}
                            />
                          ) : (
                            <span className={cn(
                               "text-sm font-black transition-colors print:text-[10px]",
                               data?.status === 'A' ? "text-red-500" : 
                               data?.h > 0 ? (isSunday ? "text-emerald-500" : "text-zinc-600 dark:text-zinc-300") : "text-zinc-200 dark:text-white/5"
                            )}>
                              {data?.status === 'A' ? 'A' : (data?.h > 0 ? data.h : '-')}
                            </span>
                          )}
                          {data?.sitesCount && data.sitesCount >= 2 && (
                            <span className="absolute top-[2px] right-[2px] w-3 h-3 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm" title={`Worked on ${data.sitesCount} sites`}>
                              {data.sitesCount}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    <div className="bg-[#F5F5F7]/50 dark:bg-white/[0.02] p-2 flex items-center justify-center print:p-0.5">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Overtime</span>
                    </div>
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const day = idx + 17;
                      if (day > daysInMonth) return <div key={idx} className="bg-[#F5F5F7]/20 dark:bg-transparent" />;
                      const data = dailyGrid[day];
                      return (
                        <div key={idx} className="p-2 flex flex-col items-center justify-center print:p-0">
                           <span className={cn(
                            "text-[10px] font-black font-mono print:text-[8px]",
                            data?.ot > 0 ? "text-amber-500" : "text-transparent"
                          )}>
                             {data?.ot > 0 ? `+${data.ot}` : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 print:gap-4 print:mt-4">
               <div>
                 <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-6 flex items-center gap-4 print:mb-2 print:text-[8px]">
                    <span className="w-12 h-px bg-emerald-500" />
                    TOTAL EARNINGS / कुल कमाई / کل آمدنی
                 </h4>

                 <div className="space-y-4 print:space-y-1">
                    <div className="flex items-center justify-between group">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors print:text-[8px]">Base Yield ({totalHours.toFixed(1)}h)</p>
                       <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter print:text-xl">{baseYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <span className="text-[8px] font-bold text-zinc-400 uppercase italic">AED</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between group">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">
                        Accrued Overtime ({(totalOTHours + totalFridayOT).toFixed(1)}h)
                        {totalFridayOT > 0 && <span className="ml-2 text-[8px] text-emerald-500">Includes {totalFridayOT.toFixed(1)}h Sunday OT @ 1.5x</span>}
                       </p>
                       <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter print:text-xl">{accruedOT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <span className="text-[8px] font-bold text-zinc-400 uppercase italic">AED</span>
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-between group">
                       <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest group-hover:text-emerald-600 transition-colors print:text-[8px]">Payroll Additions / Allowances</p>
                       <div className="flex items-center gap-2">
                         <input 
                            type="number"
                            step="0.01"
                            className="text-xl font-black text-emerald-500 bg-transparent border-none outline-none w-24 text-right focus:ring-2 focus:ring-emerald-500/20 rounded-lg print:text-lg"
                            value={localWorkerData.additions}
                            onChange={(e) => setLocalWorkerData(prev => prev ? ({ ...prev, additions: e.target.value }) : null)}
                            onBlur={(e) => handleBlurSync('additions', Number(e.target.value))}
                          />
                          <span className="text-[8px] font-bold text-zinc-400 uppercase italic">AED</span>
                       </div>
                    </div>

                    <div className="h-px bg-[#E5E5E5] dark:bg-white/5 my-4 print:my-2" />
                    
                    <div className="flex items-center justify-between group bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 print:p-1 print:rounded-none print:border-none">
                       <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest print:text-[8px]">Gross Total Balance</p>
                       <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter print:text-xl">{(grossTotal + (Number(localWorkerData.additions) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <span className="text-[8px] font-bold text-emerald-500/50 uppercase italic">AED</span>
                       </div>
                    </div>
                 </div>
               </div>

               <div className="space-y-4 print:space-y-1">
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em] mb-6 flex items-center gap-4 print:mb-2 print:text-[8px]">
                    <span className="w-12 h-px bg-red-500" />
                    DIRECT DEDUCTIONS / प्रत्यक्ष कटौती / براہ راست کٹوتیاں
                  </h4>

                  <div className="flex items-center justify-between group">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-red-400 transition-colors print:text-[8px]">Advanced Capital / अग्रिम पूंजी /  ایڈوانس</p>
                     <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          step="0.01"
                          className="text-xl font-black text-red-500 bg-transparent border-none outline-none w-24 text-right focus:ring-2 focus:ring-red-500/20 rounded-lg print:text-lg"
                          value={localWorkerData.advances}
                          onChange={(e) => setLocalWorkerData(prev => prev ? ({ ...prev, advances: e.target.value }) : null)}
                          onBlur={(e) => handleAdvanceBlur(Number(e.target.value))}
                        />
                        <span className="text-[8px] font-bold text-zinc-400 uppercase italic">AED</span>
                     </div>
                  </div>

                  {/* Linked Manager Wallet Selector */}
                  {!isMasterControlLocked && (settings.managerWallets || []).length > 0 && (
                     <div className="flex items-center justify-between py-1.5 px-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-dashed border-zinc-200 dark:border-white/5 print:hidden">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                           <Wallet size={11} className="text-emerald-500" />
                           Deduct Advance From:
                        </p>
                        <select
                           value={selectedManagerId}
                           onChange={(e) => setSelectedManagerId(e.target.value)}
                           className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 bg-transparent border-none outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-1 text-right max-w-[200px] cursor-pointer"
                        >
                           <option value="none">None (Direct Cash / Manual)</option>
                           {(settings.managerWallets || []).map((wallet) => (
                              <option key={wallet.id} value={wallet.id}>
                                 {wallet.managerName} ({wallet.balance.toLocaleString()} AED)
                              </option>
                           ))}
                        </select>
                     </div>
                  )}

                  <div className="flex items-center justify-between group">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-red-400 transition-colors print:text-[8px]">Reduction / Penalties / कटौती / جرمانہ</p>
                     <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          step="0.01"
                          className="text-xl font-black text-red-500 bg-transparent border-none outline-none w-24 text-right focus:ring-2 focus:ring-red-500/20 rounded-lg print:text-lg"
                          value={localWorkerData.deductions}
                          onChange={(e) => setLocalWorkerData(prev => prev ? ({ ...prev, deductions: e.target.value }) : null)}
                          onBlur={(e) => handleBlurSync('deductions', Number(e.target.value))}
                        />
                        <span className="text-[8px] font-bold text-zinc-400 uppercase italic">AED</span>
                     </div>
                  </div>

                  <div className="relative mt-12 p-8 bg-zinc-900 dark:bg-zinc-800 rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden group print:mt-1 print:p-2 print:rounded-xl">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700 print:hidden" />
                     
                     <div className="relative z-10 flex items-center justify-between">
                        <div>
                           <h5 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1 print:text-[8px]">NET PAYABLE</h5>
                           <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] font-serif italic">शुद्ध देय / کل قابل ادائیگی</p>
                        </div>
                        <div className="text-right">
                           <p className="text-4xl font-black text-white tracking-widest font-serif italic print:text-xl">{netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="mt-12 px-4 print:mt-6">
               <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Operational Comments</h4>
               <textarea 
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  onBlur={() => handleBlurSync('comment', comments)}
                  onInput={(e) => {
                     e.currentTarget.style.height = 'auto';
                     e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                  }}
                  placeholder="Enter operational notes here..."
                  className="w-full text-xs font-medium text-zinc-500 dark:text-zinc-400 italic bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-zinc-300 dark:placeholder:text-zinc-600 print:text-zinc-800"
                  rows={2}
               />
               <div className="h-px bg-[#E5E5E5] dark:bg-white/5 w-full mt-2 print:hidden" />
            </div>

            <div className="mt-8 flex items-center justify-center text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em] px-4 print:mt-1">
               <p className="italic font-serif uppercase tracking-widest text-zinc-400">Developed by {settings.systemCreator}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
