import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Activity, 
  DollarSign, 
  Database, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  PieChart as PieChartIcon,
  LayoutGrid,
  History,
  Trophy,
  Plus,
  Search as SearchIcon,
  FileText as FileIcon,
  Calculator as CalcIcon,
  Shield,
  Zap,
  Target,
  BarChart3,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Worker, AttendanceRecord, SystemSettings } from '../types';
import { cn, formatCurrency, safeShowPicker } from '../lib/utils';

interface DashboardProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  settings: SystemSettings;
  onBootstrap: () => Promise<void>;
  isBootstrapping: boolean;
  syncStatus?: 'IDLE' | 'FETCHING' | 'SUCCESS' | 'ERROR';
  lastError?: string | null;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  isMasterControlLocked?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 }
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  workers, 
  attendance, 
  settings, 
  onBootstrap, 
  isBootstrapping,
  syncStatus,
  lastError,
  selectedMonth,
  onMonthChange,
  isMasterControlLocked = false
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Memoized workers lookup map to achieve O(1) matching performance
  const workersMap = useMemo(() => {
    const map = new Map<string, Worker>();
    if (Array.isArray(workers)) {
      workers.forEach((w) => {
        if (w && w.id) {
          map.set(w.id, w);
        }
      });
    }
    return map;
  }, [workers]);

  const stats = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    
    const currentMonthAttendance = attendance.filter(r => {
      if (!r.date) return false;
      const [y, m] = r.date.split('-');
      return parseInt(y, 10) === year && parseInt(m, 10) === month;
    });

    const totalWorkers = workers.length;
    const computeManpower = (curr: any) => {
      if (curr.status === 'absent') return 0;
      const wids = curr.workerIds?.length || 0;
      return wids > 0 ? wids : (curr.mp !== undefined ? Number(curr.mp) : 1);
    };

    const totalPresent = currentMonthAttendance.reduce((acc, curr) => acc + computeManpower(curr), 0);
    const totalPayroll = workers.reduce((acc, curr) => acc + (curr.monthlySalary || 0), 0);
    const totalRecords = currentMonthAttendance.length;
    
    // Accuracy: Use days passed so far if current month
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth;

    // Efficiency: compared to expected days in month (standard 30 days)
    const expectedManpower = totalWorkers * daysPassed;
    const efficiency = expectedManpower > 0 ? Math.round((totalPresent / expectedManpower) * 100) : 0;
    
    const missingRecords = totalWorkers > 0 ? Math.max(0, expectedManpower - totalPresent) : 0;

    return { totalWorkers, totalPresent, totalPayroll, totalRecords, efficiency, missingRecords, currentMonthAttendance };
  }, [workers, attendance, selectedMonth]);

  const chartData = useMemo(() => {
    const { currentMonthAttendance } = stats;

    const grouped = currentMonthAttendance.reduce((acc: any, curr) => {
      if (!curr.date) return acc;
      const date = curr.date;
      if (!acc[date]) acc[date] = { date, manpower: 0, total: 0 };
      const wids = curr.workerIds?.length || 0;
      const mpVal = curr.status === 'absent' ? 0 : (wids > 0 ? wids : (curr.mp !== undefined ? Number(curr.mp) : 1));
      acc[date].manpower += mpVal;
      acc[date].total += (curr.total || 0);
      return acc;
    }, {});
    
    const sortedAvailable = [...Object.values(grouped)].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Always show 7 days, even if zero.
    const finalData = [];
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    
    // Determine the last day we should show up to (either today, or last day of the selected month)
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDay = isCurrentMonth ? today.getDate() : daysInMonth;

    for (let i = 6; i >= 0; i--) {
      const d = endDay - i;
      if (d <= 0) continue; // If we are at the very beginning of the month, we might show fewer days or cross month boundaries (kept simple here)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const existing = sortedAvailable.find((item: any) => {
         const [y, m, dd] = item.date.split('-');
         return parseInt(y, 10) === year && parseInt(m, 10) === month && parseInt(dd, 10) === d;
      });
      finalData.push(existing || { date: dateStr, manpower: 0, total: 0 });
    }
    
    // If the month just started and we have fewer than 7 days, let's just make sure we have something to render
    if (finalData.length === 0) {
       finalData.push({ date: `${year}-${String(month).padStart(2, '0')}-01`, manpower: 0, total: 0 });
    }

    return finalData;
  }, [stats]);

  const pieData = useMemo(() => {
    const companies = workers.reduce((acc: Record<string, number>, curr) => {
      acc[curr.company] = (acc[curr.company] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(companies).map(([name, value]) => ({ name, value }));
  }, [workers]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  if (workers.length === 0 && !isBootstrapping) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        <div className="max-w-2xl w-full glass-card p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          
          <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative">
            <LayoutGrid size={40} className="text-emerald-500" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-x-[-8px] inset-y-[-8px] border border-dashed border-emerald-500/20 rounded-[2.5rem]"
            />
          </div>

          <h1 className="luxury-heading text-5xl mb-4 text-zinc-900 dark:text-white mt-4 tracking-tighter">Initialize Intelligence</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto mb-12 text-base leading-relaxed font-medium">
            No workforce data has been detected in the cloud vault. You can either <span className="text-emerald-600 dark:text-emerald-400 font-bold">restore from a backup</span> in Settings or bootstrap the system with sample intelligence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div className="p-5 bg-[#F5F5F7] dark:bg-white/5 rounded-2xl border border-line dark:border-white/10 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-emerald-500" />
                <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Portal Health</h4>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">ID: FahimKhan_Portal</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  syncStatus === 'ERROR' ? "bg-red-500" : "bg-emerald-500 animate-pulse"
                )} />
                <span className="text-[9px] font-black uppercase text-zinc-400">Sync: {syncStatus}</span>
              </div>
            </div>

            <div className="p-5 bg-[#F5F5F7] dark:bg-white/5 rounded-2xl border border-line dark:border-white/10 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-blue-500" />
                <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Recovery Flow</h4>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">Use "Settings" to recover legacy system data via JSON upload.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onBootstrap}
              className="w-full sm:w-auto px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              Bootstrap Sample Data
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'settings' }))}
              className="w-full sm:w-auto px-10 py-4 bg-white dark:bg-white/5 text-zinc-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] border border-line dark:border-white/10 hover:bg-[#F5F5F7] transition-all"
            >
              Open Recovery Hub
            </button>
          </div>

          {lastError && (
            <div className="mt-8 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
              <p className="text-[9px] font-mono text-red-500/70 uppercase">Diagnostic: {lastError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
            <h2 className="luxury-heading text-4xl tracking-tight text-zinc-900 dark:text-white">Strategic Intelligence</h2>
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] font-serif italic ml-5 opacity-70">Operational Command & Control Center</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="bg-white dark:bg-white/5 border border-line dark:border-white/10 rounded-xl px-2 py-1 flex items-center shadow-sm gap-1 relative">
            <button
              onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors relative z-10"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <label className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors overflow-hidden select-none relative">
              <Calendar className="text-emerald-500 shrink-0" size={16} />
              <span className="text-zinc-900 dark:text-white font-black text-sm uppercase tracking-widest min-w-[100px] text-center">
                {selectedMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
              </span>
              <input 
                type="month" 
                value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m] = e.target.value.split('-');
                    onMonthChange(new Date(parseInt(y), parseInt(m) - 1, 1));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
              />
            </label>
            <button
              onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors relative z-10"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="hidden xl:flex items-center gap-4 px-5 py-2.5 bg-white dark:bg-white/5 rounded-2xl border border-line dark:border-white/10 shadow-sm backdrop-blur-xl">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#050505] bg-[#E5E5E5] dark:bg-zinc-800 flex items-center justify-center overflow-hidden shadow-lg ring-1 ring-black/5">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-zinc-900 dark:text-white uppercase tracking-widest leading-none">Command Staff</span>
              <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                4 Active Sessions
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'master' }))}
              className="flex items-center gap-3 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl shadow-xl shadow-zinc-900/10 dark:shadow-white/5 transition-all group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deploy Personnel</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'attendance' }))}
              className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-white/5 hover:bg-[#F5F5F7] dark:hover:bg-white/10 text-zinc-900 dark:text-white rounded-xl border border-line dark:border-white/10 shadow-sm transition-all group"
            >
              <Activity size={18} className="group-hover:scale-110 transition-transform text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Log Intel</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Efficiency Card */}
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-8 glass-card p-6 relative overflow-hidden group border-line dark:border-white/10 bg-white dark:bg-white/5 shadow-xl hover:shadow-2xl hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300"
        >
          {/* Pulsing neon light background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] -mr-56 -mt-56 rounded-full transition-all duration-300 group-hover:bg-emerald-500/18 animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/3 dark:bg-emerald-500/5 blur-[100px] -ml-24 -mb-24 rounded-full pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-10">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <circle cx="112" cy="112" r="100" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-zinc-100 dark:text-white/5" />
                <motion.circle 
                  cx="112" cy="112" r="100" fill="transparent" stroke="currentColor" strokeWidth="12" 
                  strokeDasharray={2 * Math.PI * 100}
                  initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - stats.efficiency / 100) }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  strokeLinecap="round"
                  className="text-emerald-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none group-hover:scale-110 transition-transform duration-300">{stats.efficiency}%</span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-3 opacity-60">Efficiency Rating</span>
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="luxury-heading text-3xl mb-3 text-zinc-900 dark:text-white">Operational Dominance</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed font-medium">
                  Your workforce is currently operating at <span className="text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">peak capacity</span>. 
                  Strategic resource allocation has resulted in a <span className="text-zinc-900 dark:text-white font-bold">12% increase</span> in intelligence throughput this month.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-[#F5F5F7] dark:bg-white/2 rounded-[1.5rem] border border-line dark:border-white/5 shadow-inner hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 opacity-60">Active Assets</p>
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{stats.totalWorkers}</p>
                </div>
                <div className="p-5 bg-[#F5F5F7] dark:bg-white/2 rounded-[1.5rem] border border-line dark:border-white/5 shadow-inner hover:scale-[1.02] transition-transform duration-200">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 opacity-60">Data Points</p>
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{stats.totalRecords}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary Stats */}
        <div className="lg:col-span-4 grid grid-rows-2 gap-4">
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="glass-card p-4 relative overflow-hidden group border-line dark:border-white/10 bg-white dark:bg-white/5 shadow-md hover:shadow-xl hover:border-red-500/30 dark:hover:border-red-500/30 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-[50px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            <div className="relative flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Shield size={20} className="group-hover:animate-bounce" />
              </div>
              <span className="text-[9px] font-black text-red-600 dark:text-red-500 uppercase tracking-widest bg-red-500/5 px-2 py-1 rounded-full border border-red-500/10 select-none animate-pulse">Data Integrity</span>
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 opacity-60">Unmarked Records</p>
            <p className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4 leading-none">
              {stats.missingRecords}
            </p>
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              <div className="p-1 bg-[#F5F5F7]0/10 rounded-lg">
                <AlertCircle size={14} className="text-red-500" />
              </div>
              <span>Missing intelligence gaps detected</span>
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="glass-card p-4 relative overflow-hidden group border-line dark:border-white/10 bg-white dark:bg-white/5 shadow-md hover:shadow-xl hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-[50px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            <div className="relative flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <DollarSign size={20} className="group-hover:rotate-12" />
              </div>
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest bg-amber-500/5 px-2 py-1 rounded-full border border-amber-500/10 select-none">Financial</span>
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 opacity-60">Monthly Outlay</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4 leading-none">
              {formatCurrency(stats.totalPayroll, settings.currency)}
            </p>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest">
              <div className="p-1 bg-red-500/10 rounded-lg">
                <ArrowDownRight size={14} />
              </div>
              <span>-2.1% from last month</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.1, delay: 0.1 }}
          className="lg:col-span-2 relative bg-white dark:bg-white/5 rounded-3xl border border-line dark:border-white/10 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-8 hover:shadow-2xl hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 group"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/8 blur-[100px] -mr-24 -mt-24 rounded-full transition-all duration-300 group-hover:bg-emerald-500/12 pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 dark:bg-purple-500/5 blur-[80px] -ml-16 -mb-16 rounded-full pointer-events-none" />
          </div>
          <div className="relative z-10 flex items-center justify-between mb-6">
            <div>
              <h3 className="luxury-heading text-2xl text-zinc-900 dark:text-white">Operational Velocity</h3>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2 opacity-60">7-Day Manpower & Financial Flow</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live Feed</span>
              </div>
              <TrendingUp className="text-emerald-500" size={24} />
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              {chartData.length > 0 ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorManpower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-zinc-200 dark:text-white/5" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="currentColor" 
                    className="text-zinc-400 dark:text-white/20"
                    fontSize={11} 
                    fontWeight={600}
                    tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { weekday: 'short' })}
                    axisLine={false}
                    tickLine={false}
                    dy={15}
                  />
                  <YAxis stroke="currentColor" className="text-zinc-400 dark:text-white/20" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      border: '1px solid rgba(0,0,0,0.05)', 
                      borderRadius: '20px', 
                      backdropFilter: 'blur(15px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ fontSize: '13px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '6 6' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="manpower" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorManpower)" 
                    animationDuration={800}
                  />
                </AreaChart>
              ) : (
                <div className="flex items-center justify-center h-full w-full text-zinc-400 dark:text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
                  No Data Available
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.2, delay: 0.15 }}
          className="relative bg-white dark:bg-white/5 rounded-3xl border border-line dark:border-white/10 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-10 hover:shadow-2xl hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300 group"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/8 blur-[100px] -mr-24 -mt-24 rounded-full transition-all duration-300 group-hover:bg-blue-500/12 pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/5 blur-[80px] -ml-16 -mb-16 rounded-full pointer-events-none" />
          </div>
          <div className="relative z-10 flex items-center justify-between mb-10">
            <div>
              <h3 className="luxury-heading text-3xl text-zinc-900 dark:text-white">Entity Distribution</h3>
              <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-3 opacity-60">Workforce by Company</p>
            </div>
            <PieChartIcon className="text-blue-500" size={28} />
          </div>
          <div className="h-[420px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              {pieData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={90}
                    outerRadius={135}
                    paddingAngle={10}
                    dataKey="value"
                    animationDuration={800}
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      border: '1px solid rgba(0,0,0,0.05)', 
                      borderRadius: '20px', 
                      backdropFilter: 'blur(15px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{value}</span>}
                  />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full w-full text-zinc-400 dark:text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
                  No Data Available
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Leaderboard & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div 
          variants={itemVariants} 
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.1, delay: 0.2 }}
          className="glass-card p-10 relative overflow-hidden group border-line dark:border-white/10 bg-white dark:bg-white/5 shadow-xl hover:shadow-2xl hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all duration-300"
        >
          {/* Cyberpunk background glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/8 blur-[100px] -mr-24 -mt-24 rounded-full transition-all duration-300 group-hover:bg-amber-500/12 pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/5 blur-[80px] -ml-16 -mb-16 rounded-full transition-all duration-300 group-hover:bg-emerald-500/10 pointer-events-none" />

          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl border border-amber-500/10 dark:border-amber-500/20 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <Trophy className="text-amber-500 group-hover:rotate-[360deg] transition-transform duration-1000" size={26} />
              </div>
              <div>
                <h3 className="luxury-heading text-3xl text-zinc-900 dark:text-white">Entity Leaderboard</h3>
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">ranking indicators</p>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {[...pieData].sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 5).map((company, i) => (
              <div key={`leaderboard-${company.name}-${i}`} className="flex items-center justify-between p-7 bg-[#F5F5F7] dark:bg-white/2 rounded-[2rem] border border-line dark:border-white/5 group hover:bg-[#E5E5E5] dark:hover:bg-white/5 transition-all duration-200 hover:-translate-y-1 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-7">
                  <span className="text-3xl font-black text-zinc-200 dark:text-zinc-800 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-200">0{i + 1}</span>
                  <div>
                    <p className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{company.name}</p>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1.5 font-medium opacity-60">{(company.value as React.ReactNode)} Personnel</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className="text-xs font-black text-zinc-900 dark:text-white">{Math.round(((company.value as number) / (stats.totalWorkers || 1)) * 100)}%</span>
                  <div className="h-2 w-32 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((company.value as number) / (stats.totalWorkers || 1)) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants} 
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.1, delay: 0.25 }}
          className="glass-card p-10 relative overflow-hidden group border-line dark:border-white/10 bg-white dark:bg-white/5 shadow-xl hover:shadow-2xl hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all duration-300"
        >
          {/* Cyberpunk background glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/8 blur-[100px] -mr-24 -mt-24 rounded-full transition-all duration-300 group-hover:bg-purple-500/12 pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/5 blur-[80px] -ml-16 -mb-16 rounded-full transition-all duration-300 group-hover:bg-emerald-500/10 pointer-events-none" />

          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-purple-500/10 dark:bg-purple-500/15 rounded-2xl border border-purple-500/10 dark:border-purple-500/20 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <History className="text-purple-500 dark:text-purple-400 group-hover:rotate-[-360deg] transition-transform duration-1000" size={26} />
              </div>
              <div>
                <h3 className="luxury-heading text-3xl text-zinc-900 dark:text-white">Recent Intelligence</h3>
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">Real-time attendance logs</p>
              </div>
            </div>
            
            {/* Live stream badge */}
            <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 dark:border-purple-500/20 rounded-full select-none">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
              <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest font-mono">live feed</span>
            </span>
          </div>

          <div className="space-y-6 relative z-10">
            {attendance.slice(-5).reverse().map((record, i) => (
              <div key={`recent-${record.id}-${i}`} className="flex items-center justify-between p-6 bg-[#F5F5F7] dark:bg-white/2 rounded-[2rem] border border-line dark:border-white/5 hover:bg-[#E5E5E5]/50 dark:hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-purple-500/10 dark:hover:border-purple-500/10 group/item">
                <div className="flex items-center gap-6 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover/item:scale-110 group-hover/item:bg-purple-500/20 dark:group-hover/item:bg-purple-500/20 transition-all duration-300 shadow-inner border border-purple-500/5">
                    <Activity size={20} className="group-hover/item:animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-zinc-900 dark:text-white group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors truncate max-w-[200px]">{record.site}</p>
                    <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium opacity-60 flex-shrink-0 font-mono">{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <span className="text-[8px] text-zinc-300">•</span>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[220px]">
                        <span className="font-bold text-purple-500 dark:text-purple-400 group-hover/item:text-purple-600 dark:group-hover/item:text-purple-300 transition-colors">
                          {record.workerIds.map(id => workersMap.get(id)?.name || 'Unknown').join(', ')}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end justify-center min-w-[75px] pl-4">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 text-xs font-black text-zinc-900 dark:text-white tracking-tight font-mono select-none">
                    {record.mp} MP
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-widest mt-2 bg-emerald-500/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 font-mono select-none">
                    {formatCurrency(record.total, settings.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );

};
