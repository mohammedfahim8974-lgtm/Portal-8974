import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { logActivity } from "../lib/activity-logger";
import {
  Building2,
  MapPin,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Users,
  ChevronLeft,
  Database,
  Trash2,
  Clock,
  Calendar,
  Search,
  Layout,
  Plus,
  Edit2,
  FolderMinus,
  DollarSign,
  Lock,
  FolderPlus,
  AlertTriangle,
} from "lucide-react";
import { CompanyModal } from "./CompanyModal";
import { SiteModal } from "./SiteModal";
import { FolderModal } from "./FolderModal";
import { cn, getSiteRate, getSiteSettings, isSameSite } from "../lib/utils";
import { SystemSettings, AttendanceRecord, Worker } from "../types";
import { ConfirmationModal } from "./ConfirmationModal";

interface AttendanceSelectionProps {
  settings: SystemSettings;
  attendance: AttendanceRecord[];
  workers: Worker[];
  onSelect: (type: "company" | "site", value: string) => void;
  onBootstrap?: () => void;
  isBootstrapping?: boolean;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onUpdateAttendanceRecords?: (records: AttendanceRecord[]) => void;
  isAdmin?: boolean;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  isMonthLocked?: boolean;
  onUnlockMonth?: () => void;
  initialSearchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export const AttendanceSelection = React.memo(function AttendanceSelection({
  settings,
  attendance,
  workers,
  onSelect,
  onBootstrap,
  isBootstrapping,
  onUpdateSettings,
  onUpdateAttendanceRecords,
  isAdmin,
  selectedMonth,
  onMonthChange,
  isMonthLocked = false,
  onUnlockMonth,
  initialSearchTerm = "",
  onSearchChange,
}: AttendanceSelectionProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [deleteModal, setDeleteModal] = useState<{
    type: "company" | "site" | "folder";
    value: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('done'); // 'done' | 'not_continued' | 'duplicate' | 'other'
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<{
    name: string;
    rate: number;
    folder?: string;
  } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [draggedSite, setDraggedSite] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isDragOverSection, setIsDragOverSection] = useState(false);

  const handleMoveSite = (siteName: string, targetFolder: string | null) => {
    if (!onUpdateSettings) return;
    const newSettings = { ...settings };
    if (!newSettings.siteGroups) newSettings.siteGroups = {};
    if (!newSettings.projectSites) newSettings.projectSites = [];

    // Ensure it is in the project sites list
    if (!newSettings.projectSites.includes(siteName)) {
      newSettings.projectSites.push(siteName);
    }

    // Remove from any existing group
    Object.keys(newSettings.siteGroups).forEach((groupName) => {
      if (newSettings.siteGroups![groupName]) {
        newSettings.siteGroups![groupName] = newSettings.siteGroups![
          groupName
        ].filter((s) => s !== siteName);
      }
    });

    // Add to the new target folder (if one was selected, otherwise add to Uncategorized to bypass autogroup rules)
    const folderToAssign = targetFolder || "Uncategorized";
    if (!newSettings.siteGroups[folderToAssign]) {
      newSettings.siteGroups[folderToAssign] = [];
    }
    if (!newSettings.siteGroups[folderToAssign].includes(siteName)) {
      newSettings.siteGroups[folderToAssign].push(siteName);
    }

    onUpdateSettings(newSettings);
  };

  const handleCreateFolder = (folderName: string) => {
    if (!onUpdateSettings) return;
    const newSettings = { ...settings };
    if (!newSettings.siteGroups) newSettings.siteGroups = {};

    if (editingFolder) {
      // Renaming
      if (editingFolder !== folderName) {
        const sitesInFolder = newSettings.siteGroups[editingFolder] || [];
        delete newSettings.siteGroups[editingFolder];
        newSettings.siteGroups[folderName] = sitesInFolder;
      }
      setEditingFolder(null);
    } else {
      // Creating
      if (!newSettings.siteGroups[folderName]) {
        newSettings.siteGroups[folderName] = [];
      }
    }
    onUpdateSettings(newSettings);
  };

  const filteredAttendance = React.useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    return attendance.filter((a) => {
      if (!a.date) return false;
      const [y, m] = a.date.split('-');
      return parseInt(y, 10) === year && (parseInt(m, 10) - 1) === month;
    });
  }, [attendance, selectedMonth]);

  const activeCompanies = Array.from(
    new Set(filteredAttendance.map((a) => a.companyName).filter(Boolean)),
  );
  const activeSites = Array.from(
    new Set(filteredAttendance.map((a) => a.site).filter(Boolean)),
  );

  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
  const hiddenCompanies = settings.hiddenCompaniesByMonth?.[monthKey] || [];
  const hiddenSites = settings.hiddenSitesByMonth?.[monthKey] || [];

