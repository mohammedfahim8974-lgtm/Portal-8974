import React from 'react';
import { Notification } from '../types';
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onClearAll
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="absolute top-12 right-0 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-line dark:border-zinc-800 z-50 overflow-hidden">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-[#F5F5F7]/50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-zinc-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onClearAll}
            className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
            title="Clear all"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {notifications.length > 0 ? (
            notifications.map((n, index) => (
              <motion.div
                key={`notif-${n.id}-${index}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "p-4 border-b border-zinc-50 dark:border-zinc-800 last:border-0 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/50 transition-colors cursor-pointer relative group",
                  !n.read && "bg-[#F5F5F7]/30 dark:bg-zinc-800/20"
                )}
                onClick={() => onMarkAsRead(n.id)}
              >
                {!n.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900 dark:bg-white" />
                )}
                <div className="flex gap-3">
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={cn(
                        "text-xs font-bold truncate",
                        n.read ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-900 dark:text-white"
                      )}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    {n.action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          n.action?.onClick();
                          onMarkAsRead(n.id);
                        }}
                        className="mt-2 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors"
                      >
                        {n.action.label}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-[#F5F5F7] dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell size={20} className="text-zinc-300" />
              </div>
              <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic font-serif">Information Protocol</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-2">Information is currently not provided in the directory.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {notifications.length > 0 && (
        <div className="p-3 bg-[#F5F5F7] dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <button 
            onClick={onClearAll}
            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white uppercase tracking-wider transition-colors"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};
