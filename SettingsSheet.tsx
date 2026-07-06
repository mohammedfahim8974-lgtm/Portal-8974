import React, { useState } from "react";
import { SystemSettings, Worker, AttendanceRecord } from "../types";
import {
  Globe,
  Plus,
  Search,
  MapPin,
  Users,
  Clock,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoveHorizontal,
  MoreVertical,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn, isSameSite } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface SiteManagementProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  workers: Worker[];
  attendance: AttendanceRecord[];
  selectedMonth?: Date;
  onMonthChange?: (date: Date) => void;
  onUpdateAttendanceRecords?: (records: AttendanceRecord[]) => void;
}

export const SiteManagement: React.FC<SiteManagementProps> = ({
  settings,
  onUpdateSettings,
  workers,
  attendance,
  selectedMonth,
  onMonthChange,
  onUpdateAttendanceRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [newSite, setNewSite] = useState("");
  const [newSiteMinHours, setNewSiteMinHours] = useState<number | "">("");
  const [newSiteWorkerHours, setNewSiteWorkerHours] = useState<number | "">("");
  const [newSiteVat, setNewSiteVat] = useState<number | "">("");
  const [newSiteVatOption, setNewSiteVatOption] = useState<"with" | "without">("with");
  const [newSiteFolder, setNewSiteFolder] = useState<string>("Uncategorized");
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<{
    oldName: string;
    newName: string;
  } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["Uncategorized"]),
  );
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("done");
  const [otherReasonText, setOtherReasonText] = useState<string>("");
  const [movingSite, setMovingSite] = useState<{
    site: string;
    currentFolder: string;
  } | null>(null);

  const [editingSite, setEditingSite] = useState<{
    index: number;
    value: string;
    group?: string;
    minChargeHours?: number;
    workerStandardHours?: number;
    vatPercentage?: number;
    vatPercentageOption?: "with" | "without";
  } | null>(null);

  const [localMonth, setLocalMonth] = useState(new Date());
  const currentMonth = selectedMonth || localMonth;
  const setCurrentMonth = onMonthChange || setLocalMonth;

  const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

  const handlePrevMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() - 1);
    setCurrentMonth(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const toggleSiteVisibility = (siteName: string) => {
    if (!onUpdateSettings) return;
    const newSettings = { ...settings };
    if (!newSettings.hiddenSitesByMonth) newSettings.hiddenSitesByMonth = {};
    if (!newSettings.hiddenSitesByMonth[monthKey])
      newSettings.hiddenSitesByMonth[monthKey] = [];

    if (newSettings.hiddenSitesByMonth[monthKey].includes(siteName)) {
      newSettings.hiddenSitesByMonth[monthKey] = newSettings.hiddenSitesByMonth[
        monthKey
      ].filter((s) => s !== siteName);
    } else {
      newSettings.hiddenSitesByMonth[monthKey].push(siteName);
    }
    onUpdateSettings(newSettings);
  };

  const siteGroups = settings.siteGroups || {};
  const sites = Array.from(
    new Set([
      ...(settings.projectSites || []),
      ...Object.values(siteGroups).flat(),
    ]),
  );

  // Categorize sites
  const categorizedSites: Record<string, string[]> = {};
  Object.entries(siteGroups).forEach(([folder, memberSites]) => {
    if (folder !== "Uncategorized") {
      categorizedSites[folder] = [...memberSites];
    }
  });

  const allGroupedSites = new Set(Object.values(categorizedSites).flat());
  const uncategorized = sites.filter((s) => !allGroupedSites.has(s));

  const manualUncategorized = (siteGroups["Uncategorized"] || []).filter((s) =>
    sites.includes(s),
  );
  const finalUncategorized = Array.from(
    new Set([...manualUncategorized, ...uncategorized]),
  );

  if (finalUncategorized.length > 0) {
    categorizedSites["Uncategorized"] = finalUncategorized;
  }

  const toggleFolder = (folder: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folder)) next.delete(folder);
    else next.add(folder);
    setExpandedFolders(next);
  };

  const createFolder = () => {
    const name = newFolderName.trim();
    if (name && !siteGroups[name]) {
      onUpdateSettings({
        ...settings,
        siteGroups: {
          ...siteGroups,
          [name]: [],
        },
      });
      setNewFolderName("");
    }
  };

  const removeFolder = (folder: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove the folder "${folder}"? Sites inside will become uncategorized.`,
      )
    ) {
      const nextGroups = { ...siteGroups };
      delete nextGroups[folder];
      onUpdateSettings({
        ...settings,
        siteGroups: nextGroups,
      });
    }
  };

  const moveSiteToFolder = (site: string, targetFolder: string) => {
    const nextGroups = { ...siteGroups };
    const nextSites = [...(settings.projectSites || [])];
    if (!nextSites.includes(site)) {
      nextSites.push(site);
    }

    // Remove from existing if any
    Object.keys(nextGroups).forEach((f) => {
      nextGroups[f] = nextGroups[f].filter((s) => s !== site);
    });

    // Add to target folder (including Uncategorized to bypass auto-matching in main view)
    const folderToAssign = targetFolder || "Uncategorized";
    if (!nextGroups[folderToAssign]) nextGroups[folderToAssign] = [];
    if (!nextGroups[folderToAssign].includes(site)) {
      nextGroups[folderToAssign].push(site);
    }

    onUpdateSettings({
      ...settings,
      projectSites: nextSites,
      siteGroups: nextGroups,
    });
    setMovingSite(null);
  };

  const renameFolder = () => {
    if (renamingFolder && renamingFolder.newName.trim()) {
      const oldName = renamingFolder.oldName;
      const newName = renamingFolder.newName.trim();

      if (oldName === newName) {
        setRenamingFolder(null);
        return;
      }

      const nextGroups = { ...siteGroups };
      nextGroups[newName] = nextGroups[oldName];
      delete nextGroups[oldName];

      onUpdateSettings({
        ...settings,
        siteGroups: nextGroups,
      });
      setRenamingFolder(null);
    }
  };

  const addSite = () => {
    const trimmedName = newSite.trim().toUpperCase();
    if (trimmedName && !sites.some((s) => s.toUpperCase() === trimmedName)) {
      const updatedSites = [...sites, trimmedName];
      const newSiteSettings = { ...(settings.siteSettings || {}) };
      const nextGroups = { ...siteGroups };

      newSiteSettings[trimmedName] = {
        minChargeHours: Number(newSiteMinHours) || 0,
        workerStandardHours: Number(newSiteWorkerHours) || 0,
        vatPercentage:
          newSiteVatOption === "without"
            ? 0
            : newSiteVat !== ""
              ? Number(newSiteVat)
              : undefined,
      };

      // Add to selected folder (including Uncategorized to bypass auto-matching)
      const targetFolder = newSiteFolder || "Uncategorized";
      if (!nextGroups[targetFolder]) nextGroups[targetFolder] = [];
      if (!nextGroups[targetFolder].includes(trimmedName)) {
        nextGroups[targetFolder].push(trimmedName);
      }

      onUpdateSettings({
        ...settings,
        projectSites: updatedSites,
        siteSettings: newSiteSettings,
        siteGroups: nextGroups,
      });

      setNewSite("");
      setNewSiteMinHours("");
      setNewSiteWorkerHours("");
      setNewSiteVat("");
      setNewSiteVatOption("with");
      setNewSiteFolder("Uncategorized");
    }
  };

  const removeSite = (site: string) => {
    setSiteToDelete(site);
    setDeleteReason("done");
    setOtherReasonText("");
  };

  const confirmRemoveSite = () => {
    if (!siteToDelete) return;
    
    let fullReason = "";
    if (deleteReason === "done") {
      fullReason = "Done / Job finished";
    } else if (deleteReason === "not_continued") {
      fullReason = "This site is not continued";
    } else if (deleteReason === "duplicate") {
      fullReason = "Duplicate / error entry";
    } else {
      fullReason = otherReasonText.trim() || "Other reason";
    }

    const updatedSites = sites.filter((s) => s !== siteToDelete);
    const nextGroups = { ...(settings.siteGroups || {}) };
    Object.keys(nextGroups).forEach((f) => {
      nextGroups[f] = nextGroups[f].filter((s) => s !== siteToDelete);
    });

    onUpdateSettings({
      ...settings,
      projectSites: updatedSites,
      siteGroups: nextGroups,
    });
    setSiteToDelete(null);
  };

  const startEditSite = (index: number, value: string) => {
    const siteSettings = settings.siteSettings?.[value];
    setEditingSite({
      index,
      value,
      minChargeHours: siteSettings?.minChargeHours,
      workerStandardHours: siteSettings?.workerStandardHours,
      vatPercentage: siteSettings?.vatPercentage,
      vatPercentageOption: siteSettings?.vatPercentage === 0 ? "without" : "with",
    });
  };

  const saveEditSite = () => {
    if (editingSite && editingSite.value.trim()) {
      const trimmedName = editingSite.value.trim().toUpperCase();
      const updatedSites = [...sites];
      const oldName =
        editingSite.index !== -1
          ? updatedSites[editingSite.index]
          : editingSite.value;

      if (
        updatedSites.some(
          (s, idx) =>
            idx !== editingSite.index && s.toUpperCase() === trimmedName,
        )
      ) {
        alert("A site with this name already exists.");
        return;
      }

      if (editingSite.index === -1) {
        updatedSites.push(trimmedName);
      } else {
        updatedSites[editingSite.index] = trimmedName;
      }

      const newSiteRates = { ...(settings.siteRates || {}) };
      const newSiteSettings = { ...(settings.siteSettings || {}) };
      const nextGroups = { ...(settings.siteGroups || {}) };

      if (trimmedName !== oldName) {
        if (newSiteRates[oldName] !== undefined) {
          newSiteRates[trimmedName] = newSiteRates[oldName];
          delete newSiteRates[oldName];
        }
        if (newSiteSettings[oldName] !== undefined) {
          newSiteSettings[trimmedName] = newSiteSettings[oldName];
          delete newSiteSettings[oldName];
        }
        // Update groups
        Object.keys(nextGroups).forEach((f) => {
          nextGroups[f] = nextGroups[f].map((s) =>
            s === oldName ? trimmedName : s,
          );
        });

        // Propagate site name update to all database attendance records
        if (onUpdateAttendanceRecords) {
          onUpdateAttendanceRecords(
            attendance.map((record) => {
              if (
                record.site &&
                record.site.trim().toLowerCase() ===
                  oldName.trim().toLowerCase()
              ) {
                return { ...record, site: trimmedName };
              }
              return record;
            }),
          );
        }
      }

      newSiteSettings[trimmedName] = {
        minChargeHours: editingSite.minChargeHours || 0,
        workerStandardHours: editingSite.workerStandardHours || 0,
        vatPercentage:
          editingSite.vatPercentageOption === "without"
            ? 0
            : editingSite.vatPercentage !== undefined
              ? editingSite.vatPercentage
              : undefined,
      };

      onUpdateSettings({
        ...settings,
        projectSites: updatedSites,
        siteRates: newSiteRates,
        siteSettings: newSiteSettings,
        siteGroups: nextGroups,
      });

      setEditingSite(null);
    }
  };

  const getSiteStats = (siteName: string) => {
    const assignedWorkers = workers.filter((w) =>
      w.assignedSites?.some((s) => isSameSite(s, siteName)),
    ).length;
    const totalRecords = attendance.filter((a) => {
      if (!a.site || !isSameSite(a.site, siteName)) return false;
      const d = new Date(a.date);
      return (
        d.getMonth() === currentMonth.getMonth() &&
        d.getFullYear() === currentMonth.getFullYear()
      );
    }).length;
    return { assignedWorkers, totalRecords };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#111111] p-8 rounded-3xl border border-line dark:border-white/5 shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Globe size={20} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Site Management
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Organize your project sites into major folders and manage billing
            rules.
          </p>
        </div>

        {/* Date / Month Selector */}
        <div className="flex flex-col gap-1.5 bg-[#F5F5F7] dark:bg-zinc-900/50 p-3 rounded-2xl border border-line dark:border-white/5 min-w-[240px]">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">
            Target Billing Period
          </span>
          <div className="flex items-center justify-between gap-4">
            <button type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl transition-all"
              title="Previous Month"
            >
              <ChevronLeft
                size={16}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              />
            </button>
            <span className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              {currentMonth.toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl transition-all"
              title="Next Month"
            >
              <ChevronRight
                size={16}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#E5E5E5] dark:bg-zinc-900/50 p-2 rounded-2xl border border-line dark:border-white/5 shrink-0">
          <div className="px-4 py-2 text-center border-r border-line dark:border-white/10">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Sites
            </p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {sites.length}
            </p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Folders
            </p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {Object.keys(siteGroups).length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="relative bg-white dark:bg-[#111111] p-6 rounded-3xl border border-line dark:border-white/5 shadow-xl hover:shadow-2xl hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/3 dark:bg-emerald-500/5 blur-[50px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500 animate-pulse" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2 relative z-10">
              <Plus
                size={18}
                className="text-emerald-500 group-hover:animate-bounce"
              />
              Add New Site
            </h2>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  placeholder="e.g. SPT VILLA 102"
                  className="w-full bg-[#F5F5F7] dark:bg-[#1a1a1a] border border-line dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Min Charge (Hours)
                  </label>
                  <input
                    type="number"
                    value={newSiteMinHours}
                    onChange={(e) =>
                      setNewSiteMinHours(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="4"
                    className="w-full bg-[#F5F5F7] dark:bg-[#1a1a1a] border border-line dark:border-white/10 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white outline-none transition-all text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Standard (Hours)
                  </label>
                  <input
                    type="number"
                    value={newSiteWorkerHours}
                    onChange={(e) =>
                      setNewSiteWorkerHours(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="9"
                    className="w-full bg-[#F5F5F7] dark:bg-[#1a1a1a] border border-line dark:border-white/10 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white outline-none transition-all text-center"
                  />
                </div>
              </div>

              <div className="border border-line dark:border-white/10 rounded-2xl p-3.5 bg-[#F5F5F7]/40 dark:bg-zinc-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      VAT Option
                    </label>
                    <p className="text-[10px] text-zinc-400">Apply or exempt UAE VAT</p>
                  </div>
                  <div className="flex bg-[#E5E5EA] dark:bg-zinc-800 rounded-lg p-0.5">
                    <button type="button"
                      onClick={() => {
                        setNewSiteVatOption("with");
                        if (newSiteVat === 0) setNewSiteVat("");
                      }}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all duration-200",
                        newSiteVatOption === "with"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
                      )}
                    >
                      With VAT
                    </button>
                    <button type="button"
                      onClick={() => {
                        setNewSiteVatOption("without");
                        setNewSiteVat(0);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all duration-200",
                        newSiteVatOption === "without"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
                      )}
                    >
                      No VAT
                    </button>
                  </div>
                </div>

                {newSiteVatOption === "with" && (
                  <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-line/50 dark:border-white/5">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      Custom VAT (%) <span className="opacity-50">(Optional)</span>
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={newSiteVat}
                        onChange={(e) =>
                          setNewSiteVat(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder={`Default (${settings.vatPercentage !== undefined ? settings.vatPercentage : 5}%)`}
                        className="w-28 bg-[#F5F5F7] dark:bg-zinc-950 border border-line dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold focus:ring-2 focus:ring-emerald-500 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Assign to Folder
                </label>
                <select
                  value={newSiteFolder}
                  onChange={(e) => setNewSiteFolder(e.target.value)}
                  className="w-full bg-[#F5F5F7] dark:bg-[#1a1a1a] border border-line dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white outline-none transition-all"
                >
                  <option value="Uncategorized">Uncategorized</option>
                  {Object.keys(siteGroups).map((f) => (
                    <option key={`group-opt-${f}`} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <button type="button"
                onClick={addSite}
                disabled={!newSite.trim()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Create Site
              </button>
            </div>
          </div>

          <div className="relative bg-white dark:bg-[#111111] p-6 rounded-3xl border border-line dark:border-white/5 shadow-xl hover:shadow-2xl hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/3 dark:bg-blue-500/5 blur-[50px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500 animate-pulse" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2 relative z-10">
              <Folder size={18} className="text-blue-500" />
              Major Folders
            </h2>
            <div className="space-y-4 relative z-10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className="flex-1 bg-[#F5F5F7] dark:bg-[#1a1a1a] border border-line dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all"
                />
                <button type="button"
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(siteGroups).length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4 italic">
                    No major folders created.
                  </p>
                ) : (
                  Object.keys(siteGroups).map((folder) => (
                    <div
                      key={folder}
                      className="flex flex-col gap-2 p-3 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-white/5"
                    >
                      {renamingFolder?.oldName === folder ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={renamingFolder.newName}
                            onChange={(e) =>
                              setRenamingFolder({
                                ...renamingFolder,
                                newName: e.target.value,
                              })
                            }
                            className="flex-1 bg-white dark:bg-zinc-900 border border-line dark:border-white/10 px-2 py-1 rounded text-xs"
                            autoFocus
                          />
                          <button type="button"
                            onClick={renameFolder}
                            className="text-emerald-500"
                          >
                            <Check size={16} />
                          </button>
                          <button type="button"
                            onClick={() => setRenamingFolder(null)}
                            className="text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Folder
                              className="text-blue-400 shrink-0"
                              size={16}
                            />
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate">
                              {folder}
                            </span>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {siteGroups[folder].length}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button type="button"
                              onClick={() =>
                                setRenamingFolder({
                                  oldName: folder,
                                  newName: folder,
                                })
                              }
                              className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg transition-colors"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button type="button"
                              onClick={() => removeFolder(folder)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-center gap-4 bg-white dark:bg-[#111111] p-4 rounded-2xl border border-line dark:border-white/5 shadow-sm">
              <Search className="text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Search sites across all folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm dark:text-white placeholder:text-zinc-400"
              />
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(categorizedSites)
              .sort((a, b) =>
                a === "Uncategorized"
                  ? 1
                  : b === "Uncategorized"
                    ? -1
                    : a.localeCompare(b),
              )
              .map((folder) => {
                const folderSites = categorizedSites[folder].filter((s) =>
                  s.toLowerCase().includes(searchTerm.toLowerCase()),
                );
                if (folderSites.length === 0) return null;

                const isExpanded = expandedFolders.has(folder);

                return (
                  <div
                    key={folder}
                    className="relative bg-white dark:bg-[#111111] rounded-3xl border border-line dark:border-white/5 shadow-md hover:shadow-xl hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all duration-300 overflow-hidden group/folder"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/3 dark:bg-blue-500/5 blur-[55px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover/folder:scale-120 transition-transform duration-500 animate-pulse" />
                    <button type="button"
                      onClick={() => toggleFolder(folder)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800/30 transition-colors border-b border-zinc-100 dark:border-white/5 relative z-10"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="shrink-0 text-zinc-400">
                          {isExpanded ? (
                            <ChevronDown size={20} />
                          ) : (
                            <ChevronRight size={20} />
                          )}
                        </div>
                        <div className="shrink-0 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500">
                          {isExpanded ? (
                            <FolderOpen size={18} />
                          ) : (
                            <Folder size={18} />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0 pr-4">
                          <h3 className="font-bold text-zinc-900 dark:text-white leading-none truncate">
                            {folder}
                          </h3>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                            {folderSites.length} Projects
                          </p>
                        </div>
                      </div>
                      {folder !== "Uncategorized" && (
                        <div className="flex gap-2 shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 dark:text-zinc-600">
                            Major Folder
                          </span>
                        </div>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {folderSites.map((site) => {
                          const stats = getSiteStats(site);
                          const siteSettings = settings.siteSettings?.[site];
                          const isEditing = editingSite?.value === site;

                          return (
                            <div
                              key={`site-${site}`}
                              className={cn(
                                "group relative bg-[#F5F5F7]/50 dark:bg-zinc-800/30 rounded-2xl border transition-all duration-200",
                                isEditing
                                  ? "border-emerald-500 ring-1 ring-emerald-500 p-4"
                                  : "border-zinc-100 dark:border-white/5 hover:border-line dark:hover:border-white/10 p-4",
                              )}
                            >
                              {isEditing ? (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                      Site Name
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSite.value}
                                      onChange={(e) =>
                                        setEditingSite({
                                          ...editingSite,
                                          value: e.target.value,
                                        })
                                      }
                                      className="w-full bg-white dark:bg-zinc-900 border border-line dark:border-white/10 px-3 py-2 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                        Min Charge
                                      </label>
                                      <input
                                        type="number"
                                        value={editingSite.minChargeHours || ""}
                                        onChange={(e) =>
                                          setEditingSite({
                                            ...editingSite,
                                            minChargeHours: parseFloat(
                                              e.target.value,
                                            ),
                                          })
                                        }
                                        className="w-full bg-white dark:bg-zinc-900 border border-line dark:border-white/10 px-2.5 py-2 rounded-xl text-xs dark:text-white outline-none focus:border-emerald-500 text-center font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                        Standard
                                      </label>
                                      <input
                                        type="number"
                                        value={
                                          editingSite.workerStandardHours || ""
                                        }
                                        onChange={(e) =>
                                          setEditingSite({
                                            ...editingSite,
                                            workerStandardHours: parseFloat(
                                              e.target.value,
                                            ),
                                          })
                                        }
                                        className="w-full bg-white dark:bg-zinc-900 border border-line dark:border-white/10 px-2.5 py-2 rounded-xl text-xs dark:text-white outline-none focus:border-emerald-500 text-center font-bold"
                                      />
                                    </div>
                                  </div>

                                  <div className="border border-line/50 dark:border-white/5 rounded-xl p-2.5 bg-white dark:bg-zinc-900/60 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-black uppercase text-zinc-400">VAT Status</span>
                                      <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                                        <button type="button"
                                          onClick={() => {
                                            setEditingSite({
                                              ...editingSite,
                                              vatPercentageOption: "with",
                                              vatPercentage: editingSite.vatPercentage === 0 ? undefined : editingSite.vatPercentage,
                                            });
                                          }}
                                          className={cn(
                                            "px-2 py-1 text-[9px] font-black uppercase rounded-md transition-all duration-150",
                                            editingSite.vatPercentageOption === "with"
                                              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
                                          )}
                                        >
                                          With VAT
                                        </button>
                                        <button type="button"
                                          onClick={() => {
                                            setEditingSite({
                                              ...editingSite,
                                              vatPercentageOption: "without",
                                              vatPercentage: 0,
                                            });
                                          }}
                                          className={cn(
                                            "px-2 py-1 text-[9px] font-black uppercase rounded-md transition-all duration-150",
                                            editingSite.vatPercentageOption === "without"
                                              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
                                          )}
                                        >
                                          No VAT
                                        </button>
                                      </div>
                                    </div>

                                    {editingSite.vatPercentageOption === "with" && (
                                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-line/30 dark:border-white/5">
                                        <span className="text-[9px] text-zinc-400 font-medium">
                                          Custom VAT %:
                                        </span>
                                        <input
                                          type="number"
                                          step="0.1"
                                          placeholder={`Default (${settings.vatPercentage !== undefined ? settings.vatPercentage : 5}%)`}
                                          value={
                                            editingSite.vatPercentage !== undefined && editingSite.vatPercentage !== 0
                                              ? editingSite.vatPercentage
                                              : ""
                                          }
                                          onChange={(e) =>
                                            setEditingSite({
                                              ...editingSite,
                                              vatPercentage:
                                                e.target.value === ""
                                                  ? undefined
                                                  : parseFloat(e.target.value),
                                            })
                                          }
                                          className="w-20 bg-zinc-50 dark:bg-zinc-950 border border-line dark:border-white/10 rounded px-1.5 py-0.5 text-2xs text-center font-bold focus:ring-1 focus:ring-emerald-500 dark:text-white outline-none"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button type="button"
                                      onClick={saveEditSite}
                                      className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                                    >
                                      Save
                                    </button>
                                    <button type="button"
                                      onClick={() => setEditingSite(null)}
                                      className="px-3 py-1.5 bg-[#E5E5E5] dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-[10px] font-bold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {(() => {
                                    const isSiteHidden =
                                      settings.hiddenSitesByMonth?.[
                                        monthKey
                                      ]?.includes(site);
                                    return (
                                      <>
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                                                isSiteHidden
                                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                  : "bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-white/5",
                                              )}
                                            >
                                              <MapPin size={14} />
                                            </div>
                                            <div className="overflow-hidden">
                                              <h4 className="font-bold text-zinc-900 dark:text-white text-sm truncate max-w-[150px]">
                                                {site}
                                              </h4>
                                              <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                  <div className="flex items-center gap-1">
                                                    <Users
                                                      size={10}
                                                      className="text-zinc-400"
                                                    />
                                                    <span className="text-[10px] font-bold text-zinc-500">
                                                      {stats.assignedWorkers}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Clock
                                                      size={10}
                                                      className="text-zinc-400"
                                                    />
                                                    <span className="text-[10px] font-bold text-zinc-500">
                                                      {stats.totalRecords}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1">
                                                  {isSiteHidden ? (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                      <EyeOff size={8} /> Hidden
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                      <Eye size={8} /> Active
                                                    </span>
                                                  )}
                                                  {siteSettings?.vatPercentage !== undefined && (
                                                    <span
                                                      className={cn(
                                                        "inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                                                        siteSettings.vatPercentage === 0
                                                          ? "text-rose-500 bg-rose-500/10"
                                                          : "text-amber-500 bg-amber-500/10 animate-pulse",
                                                      )}
                                                    >
                                                      {siteSettings.vatPercentage === 0
                                                        ? "No VAT"
                                                        : `VAT ${siteSettings.vatPercentage}%`}
                                                    </span>
                                                  )}
                                                  {siteSettings?.minChargeHours ? (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                      Min: {siteSettings.minChargeHours}h
                                                    </span>
                                                  ) : null}
                                                  {siteSettings?.workerStandardHours ? (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                      Std: {siteSettings.workerStandardHours}h
                                                    </span>
                                                  ) : null}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button type="button"
                                              onClick={() =>
                                                toggleSiteVisibility(site)
                                              }
                                              className={cn(
                                                "p-1.5 rounded-lg transition-colors border",
                                                isSiteHidden
                                                  ? "text-emerald-500 hover:text-white hover:bg-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                                  : "text-zinc-400 hover:text-white hover:bg-rose-500 bg-zinc-500/5 hover:bg-rose-500/10 border-transparent",
                                              )}
                                              title={
                                                isSiteHidden
                                                  ? "Unhide site for this month"
                                                  : "Hide site for this month"
                                              }
                                            >
                                              {isSiteHidden ? (
                                                <Eye size={12} />
                                              ) : (
                                                <EyeOff size={12} />
                                              )}
                                            </button>
                                            <button type="button"
                                              onClick={() =>
                                                setMovingSite({
                                                  site,
                                                  currentFolder: folder,
                                                })
                                              }
                                              className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                              title="Move to folder"
                                            >
                                              <MoveHorizontal size={12} />
                                            </button>
                                            <button type="button"
                                              onClick={() =>
                                                startEditSite(
                                                  sites.indexOf(site),
                                                  site,
                                                )
                                              }
                                              className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                            <button type="button"
                                              onClick={() => removeSite(site)}
                                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                  {movingSite?.site === site && (
                                    <div className="absolute inset-0 z-10 bg-white/95 dark:bg-zinc-900/95 p-3 flex flex-col justify-center rounded-2xl animate-in fade-in duration-200">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2 text-center">
                                        Move to
                                      </p>
                                      <div className="grid grid-cols-2 gap-1.5 overflow-y-auto max-h-24 custom-scrollbar">
                                        <button type="button"
                                          onClick={() =>
                                            moveSiteToFolder(
                                              site,
                                              "Uncategorized",
                                            )
                                          }
                                          className="text-[10px] font-bold p-1 bg-[#E5E5E5] dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 truncate"
                                        >
                                          Uncategorized
                                        </button>
                                        {Object.keys(siteGroups)
                                          .filter((f) => f !== folder)
                                          .map((f) => (
                                            <button type="button"
                                              key={`move-${f}`}
                                              onClick={() =>
                                                moveSiteToFolder(site, f)
                                              }
                                              className="text-[10px] font-bold p-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 truncate"
                                            >
                                              {f}
                                            </button>
                                          ))}
                                      </div>
                                      <button type="button"
                                        onClick={() => setMovingSite(null)}
                                        className="mt-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 underline"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {siteToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          >
            <div
              onClick={() => setSiteToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-zinc-950 p-10 overflow-hidden group text-zinc-100 border border-zinc-800 rounded-3xl"
            >
              <div className="relative flex flex-col items-center space-y-6">
                <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <AlertCircle size={36} />
                </div>

                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold text-white">
                    Delete Project Site
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-[320px] mx-auto leading-relaxed">
                    Why are you deleting{" "}
                    <span className="text-emerald-400 font-bold">
                      {siteToDelete}
                    </span>
                    ?
                  </p>
                </div>

                <div className="w-full space-y-3">
                  {[
                    { id: "done", label: "Done / Job finished" },
                    { id: "not_continued", label: "This site is not continued" },
                    { id: "duplicate", label: "Duplicate / error entry" },
                    { id: "other", label: "Other reason" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setDeleteReason(option.id)}
                      className={cn(
                        "w-full p-4 flex items-center justify-between rounded-2xl border transition-all duration-200",
                        deleteReason === option.id
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200",
                      )}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                          deleteReason === option.id
                            ? "border-emerald-500"
                            : "border-zinc-600",
                        )}
                      >
                        {deleteReason === option.id && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </div>
                    </button>
                  ))}

                  <AnimatePresence>
                    {deleteReason === "other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <input
                          type="text"
                          value={otherReasonText}
                          onChange={(e) => setOtherReasonText(e.target.value)}
                          placeholder="Please specify..."
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mt-2"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-full space-y-3 pt-4">
                  <button
                    onClick={confirmRemoveSite}
                    disabled={deleteReason === "other" && !otherReasonText.trim()}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-lg active:scale-95"
                  >
                    Confirm Site Deletion
                  </button>
                  <button
                    onClick={() => setSiteToDelete(null)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/5 active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};