  const companies = Array.from(
    new Set([...(settings.companies || []), ...activeCompanies]),
  )
    .filter(Boolean)
    .filter((c) => {
      if (hiddenCompanies.includes(c)) return false;
      if (c.toLowerCase().includes(searchTerm.toLowerCase())) return true;
      // Check if any worker matching search term is in this company
      return workers.some(
        (w) =>
          w.company === c &&
          (w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.workerNumber.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    });

  const getSiteStatsMemo = React.useCallback(
    (site: string) => {
      const siteAttendance = filteredAttendance.filter((a) => a.site && isSameSite(a.site, site));
      const siteWorkers = new Set(
        siteAttendance.flatMap((a) => a.workerIds || []),
      );
      return {
        workerCount: siteWorkers.size,
        recordCount: siteAttendance.length,
      };
    },
    [filteredAttendance],
  );

  const sites = Array.from(
    new Set([...(settings.projectSites || []), ...activeSites]),
  )
    .filter(Boolean)
    .filter((s) => {
      if (s.toUpperCase() === "ABC") return false;
      if (hiddenSites.includes(s)) return false;
      if (s.toLowerCase().includes(searchTerm.toLowerCase())) return true;
      // Check if any worker matching search term was present at this site in selected month

      const siteRecords = filteredAttendance.filter((a) => a.site && isSameSite(a.site, s));
      const workerIdsAtSite = new Set(
        siteRecords.flatMap((a) => a.workerIds || []),
      );
      return workers.some(
        (w) =>
          workerIdsAtSite.has(w.id) &&
          (w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.workerNumber.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    });

  const categorizedSites = React.useMemo(() => {
    const groups: Record<string, string[]> = {};
    const allGroupedSites = new Set<string>();

    const autoKeywords = [
      "SPT",
      "SPD",
      "Concept",
      "Fujairah",
      "Fujera",
      "Dubai",
      "Jafza",
      "WOW",
    ];
    const hiddenGroups = settings.hiddenGroups || [];

    // 1. First, apply MANUAL group settings from the user (Highest Priority)
    Object.entries(settings.siteGroups || {}).forEach(
      ([folder, memberSites]) => {
        if (hiddenGroups.some(g => g.toLowerCase() === folder.toLowerCase())) return;

        // Show manually created folders even if empty or items filtered out by month
        if (!groups[folder]) groups[folder] = [];

        const existingMembers = memberSites.filter((s) => sites.includes(s));
        existingMembers.forEach((s) => {
          if (!allGroupedSites.has(s)) {
            groups[folder].push(s);
            allGroupedSites.add(s);
          }
        });
      },
    );

    // 2. Then, apply Rule-Based Auto categorization for the rest
    sites
      .filter((s) => !allGroupedSites.has(s))
      .forEach((site) => {
        const match = autoKeywords.find((kw) => {
          return site.toLowerCase().includes(kw.toLowerCase());
        });

        if (match) {
          let folderName = match.toUpperCase();
          if (folderName === "FUJERA") folderName = "FUJAIRAH"; // Normalize
          
          let displayFolder = folderName;
          
          // Case-insensitive match for existing manual folders
          const existingFolderKey = Object.keys(groups).find(
            (k) => k.toLowerCase() === match.toLowerCase()
          );
          if (existingFolderKey) {
            displayFolder = existingFolderKey;
          }

          if (hiddenGroups.some(g => g.toLowerCase() === displayFolder.toLowerCase())) return;
          if (hiddenGroups.some(g => g.toLowerCase() === folderName.toLowerCase())) return;

          if (!groups[displayFolder]) groups[displayFolder] = [];
          groups[displayFolder].push(site);
          allGroupedSites.add(site);
        }
      });

    // 3. Final fallback for Uncategorized
    const uncategorized = sites.filter((s) => !allGroupedSites.has(s));
    if (!groups["Uncategorized"]) {
      groups["Uncategorized"] = [];
    }
    uncategorized.forEach((s) => {
      if (!groups["Uncategorized"].includes(s)) {
        groups["Uncategorized"].push(s);
      }
    });

    if (groups["Uncategorized"].length === 0) {
      delete groups["Uncategorized"];
    }

    return groups;
  }, [sites, settings.siteGroups]);

  const recentRecords = React.useMemo(() => {
    return [...filteredAttendance]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [filteredAttendance]);

  const handleSetMonth = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    onMonthChange(d);
  };

  const handlePrevMonth = () => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  const getCompanyStats = (company: string) => {
    const companyWorkers = workers.filter((w) => w.company === company);
    const companyAttendance = filteredAttendance.filter(
      (a) => a.companyName === company,
    );
    return {
      workerCount: companyWorkers.length,
      recordCount: companyAttendance.length,
    };
  };

  const getSiteStats = (site: string) => {
    const siteAttendance = filteredAttendance.filter((a) => a.site && isSameSite(a.site, site));
    const siteWorkers = new Set(
      siteAttendance.flatMap((a) => a.workerIds || []),
    );
    return {
      workerCount: siteWorkers.size,
      recordCount: siteAttendance.length,
    };
  };

  const handleDelete = (type: "company" | "site" | "folder", value: string) => {
    setDeleteModal({ type, value });
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteModal || !onUpdateSettings) return;
    const { type, value } = deleteModal;

    // Delete attendance records for this month
    if (onUpdateAttendanceRecords) {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const newAttendance = attendance.filter((record) => {
        if (!record.date) return true;
        const [y, m] = record.date.split('-');
        const isSameMonth = parseInt(y, 10) === year && (parseInt(m, 10) - 1) === month;

        if (isSameMonth) {
          if (type === "company" && record.companyName === value) return false;
          if (type === "site" && record.site && isSameSite(record.site, value)) return false;
        }
        return true;
      });
      onUpdateAttendanceRecords(newAttendance);
    }

    const newSettings = { ...settings };
    const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;

    if (type === "company") {
      const dbCompanies = { ...(newSettings.hiddenCompaniesByMonth || {}) };
      const currentMonthCompanies = [...(dbCompanies[monthKey] || [])];
      if (!currentMonthCompanies.includes(value)) {
        currentMonthCompanies.push(value);
      }
      dbCompanies[monthKey] = currentMonthCompanies;
      newSettings.hiddenCompaniesByMonth = dbCompanies;
    } else if (type === "site") {
      const dbSites = { ...(newSettings.hiddenSitesByMonth || {}) };
      const currentMonthSites = [...(dbSites[monthKey] || [])];
      if (!currentMonthSites.includes(value)) {
        currentMonthSites.push(value);
      }
      dbSites[monthKey] = currentMonthSites;
      newSettings.hiddenSitesByMonth = dbSites;
      // Also remove from projectSites globally so it doesn't appear in future months
      newSettings.projectSites = (newSettings.projectSites || []).filter(s => s !== value);
      if (newSettings.siteGroups) {
        Object.keys(newSettings.siteGroups).forEach(f => {
          newSettings.siteGroups[f] = newSettings.siteGroups[f].filter(s => s !== value);
        });
      }

      // Determine the full reason string
      let fullReason = '';
      if (deleteReason === 'done') {
        fullReason = 'Done / Job finished';
      } else if (deleteReason === 'not_continued') {
        fullReason = 'This site is not continued';
      } else if (deleteReason === 'duplicate') {
        fullReason = 'Duplicate / error entry';
      } else {
        fullReason = otherReasonText.trim() || 'Other reason';
      }
      logActivity("DELETE", "SITE", `Deleted/hid project site: ${value} for ${monthKey}. Reason: ${fullReason}`);
    } else if (type === "folder") {
      if (newSettings.siteGroups && (newSettings.siteGroups as Record<string, string[]>)[value]) {
        const newSiteGroups = { ...newSettings.siteGroups };
        delete (newSiteGroups as Record<string, string[]>)[value];
        newSettings.siteGroups = newSiteGroups;
      }
      const newHiddenGroups = [...(newSettings.hiddenGroups || [])];
      if (!newHiddenGroups.includes(value)) {
        newHiddenGroups.push(value);
      }
      newSettings.hiddenGroups = newHiddenGroups;
    }
    onUpdateSettings(newSettings);
    setIsModalOpen(false);
  };

  const matchingWorkers = React.useMemo(() => {
    if (!searchTerm) return [];
    return workers
      .filter(
        (w) =>
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.workerNumber.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .slice(0, 10);
  }, [workers, searchTerm]);

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto pb-24">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      {searchTerm && matchingWorkers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10 bg-emerald-500/5 p-16 rounded-[60px] border border-emerald-500/10 shadow-3xl backdrop-blur-md max-w-xl mx-auto text-center"
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic font-serif leading-none">
              Intelligence timeline
            </h2>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.6em] mt-3">
              Operational Record Search
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {matchingWorkers.map((worker, idx) => {
              const workerDates = Array.from(
                new Set(
                  filteredAttendance
                    .filter((a) => a.workerIds?.includes(worker.id))
                    .map((a) => a.date),
                ),
              ).sort();
              const firstSite = filteredAttendance.find((a) =>
                a.workerIds?.includes(worker.id),
              )?.site;
              const firstCompany = worker.company;

              return (
                <motion.div
                  key={`match-${worker.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    if (firstSite) {
                      onSelect("site", firstSite);
                    } else if (firstCompany) {
                      onSelect("company", firstCompany);
                    }
                  }}
                  className="group relative px-6 py-5 bg-white dark:bg-black/40 rounded-3xl border border-emerald-500/10 hover:border-emerald-500 shadow-xl cursor-pointer transition-all hover:bg-emerald-500/5"
                >
                  <div className="flex flex-col items-center gap-3">
                    <h4 className="text-[14px] font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest truncate group-hover:text-emerald-500 transition-colors leading-tight">
                      {worker.name}
                    </h4>
                    {workerDates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {workerDates.map((dateStr) => (
                          <span
                            key={dateStr}
                            className="text-[12px] font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 shadow-sm"
                          >
                            {dateStr.split("-")[2]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}

      {!searchTerm && (
        <div className="flex flex-col items-center">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 w-full">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex-1"
            >
              <div className="flex items-center gap-4 mb-3">
                <h1 className="luxury-heading text-5xl">
                  Intelligence Directory
                </h1>
                {isMonthLocked && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Lock size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">
                      Restricted Access
                    </span>
                    {isAdmin && onUnlockMonth && (
                      <button
                        onClick={onUnlockMonth}
                        className="ml-2 px-3 py-1 bg-amber-500 text-white text-[9px] font-black rounded-lg hover:bg-amber-600 transition-all uppercase tracking-widest shadow-lg shadow-amber-500/20"
                      >
                        Unlock
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-zinc-500 text-sm font-medium tracking-wide max-w-md">
                Access secure operational folders and project site intelligence
                records for the selected period.
              </p>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex flex-wrap items-center gap-4"
            >
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search folders..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    onSearchChange?.(e.target.value);
                  }}
                  className="input-field pl-12 pr-6 py-3 w-64"
                />
              </div>

              <div className="flex items-center bg-zinc-200/50 dark:bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-zinc-300/50 dark:border-white/10 shadow-2xl">
                <button
                  onClick={() => handleSetMonth(-1)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-200",
                    selectedMonth.getMonth() ===
                      (new Date().getMonth() - 1 + 12) % 12 &&
                      selectedMonth.getFullYear() ===
                        (new Date().getMonth() === 0
                          ? new Date().getFullYear() - 1
                          : new Date().getFullYear())
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl scale-105"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
                  )}
                >
                  Last Month
                </button>
                <button
                  onClick={() => handleSetMonth(0)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-200",
                    selectedMonth.getMonth() === new Date().getMonth() &&
                      selectedMonth.getFullYear() === new Date().getFullYear()
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl scale-105"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
                  )}
                >
                  This Month
                </button>
              </div>

              <div className="flex items-center bg-zinc-200/50 dark:bg-white/5 backdrop-blur-xl border border-zinc-300/50 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl">
                <button
                  onClick={handlePrevMonth}
                  className="p-2.5 hover:bg-zinc-300/50 dark:hover:bg-white/10 rounded-xl transition-all duration-200 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="px-8 py-2 min-w-[180px] text-center">
                  <span className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-[0.3em] font-mono">
                    {selectedMonth.toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2.5 hover:bg-zinc-300/50 dark:hover:bg-white/10 rounded-xl transition-all duration-200 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={cn(
                    "flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-200 shadow-2xl whitespace-nowrap",
                    isEditMode
                      ? "bg-red-500 text-white hover:bg-red-600 scale-105"
                      : "bg-zinc-200/50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300/50 dark:hover:bg-white/10 border border-zinc-300/50 dark:border-white/5",
                  )}
                >
                  <Trash2
                    size={16}
                    className={cn(
                      "transition-transform duration-200",
                      isEditMode && "scale-110 rotate-12",
                    )}
                  />
                  {isEditMode ? "Exit Management" : "Manage Sites"}
                </button>
              )}

              {onBootstrap && (
                <button
                  onClick={onBootstrap}
                  disabled={isBootstrapping}
                  className="btn-primary !px-8 !py-3.5 !rounded-2xl relative group/btn overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 opacity-0 group-hover/btn:opacity-20 transition-opacity" />
                  <Database
                    size={16}
                    className={cn(isBootstrapping && "animate-spin")}
                  />
                  {isBootstrapping ? "Recovering..." : "Recover Data"}
                </button>
              )}
            </motion.div>
          </div>

          {/* CORPORATE FOLDERS SECTION */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic font-serif">
                    Corporate Folders
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-5 py-2 bg-zinc-200/50 dark:bg-white/5 rounded-full border border-zinc-300/50 dark:border-white/5 backdrop-blur-xl">
                  <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">
                    {companies.length} Active Units
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-400 transition-all duration-200 shadow-2xl hover:scale-110 active:scale-95"
                    title="Add Company"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="p-20 text-center glass-card border-dashed border-white/10 w-[870px] max-w-full mx-auto">
                <p className="text-sm font-black text-zinc-500 uppercase tracking-[0.4em] italic font-serif">
                  No active intelligence units found.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-[1200px] max-w-full mx-auto">
                {companies.map((company, index) => {
                  const stats = getCompanyStats(company);
                  return (
                    <motion.div
                      key={
                        company
                          ? `company-${company}-${index}`
                          : `company-fallback-${index}`
                      }
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() =>
                        !isEditMode && onSelect("company", company)
                      }
                      className={cn(
                        "group relative p-6 rounded-3xl transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[240px]",
                        "bg-white dark:bg-[#111111] border border-line dark:border-white/10 shadow-lg hover:shadow-2xl",
                        isEditMode
                          ? "cursor-default opacity-80"
                          : "cursor-pointer hover:border-emerald-500/50 hover:-translate-y-2",
                      )}
                    >
                      <Folder className="absolute -right-6 -bottom-6 w-32 h-32 text-zinc-900/[0.02] dark:text-white/[0.02] group-hover:text-emerald-500/[0.05] transition-all duration-500 -rotate-12 group-hover:rotate-0" />

                      <div className="flex items-start justify-between relative z-10">
                        <div className="relative">
                          <div className="p-4 bg-[#F5F5F7] dark:bg-black/40 rounded-2xl border border-line/50 dark:border-white/5 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all duration-300 shadow-sm">
                            <Folder
                              className="w-8 h-8 text-zinc-500 group-hover:text-emerald-500 transition-all duration-300"
                              fill="currentColor"
                              fillOpacity={0.1}
                            />
                          </div>
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-lg">
                            {stats.workerCount}
                          </div>
                        </div>
                        {isEditMode && isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete("company", company);
                            }}
                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                            title="Delete Corporate Folder"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>

                      <div className="relative z-10 mt-auto">
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tight group-hover:text-emerald-500 transition-colors line-clamp-1">
                          {company}
                        </h3>

                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-white/5 relative z-10">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                              {stats.workerCount} Team Members
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className={cn(
              "space-y-8 p-4 rounded-3xl transition-all duration-300 relative",
              isDragOverSection &&
                draggedSite &&
                "bg-blue-500/5 ring-2 ring-dashed ring-blue-500/20",
            )}
            onDragOver={(e: any) => {
              if (draggedSite) {
                e.preventDefault();
                setIsDragOverSection(true);
                setDragOverFolder(null); // Prioritize section over folders if dragging outside
              }
            }}
            onDragLeave={() => setIsDragOverSection(false)}
            onDrop={(e: any) => {
              if (draggedSite) {
                e.preventDefault();
                handleMoveSite(draggedSite, null);
                setDraggedSite(null);
                setIsDragOverSection(false);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic font-serif">
                    Project Sites
                  </h2>
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mt-1">
                    Active Operational Locations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-5 py-2 bg-zinc-200/50 dark:bg-white/5 rounded-full border border-zinc-300/50 dark:border-white/5 backdrop-blur-xl">
                  <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">
                    {sites.length} Active Sites
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setIsSiteModalOpen(true)}
                    className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-400 transition-all duration-200 shadow-2xl hover:scale-110 active:scale-95"
                    title="Add Site"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
            </div>

            {sites.length === 0 ? (
              <div className="p-20 text-center glass-card border-dashed border-white/10">
                <p className="text-sm font-black text-zinc-500 uppercase tracking-[0.4em] italic font-serif">
                  No active project sites found.
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* STANDALONE SITES - OUTSIDE ALL FOLDERS */}
                {categorizedSites["Uncategorized"]?.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-1 h-6 bg-blue-500 rounded-full" />
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">
                        Standalone Sites
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-[1200px] max-w-full mx-auto">
                      {categorizedSites["Uncategorized"].map(
                        (site, siteIdx) => {
                          const stats = getSiteStats(site);
                          const folder = "Uncategorized";
                          return (
                            <motion.div
                              key={`standalone-${site}-${siteIdx}`}
                              draggable={isAdmin && isEditMode}
                              onDragStart={(e: any) => {
                                if (isAdmin && isEditMode) {
                                  setDraggedSite(site);
                                  e.dataTransfer.setData("text/plain", site);
                                  e.dataTransfer.effectAllowed = "move";
                                }
                              }}
                              onDragEnd={() => setDraggedSite(null)}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: siteIdx * 0.05 }}
                              onClick={() =>
                                !isEditMode && onSelect("site", site)
                              }
                              className={cn(
                                "group relative p-6 rounded-3xl transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[240px]",
                                "bg-white dark:bg-[#111111] border border-line dark:border-white/10 shadow-lg hover:shadow-2xl",
                                isEditMode
                                  ? "cursor-grab active:cursor-grabbing opacity-80"
                                  : "cursor-pointer hover:border-blue-500/50 hover:-translate-y-2",
                                draggedSite === site &&
                                  "opacity-20 scale-95 border-dashed border-zinc-400",
                              )}
                            >
                              <MapPin className="absolute -right-6 -bottom-6 w-32 h-32 text-zinc-900/[0.02] dark:text-white/[0.02] group-hover:text-blue-500/[0.05] transition-all duration-500 -rotate-12 group-hover:rotate-0" />

                              <div className="flex items-start justify-between relative z-10">
                                <div className="relative">
                                  <div className="p-4 bg-[#F5F5F7] dark:bg-black/40 rounded-2xl border border-line/50 dark:border-white/5 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-all duration-300 shadow-sm">
                                    <MapPin
                                      className="w-8 h-8 text-zinc-500 group-hover:text-blue-500 transition-all duration-300"
                                      fill="currentColor"
                                      fillOpacity={0.1}
                                    />
                                  </div>
                                </div>
                                {isEditMode && isAdmin && (
                                  <div className="flex flex-col gap-2 relative z-20">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const siteRate = getSiteRate(site, settings.siteRates);
                                        setEditingSite({
                                          name: site,
                                          rate: siteRate,
                                          folder,
                                        });
                                        setIsSiteModalOpen(true);
                                      }}
                                      className="p-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-2xl transition-all"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete("site", site);
                                      }}
                                      className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="relative z-10 mt-auto">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors mb-2 line-clamp-1">
                                  {site}
                                </h3>

                                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                                      {stats.workerCount}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                                      {stats.recordCount}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full ml-auto">
                                    <DollarSign
                                      size={10}
                                      className="text-emerald-500"
                                    />
                                    <span className="text-[10px] font-bold text-emerald-500">
                                      Rate Configured
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* FOLDER SECTION */}
                <div className="space-y-6">
                  {(Object.keys(categorizedSites).filter(
                    (f) => f !== "Uncategorized",
                  ).length > 0 ||
                    isAdmin) && (
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                        <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">
                          Project Folders
                        </h2>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setIsFolderModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-2xl transition-all duration-200 text-[10px] font-black uppercase tracking-widest shadow-sm"
                          title="Create New Folder"
                        >
                          <Plus size={14} />
                          <span>New Folder</span>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-[1200px] max-w-full mx-auto">
                    {Object.keys(categorizedSites)
                      .filter((f) => f !== "Uncategorized")
                      .map((folder, folderIdx) => {
                        const folderSites = categorizedSites[folder];
                        const isExpanded = expandedFolders.has(folder);
                        const toggleFolder = () => {
                          const next = new Set(expandedFolders);
                          if (next.has(folder)) next.delete(folder);
                          else next.add(folder);
                          setExpandedFolders(next);
                        };

                        return (
                          <div
                            key={`folder-${folder}-${folderIdx}`}
                            className="space-y-4"
                          >
                            {/* FOLDER RECTANGLE CARD - 3 PER ROW STYLE */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: folderIdx * 0.05 }}
                              className="group relative"
                              onDragOver={(e: any) => {
                                if (draggedSite) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverFolder(folder);
                                  setIsDragOverSection(false);
                                }
                              }}
                              onDragLeave={() => setDragOverFolder(null)}
                              onDrop={(e: any) => {
                                if (draggedSite) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMoveSite(draggedSite, folder);
                                  setDraggedSite(null);
                                  setDragOverFolder(null);
                                }
                              }}
                            >
                              <div
                                onClick={toggleFolder}
                                className={cn(
                                  "relative p-6 rounded-3xl transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[240px] text-left",
                                  "bg-white dark:bg-[#111111] border border-line dark:border-white/10 shadow-lg hover:shadow-2xl",
                                  "cursor-pointer hover:border-blue-500/50 hover:-translate-y-2",
                                  isExpanded &&
                                    "border-blue-500/50 ring-1 ring-blue-500/10 bg-blue-50/5 dark:bg-blue-500/[0.02] shadow-blue-500/10",
                                  dragOverFolder === folder &&
                                    "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500 shadow-2xl scale-[1.02] -translate-y-2 z-50",
                                )}
                              >
                                {dragOverFolder === folder && (
                                  <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-50 backdrop-blur-sm">
                                    <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-bounce">
                                      Drop to Assign
                                    </div>
                                  </div>
                                )}
                                <Folder
                                  className={cn(
                                    "absolute -right-6 -bottom-6 w-32 h-32 transition-all duration-500 -rotate-12",
                                    "text-zinc-900/[0.02] dark:text-white/[0.02] group-hover:text-blue-500/[0.05]",
                                    isExpanded
                                      ? "rotate-0 scale-110 opacity-10"
                                      : "group-hover:rotate-0",
                                  )}
                                />

                                <div className="flex items-start justify-between relative z-10">
                                  <div className="relative">
                                    <div
                                      className={cn(
                                        "p-4 rounded-2xl border transition-all duration-300 shadow-sm",
                                        isExpanded
                                          ? "bg-blue-500 text-white border-blue-400"
                                          : "bg-[#F5F5F7] dark:bg-black/40 border-line/50 dark:border-white/5 group-hover:bg-blue-500/10 group-hover:border-blue-500/30",
                                      )}
                                    >
                                      {isExpanded ? (
                                        <FolderOpen
                                          className="w-8 h-8 transition-all duration-300"
                                          fill="currentColor"
                                          fillOpacity={0.3}
                                        />
                                      ) : (
                                        <Folder
                                          className="w-8 h-8 text-zinc-500 group-hover:text-blue-500 transition-all duration-300"
                                          fill="currentColor"
                                          fillOpacity={0.1}
                                        />
                                      )}
                                    </div>
                                    {folder !== "Uncategorized" && (
                                      <div
                                        className={cn(
                                          "absolute -top-2 -right-2 text-white text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-lg",
                                          isExpanded
                                            ? "bg-zinc-900 dark:bg-white dark:text-zinc-900"
                                            : "bg-amber-500",
                                        )}
                                      >
                                        #{folderIdx + 1}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isEditMode && isAdmin && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingFolder(folder);
                                            setIsFolderModalOpen(true);
                                          }}
                                          className="p-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-2xl transition-all"
                                          title="Edit Folder Name"
                                        >
                                          <Edit2 size={18} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete("folder", folder);
                                          }}
                                          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                                          title="Delete Project Folder"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </>
                                    )}
                                    <div
                                      className={cn(
                                        "p-2 rounded-2xl transition-all duration-300",
                                        isExpanded
                                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rotate-180"
                                          : "bg-[#F5F5F7] dark:bg-white/5 text-zinc-500",
                                      )}
                                    >
                                      <ChevronDown size={20} />
                                    </div>
                                  </div>
                                </div>

                                <div className="relative z-10 mt-auto">
                                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors mb-2 line-clamp-1">
                                    {folder}
                                  </h3>

                                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-white/5 relative z-10">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                      <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                                        {folderSites.length} Sites
                                      </span>
                                    </div>
                                    {isExpanded && (
                                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                                        Open
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>

                            {/* EXPANDED SITES - VERTICAL LIST */}
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="flex flex-col border-t border-line dark:border-white/5"
                              >
                                {folderSites.map((site, siteIdx) => {
                                  const stats = getSiteStats(site);
                                  return (
                                    <motion.div
                                      key={`site-${folder}-${site}-${siteIdx}`}
                                      draggable={isAdmin && isEditMode}
                                      onDragStart={(e: any) => {
                                        if (isAdmin && isEditMode) {
                                          setDraggedSite(site);
                                          e.dataTransfer.setData(
                                            "text/plain",
                                            site,
                                          );
                                          e.dataTransfer.effectAllowed = "move";
                                        }
                                      }}
                                      onDragEnd={() => setDraggedSite(null)}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: siteIdx * 0.03 }}
                                      onClick={() =>
                                        !isEditMode && onSelect("site", site)
                                      }
                                      className={cn(
                                        "group/site relative p-4 transition-all duration-200 border-b border-line/50 dark:border-white/5 last:border-b-0",
                                        "bg-[#F5F5F7]/30 dark:bg-black/20",
                                        isEditMode
                                          ? "cursor-grab active:cursor-grabbing opacity-80"
                                          : "cursor-pointer hover:bg-white dark:hover:bg-zinc-900",
                                        draggedSite === site &&
                                          "opacity-20 scale-95 border-dashed border-zinc-400",
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                          <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-white/5 text-zinc-400 group-hover/site:text-blue-500 transition-colors">
                                            <MapPin size={14} />
                                          </div>
                                          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase truncate group-hover/site:text-blue-500 transition-colors">
                                            {site}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isEditMode && isAdmin && (
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMoveSite(site, null);
                                                }}
                                                className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
                                                title="Remove from Folder (Move to Standalone)"
                                              >
                                                <FolderMinus size={14} />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const siteRate = getSiteRate(site, settings.siteRates);
                                                  setEditingSite({
                                                    name: site,
                                                    rate: siteRate,
                                                    folder,
                                                  });
                                                  setIsSiteModalOpen(true);
                                                }}
                                                className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Edit Site Details"
                                              >
                                                <Edit2 size={14} />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDelete("site", site);
                                                }}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete Site Permanently"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line/30 dark:border-white/[0.02]">
                                        <div className="flex items-center gap-1">
                                          <Users
                                            size={10}
                                            className="text-zinc-400"
                                          />
                                          <span className="text-[10px] font-bold text-zinc-500">
                                            {stats.workerCount}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Calendar
                                            size={10}
                                            className="text-zinc-400"
                                          />
                                          <span className="text-[10px] font-bold text-zinc-500">
                                            {stats.recordCount}
                                          </span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {isModalOpen && deleteModal?.type === "site" ? (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
              >
                <div
                  onClick={() => setIsModalOpen(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 40 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative w-full max-w-md bg-zinc-950 p-10 overflow-hidden group text-zinc-100 border border-zinc-805 rounded-3xl"
                >
                  <div className="relative flex flex-col items-center space-y-6">
                    <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500">
                      <AlertTriangle size={36} />
                    </div>
                    
                    <div className="space-y-2 text-center">
                      <h2 className="text-2xl font-bold text-white">
                        Delete Project Site
                      </h2>
                      <p className="text-zinc-400 text-sm max-w-[320px] mx-auto leading-relaxed">
                        Why are you deleting <span className="font-extrabold text-white">"{deleteModal.value}"</span>? Please provide a reason:
                      </p>
                    </div>

                    <div className="w-full space-y-3">
                      {[
                        { id: 'done', label: 'Done / Job finished' },
                        { id: 'not_continued', label: 'This site is not continued' },
                        { id: 'duplicate', label: 'Duplicate / Error entry' },
                        { id: 'other', label: 'Other option' }
                      ].map((option) => (
                        <label
                          key={option.id}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                            deleteReason === option.id
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                          )}
                          onClick={() => setDeleteReason(option.id)}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            deleteReason === option.id ? "border-emerald-500" : "border-zinc-650"
                          )}>
                            {deleteReason === option.id && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                          </div>
                          <span className="text-sm font-semibold text-zinc-300">{option.label}</span>
                        </label>
                      ))}

                      {deleteReason === 'other' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 w-full"
                        >
                          <textarea
                            placeholder="Type the specific reason here..."
                            value={otherReasonText}
                            onChange={(e) => setOtherReasonText(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 hover:border-zinc-650 outline-none transition-all placeholder:text-zinc-500 text-white min-h-[80px]"
                          />
                        </motion.div>
                      )}
                    </div>

                    <div className="flex flex-col w-full gap-3 pt-2">
                      <button
                        onClick={confirmDelete}
                        disabled={deleteReason === 'other' && !otherReasonText.trim()}
                        className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-lg active:scale-95"
                      >
                        Confirm Site Deletion
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/5 active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <ConfirmationModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onConfirm={confirmDelete}
              title={`Delete ${deleteModal?.type === "company" ? "Company" : deleteModal?.type === "folder" ? "Project Folder" : "Site"}`}
              message={`Are you sure you want to delete ${deleteModal?.value}? ${deleteModal?.type === "folder" ? "This will dissolve the folder but keep the sites as standalone." : `This will not delete worker records but they will no longer be associated with this ${deleteModal?.type}.`}`}
              confirmLabel="Delete"
              type="danger"
            />
          )}

          <CompanyModal
            isOpen={isCompanyModalOpen}
            onClose={() => setIsCompanyModalOpen(false)}
            onSave={(name) => {
              if (onUpdateSettings) {
                const newSettings = { ...settings };
                const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;

                if (!newSettings.companies?.includes(name)) {
                  newSettings.companies = [
                    ...(newSettings.companies || []),
                    name,
                  ];
                }

                if (
                  newSettings.hiddenCompaniesByMonth?.[monthKey]?.includes(name)
                ) {
                  newSettings.hiddenCompaniesByMonth[monthKey] =
                    newSettings.hiddenCompaniesByMonth[monthKey].filter(
                      (c) => c !== name,
                    );
                }

                onUpdateSettings(newSettings);
              }
            }}
            existingCompanies={(settings.companies || []).filter(c => !(settings.hiddenCompaniesByMonth?.[monthKey] || []).includes(c))}
          />

          <FolderModal
            isOpen={isFolderModalOpen}
            onClose={() => {
              setIsFolderModalOpen(false);
              setEditingFolder(null);
            }}
            onSave={handleCreateFolder}
            folderToEdit={editingFolder || undefined}
          />

          <SiteModal
            isOpen={isSiteModalOpen}
            onClose={() => {
              setIsSiteModalOpen(false);
              setEditingSite(null);
            }}
            onSave={(name, rate, folderName) => {
              if (onUpdateSettings) {
                const newSettings = { ...settings };
                const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;

                // 1. Update Project Sites List
                if (editingSite && editingSite.name !== name) {
                  newSettings.projectSites = (
                    newSettings.projectSites || []
                  ).map((s) => (s === editingSite.name ? name : s));
                } else if (!newSettings.projectSites?.includes(name)) {
                  newSettings.projectSites = [
                    ...(newSettings.projectSites || []),
                    name,
                  ];
                }

                // 2. Clear from hidden list if newly added/edited
                if (
                  newSettings.hiddenSitesByMonth?.[monthKey]?.includes(name)
                ) {
                  newSettings.hiddenSitesByMonth[monthKey] =
                    newSettings.hiddenSitesByMonth[monthKey].filter(
                      (s) => s !== name,
                    );
                }

                // 3. Update Site Rates
                if (!newSettings.siteRates) newSettings.siteRates = {};
                newSettings.siteRates[name] = rate;
                if (editingSite && editingSite.name !== name) {
                  delete newSettings.siteRates[editingSite.name];
                }

                // 4. Update Site Groups (Folders)
                if (!newSettings.siteGroups) newSettings.siteGroups = {};

                // First, remove from any existing group if it was there
                Object.keys(newSettings.siteGroups).forEach((groupName) => {
                  if (newSettings.siteGroups![groupName]) {
                    newSettings.siteGroups![groupName] =
                      newSettings.siteGroups![groupName].filter(
                        (s) => s !== (editingSite ? editingSite.name : name),
                      );
                  }
                });

                // Then, add to the new target folder (if one was selected)
                const targetFolder = folderName || "Uncategorized";
                if (!newSettings.siteGroups[targetFolder])
                  newSettings.siteGroups[targetFolder] = [];
                if (!newSettings.siteGroups[targetFolder].includes(name)) {
                  newSettings.siteGroups[targetFolder].push(name);
                }

                onUpdateSettings(newSettings);
                setEditingSite(null);
              }
            }}
            existingSites={(settings.projectSites || []).filter(s => !(settings.hiddenSitesByMonth?.[monthKey] || []).includes(s))}
            folders={Object.keys(categorizedSites)}
            initialSite={editingSite?.name}
            initialRate={editingSite?.rate}
            initialFolder={editingSite?.folder}
          />
        </div>
      )}
      {searchTerm && matchingWorkers.length === 0 && (
        <div className="p-20 text-center glass-card border-dashed border-white/10 max-w-xl mx-auto">
          <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] italic font-serif">
            No personnel records found matching your query.
          </p>
        </div>
      )}
    </div>
  );
});
