import React from 'react';
import { Worker, AttendanceRecord, SystemSettings } from '../types';
import { Search, Calendar, Building2, UserX, AlertCircle } from 'lucide-react';
import { cn, formatCurrency, getLocalDateString } from '../lib/utils';

interface AbsentWorkersProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  settings: SystemSettings;
}

export const AbsentWorkers: React.FC<AbsentWorkersProps> = ({
  workers,
  attendance,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [startDate, setStartDate] = React.useState<string>(getLocalDateString());
  const [endDate, setEndDate] = React.useState<string>(getLocalDateString());

  const absentWorkers = React.useMemo(() => {
    return workers.filter(worker => {
      if (worker.status !== 'Active') return false;

      // Do not consider absent if they haven't joined yet by the end date
      if (worker.joiningDate && worker.joiningDate > endDate) return false;

      // Do not consider absent if they are on vacation during this period
      if (worker.vacationStartDate && worker.vacationStartDate <= endDate) {
         if (!worker.vacationReturnDate || worker.vacationReturnDate > startDate) {
             return false;
         }
      }

      const hasAttendanceInRange = attendance.some(a => {
        const isWorker = a.workerIds?.includes(worker.id);
        if (!isWorker) return false;
        const recordDate = a.date;
        return recordDate >= startDate && recordDate <= endDate;
      });

      const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.workerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.company.toLowerCase().includes(searchTerm.toLowerCase());

      return !hasAttendanceInRange && matchesSearch;
    });
  }, [workers, attendance, startDate, endDate, searchTerm]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-sans font-semibold text-zinc-900 dark:text-white tracking-tight leading-none mb-2">Absent Workers</h2>
          <p className="text-zinc-500 text-sm font-medium">Identify workers who have not been assigned to any site in the selected period.</p>
        </div>
      </div>

      <div className="relative glass-card rounded-2xl overflow-hidden border-line dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-red-500/20 dark:hover:border-red-500/20 transition-all duration-300 group">
        {/* Urgent alert red ambient glow backdrop */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/3 dark:bg-red-500/5 blur-[120px] -mr-56 -mt-56 rounded-full pointer-events-none group-hover:scale-110 transition-all duration-500 animate-pulse" />
        <div className="p-6 border-b border-line dark:border-white/10 bg-[#F5F5F7]/50 dark:bg-[#141414]/50 flex flex-col lg:flex-row lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-3 flex-1 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl border border-line dark:border-white/10 shadow-sm">
            <Search size={16} className="text-zinc-400" />
            <input
              type="text"
              placeholder="Search absent workers..."
              className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full dark:text-white dark:placeholder-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">From:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2.5 focus:ring-1 focus:ring-zinc-400 dark:text-white cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">To:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2.5 focus:ring-1 focus:ring-zinc-400 dark:text-white cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F7]/80 dark:bg-zinc-900/80 border-b border-line dark:border-white/5">
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">S.No.</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Emp.No.</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Last Site</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-white/5">
              {absentWorkers.length > 0 ? (
                absentWorkers.map((worker, index) => (
                  <tr key={`absent-worker-${worker.id}-${index}`} className="hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors group bg-red-50/10 dark:bg-red-900/5">
                    <td className="px-6 py-4 text-xs font-mono text-zinc-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400">{worker.name}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-500">{worker.workerNumber}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-700 dark:text-zinc-300">{worker.company}</div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const records = attendance.filter(a => a.workerIds?.includes(worker.id) && a.site);
                        const lastRecord = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        
                        const lastSite = lastRecord?.site;
                        return lastSite ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E5E5E5] dark:bg-zinc-800 rounded-full text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                            <Building2 size={12} />
                            {lastSite}
                          </div>
                        ) : <span className="text-zinc-400">-</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                        <UserX size={12} />
                        Absent
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-[#E5E5E5] dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                        <AlertCircle size={24} />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">No absent workers found for the selected period.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
