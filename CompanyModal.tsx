import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Search, Filter } from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHARED_DATA_ID = 'FahimKhan_Portal';

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    try {
      const savedLogs = JSON.parse(localStorage.getItem(`portal_${SHARED_DATA_ID}_activity_logs`) || '[]');
      savedLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(savedLogs);
    } catch (e) {
      console.error("Error parsing logs:", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'CREATE': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
      case 'UPDATE': return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
      case 'DELETE': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-zinc-600 bg-[#E5E5E5] dark:text-zinc-400 dark:bg-zinc-800';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-line dark:border-white/10"
        >
          <div className="flex items-center justify-between p-6 border-b border-line dark:border-white/10 bg-[#F5F5F7] dark:bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Activity Log</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Track system changes and user logins</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-[#E5E5E5] dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-4 border-b border-line dark:border-white/10 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-zinc-400" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN">Logins</option>
                <option value="CREATE">Creations</option>
                <option value="UPDATE">Updates</option>
                <option value="DELETE">Deletions</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <Activity size={48} className="mx-auto mb-4 opacity-20" />
                <p>No activity logs found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl border border-zinc-100 dark:border-white/5 bg-[#F5F5F7]/50 dark:bg-zinc-800/20 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/50 transition-colors">
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider uppercase ${getActionColor(log.action)}`}>
                      {log.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">{log.details}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium">{log.userEmail}</span>
                        <span>&bull;</span>
                        <span>{log.entity}</span>
                        <span>&bull;</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
