import React, { useState, useMemo, useCallback, memo } from "react";
import { Worker, AttendanceRecord, SystemSettings } from "../types";
import {
  PlusCircle,
  Trash2,
  Search,
  X,
  Check,
  Building2,
  MapPin,
  ArrowLeft,
  Users,
  Copy,
  Plus,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardPaste,
  CopyPlus,
  Edit2,
  ChevronLeft,
  Settings,
  Database,
  ThumbsUp,
  Undo,
  Redo,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  cn,
  formatCurrency,
  formatDisplayValue,
  getLocalDateString,
  getSiteRate,
  getSiteSettings,
  isSameSite,
} from "../lib/utils";
import { ConfirmationModal } from "./ConfirmationModal";
import { SiteModal } from "./SiteModal";
import { CopyRangeModal } from "./CopyRangeModal";

export const calculateAttendance = (
  hours: number,
  otHours: number, // If provided manually
  multiplier: number, // The 'mp' field or workerCount
  rate: number,
  settings: SystemSettings,
  date?: string,
  siteName?: string,
) => {
  const siteConfig = getSiteSettings(siteName || "", settings.siteSettings);
  const standardHours = siteConfig?.workerStandardHours || 9;

  let normalHours = 0;
  let calculatedOtHours = 0;
  const minCharge = siteName
    ? siteConfig?.minChargeHours ||
      getSiteRate(siteName, settings.siteMinChargeHours) ||
      0
    : 0;

  if (minCharge > 0 && hours > 0 && hours < minCharge) {
    normalHours = minCharge;
    calculatedOtHours = 0;
  } else {
    // Calculate OT hours: if otHours is not manual, it's total hours - standardHours
    calculatedOtHours =
      otHours > 0 ? otHours : Math.max(0, hours - standardHours);

    // Normal hours (up to 9). Total normal hours NEVER exceed 9.
    // If they manually set otHours, they still only get up to 9 normal hours max.
    normalHours =
      otHours > 0
        ? Math.min(Math.max(0, hours - otHours), standardHours)
        : Math.min(hours, standardHours);
  }

  // Determine if it's a Sunday for overtime multiplier
  let otMultiplier = 1.0;
  if (date) {
    const [y, m, d] = date.split("-");
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (dateObj.getDay() === 0) {
      // Sunday
      otMultiplier = 1.5;
    }
  }

  // Calculate Unit Pay (for a single worker)
  const normalPayUnit = normalHours * rate;
  const otPayUnit = calculatedOtHours * rate * otMultiplier;
  const unitTotal = normalPayUnit + otPayUnit;

  // Multiply entirely by the Manpower / workerCount
  const total = unitTotal * multiplier;

  // Calculate VAT based on settings (default 5% UAE VAT, allow per-site override)
  const vatPercentage =
    siteConfig?.vatPercentage !== undefined
      ? siteConfig.vatPercentage
      : settings.vatPercentage !== undefined
        ? settings.vatPercentage
        : 5;
  const vat = total * (vatPercentage / 100);

  return {
    total,
    vat,
    otHours: calculatedOtHours,
    normalHours,
  };
};

interface AttendanceRowProps {
  record: AttendanceRecord;
  settings: SystemSettings;
  isReadOnly: boolean;
  workers: Worker[];
  attendance: AttendanceRecord[];
  selectedCompany?: string;
  expandedRecordId: string | null;
  setExpandedRecordId: (id: string | null) => void;
  dragOverRecordId: string | null;
  handleUpdateRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  handleDeleteRow: (id: string) => void;
  handleCopyWorkers: (id: string) => void;
  handleDuplicateToRange: (id: string, targetDate: string) => void;
  handleDuplicateToNextDate: (id: string) => void;
  handleCopyWorkersToClipboard: (workerIds: string[]) => void;
  handlePasteWorkersFromClipboard: (id: string) => void;
  copiedWorkersCount: number;
  toggleWorker: (recordId: string, workerId: string) => void;
  handleDragOver: (e: React.DragEvent, recordId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, recordId: string) => void;
  onAddWorker?: (initialData?: Partial<Worker>) => void;
  isAllExpanded?: boolean;
  onManualBackup?: () => void;
}

export const AttendanceRow = memo(
  ({
    record,
    settings,
    isReadOnly,
    workers,
    attendance,
    selectedCompany,
    expandedRecordId,
    setExpandedRecordId,
    dragOverRecordId,
    handleUpdateRecord,
    handleDeleteRow,
    handleCopyWorkers,
    handleDuplicateToRange,
    handleDuplicateToNextDate,
    handleCopyWorkersToClipboard,
    handlePasteWorkersFromClipboard,
    copiedWorkersCount,
    toggleWorker,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    onAddWorker,
    isAllExpanded,
    onManualBackup,
  }: AttendanceRowProps) => {
    // Memoized worker quick lookup index to avoid parsing the raw array recursively on every render
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

    const [localHours, setLocalHours] = useState<string | null>(null);
    const [localOT, setLocalOT] = useState<string | null>(null);
    const [localMP, setLocalMP] = useState<string | null>(null);

    const [isUploaded, setIsUploaded] = useState(false);
    const [showDuplicateRangePicker, setShowDuplicateRangePicker] =
      useState(false);
    const [untilDate, setUntilDate] = useState("");

    const [yr, mo, dy] = record.date
      ? record.date.split("-").map(Number)
      : [
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          new Date().getDate(),
        ];
    const lastDay = new Date(yr, mo, 0).getDate();
    const availableDays: number[] = [];
    for (let d = dy + 1; d <= lastDay; d++) {
      availableDays.push(d);
    }

    const getDayLabel = (dayNum: number) => {
      const tempDate = new Date(yr, mo - 1, dayNum);
      const dayName = tempDate.toLocaleDateString("en-US", {
        weekday: "short",
      });
      return `${dayNum} (${dayName})`;
    };

    const hours = Number(record.hours) || 0;
    const otHours = Number(record.otHours) || 0;
    const r = Number(record.rate) || 0;

    const workerIdsCount = Array.from(new Set(record.workerIds || [])).length;
    // If specific workers are assigned, manpower is exactly that count. Otherwise fallback to typed mp or 1.0.
    const m =
      workerIdsCount > 0
        ? workerIdsCount
        : record.mp !== undefined && record.mp !== null
          ? Number(record.mp)
          : 0;

    // Use 9 as standard hours strictly per user requirement ("the old logic")
    const rSiteConfig = getSiteSettings(record.site || "", settings.siteSettings);
    const standardHours = rSiteConfig?.workerStandardHours || 9;
    const calc = calculateAttendance(
      hours,
      otHours,
      m,
      r,
      { ...settings, standardWorkingHours: standardHours },
      record.date,
      record.site,
    );

    const calcOt = calc.otHours;
    const calcNorm = calc.normalHours;
    const calcTotal = calcNorm + calcOt;

    const total = calc.total; // Already fully multiplied by calculateAttendance
    const th = calcTotal * m; // Total Hours worked combined for all manpower
    const rate = r;

    const rowSiteConfig = rSiteConfig;
    const minCharge = record.site
      ? rowSiteConfig?.minChargeHours ||
        getSiteRate(record.site, settings.siteMinChargeHours) ||
        0
      : 0;

    const workerIds = Array.from(new Set(record.workerIds || []));

    const isExpanded = isAllExpanded || expandedRecordId === record.id;

    if (!isExpanded) {
      return (
        <tr
          className={cn(
            "transition-all duration-200 group cursor-pointer",
            "hover:bg-emerald-500/5 bg-[#F5F5F7] dark:bg-zinc-900/50",
            "border-b border-line dark:border-white/5 last:border-0",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setExpandedRecordId(record.id);
          }}
        >
          <td colSpan={isReadOnly ? 10 : 11} className="px-1 py-4 text-center">
            <span className="text-[14px] font-black text-zinc-900 dark:text-zinc-300 uppercase tracking-[0.5em] italic font-serif">
              {new Date(record.date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </td>
        </tr>
      );
    }

    return (
      <tr
        className={cn(
          "relative transition-all duration-200 group bg-white dark:bg-[#050505]",
          "border-b border-black/5 dark:border-white/5 last:border-0",
        )}
      >
        <td
          className={cn(
            "p-0 cursor-pointer transition-all duration-200 border-r border-line dark:border-white/5",
          )}
          colSpan={isReadOnly ? 10 : 11}
          onClick={(e) => {
            e.stopPropagation();
            setExpandedRecordId(null);
          }}
        >
          <div className="w-full">
            <div className="p-4 space-y-4 bg-white dark:bg-black/20">
              {/* Row 1: The First Four - Medium Sized */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Work Date
                  </span>
                  <input
                    type="date"
                    value={record.date}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      handleUpdateRecord(record.id, { date: e.target.value })
                    }
                    disabled={isReadOnly}
                    className="w-full bg-[#E5E5E5] dark:bg-white/5 border border-line rounded-xl px-4 py-2.5 text-base font-black outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span
                    className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1"
                    title="Enter Total Hours (System will split into Normal and OT automatically)"
                  >
                    Total Hrs
                  </span>
                  <input
                    type="text"
                    value={
                      record.status === "absent"
                        ? "A"
                        : (localHours ?? formatDisplayValue(hours))
                    }
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() =>
                      setLocalHours(hours === 0 ? "" : String(hours))
                    }
                    onBlur={() => setLocalHours(null)}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (val === "A") {
                        setLocalHours(val);
                        handleUpdateRecord(record.id, {
                          hours: 0,
                          otHours: 0,
                          status: "absent",
                        });
                      } else if (val === "") {
                        setLocalHours(val);
                        handleUpdateRecord(record.id, {
                          hours: calcOt,
                          otHours: 0,
                          status: "present",
                        });
                      } else if (isNaN(parseFloat(val))) {
                        setLocalHours(val);
                        handleUpdateRecord(record.id, {
                          hours: calcOt,
                          otHours: 0,
                          status: "present",
                        });
                      } else {
                        const rawTotal = parseFloat(val) || 0;
                        setLocalHours(val);
                        handleUpdateRecord(record.id, {
                          hours: rawTotal,
                          otHours: 0,
                          status: "present",
                        });
                      }
                    }}
                    disabled={isReadOnly}
                    className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-2 text-base font-black text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
                  />
                  {minCharge > 0 && hours > 0 && hours < minCharge && (
                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-1 bg-amber-500/10 px-2 py-1 rounded text-center">
                      Min. Charge Applied ({minCharge}h)
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Overtime OT
                  </span>
                  <input
                    type="text"
                    value={localOT ?? formatDisplayValue(calcOt)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() =>
                      setLocalOT(calcOt === 0 ? "" : String(calcOt))
                    }
                    onBlur={() => setLocalOT(null)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalOT(val);
                      if (val === "" || isNaN(parseFloat(val))) {
                        handleUpdateRecord(record.id, {
                          hours: hours,
                          otHours: 0,
                        });
                      } else {
                        const rawOt = parseFloat(val) || 0;
                        const newOt = Math.max(0, rawOt);
                        // If they enter OT, keep Total Hrs correct. If Total Hrs is already huge, stay huge.
                        // But if Total Hrs is less than Normal+OT, bump it up.
                        handleUpdateRecord(record.id, {
                          hours: Math.max(hours, calcNorm + newOt),
                          otHours: newOt,
                        });
                      }
                    }}
                    disabled={isReadOnly}
                    className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2 text-base font-black text-amber-600 dark:text-amber-400 outline-none focus:ring-2 focus:ring-amber-500/20 text-center"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Manpower MP
                  </span>
                  <input
                    type="text"
                    value={localMP ?? formatDisplayValue(m)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => setLocalMP(m === 0 ? "" : String(m))}
                    onBlur={() => setLocalMP(null)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalMP(val);
                      if (val === "" || isNaN(parseFloat(val))) {
                        handleUpdateRecord(record.id, { mp: 0 });
                      } else {
                        handleUpdateRecord(record.id, {
                          mp: parseFloat(val) || 0,
                        });
                      }
                    }}
                    disabled={isReadOnly || workerIdsCount > 0}
                    className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2 text-base font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/20 text-center disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Row 2: Totals - Medium */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Total (TH)
                  </span>
                  <div className="w-full bg-[#F5F5F7] dark:bg-zinc-900 rounded-xl px-4 py-2.5 text-base font-black text-blue-600 dark:text-blue-400 text-center border border-line dark:border-zinc-800">
                    {formatDisplayValue(th)}h
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Rate
                  </span>
                  <div className="w-full bg-[#F5F5F7] dark:bg-zinc-900 rounded-xl px-4 py-2.5 text-base font-black text-zinc-900 dark:text-white text-center border border-line dark:border-zinc-800">
                    {formatCurrency(rate, settings.currency)}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                    Subtotal
                  </span>
                  <div className="w-full bg-[#F5F5F7] dark:bg-zinc-900 rounded-xl px-4 py-2.5 text-base font-black text-zinc-900 dark:text-white text-center border border-line dark:border-zinc-800">
                    {formatCurrency(total, settings.currency)}
                  </div>
                </div>

                <div className="flex flex-col gap-1" id="vat-container">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">
                    VAT (
                    {settings.vatPercentage !== undefined
                      ? settings.vatPercentage
                      : 5}
                    %)
                  </span>
                  <div className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 text-base font-black text-amber-600 dark:text-amber-400 text-center">
                    {formatCurrency(calc.vat, settings.currency)}
                  </div>
                </div>

                <div className="flex flex-col gap-1" id="total-container">
                  <span
                    className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1"
                    id="total-label"
                  >
                    Total (Incl. VAT)
                  </span>
                  <div
                    className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-base font-black text-emerald-600 dark:text-emerald-400 text-center"
                    id="total-value"
                  >
                    {formatCurrency(total + calc.vat, settings.currency)}
                  </div>
                </div>
              </div>

              {/* Row 3: Workflow Tools */}
              {!isReadOnly && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateToNextDate(record.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-transform active:scale-95 shadow-sm"
                  >
                    <CopyPlus size={14} />
                    Duplicate to Next Date
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyWorkersToClipboard(workerIds);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-transform active:scale-95 border border-blue-500/20"
                  >
                    <Clipboard size={14} />
                    Copy Personnel
                  </button>
                  <button
                    disabled={copiedWorkersCount === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePasteWorkersFromClipboard(record.id);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-transform active:scale-95 border",
                      copiedWorkersCount > 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-[#E5E5E5] dark:bg-zinc-800 text-zinc-400 border-line dark:border-white/5 cursor-not-allowed",
                    )}
                  >
                    <ClipboardPaste size={14} />
                    Paste ({copiedWorkersCount})
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyWorkers(record.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F7] dark:bg-white/5 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-transform active:scale-95 border border-line dark:border-white/10"
                  >
                    <Copy size={14} />
                    Copy Previous
                  </button>

                  {showDuplicateRangePicker ? (
                    <div
                      className="flex items-center gap-2 bg-[#F5F5F7] dark:bg-zinc-900 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-serif">
                        Until:
                      </span>
                      {availableDays.length > 0 ? (
                        <>
                          <select
                            value={untilDate}
                            onChange={(e) => setUntilDate(e.target.value)}
                            className="bg-white dark:bg-zinc-950 border border-line dark:border-white/10 px-2 py-1 rounded text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-emerald-500"
                          >
                            <option value="">Select Day</option>
                            {availableDays.map((d) => (
                              <option key={d} value={d}>
                                {getDayLabel(d)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (untilDate) {
                                const formattedDate = `${yr}-${String(mo).padStart(2, "0")}-${String(untilDate).padStart(2, "0")}`;
                                handleDuplicateToRange(
                                  record.id,
                                  formattedDate,
                                );
                                setShowDuplicateRangePicker(false);
                                setUntilDate("");
                              }
                            }}
                            disabled={!untilDate}
                            className="p-1 px-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded text-[10px] font-bold uppercase transition-colors"
                            title="Confirm Duplication"
                          >
                            Confirm
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-bold italic">
                          End of Month reached
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDuplicateRangePicker(false);
                          setUntilDate("");
                        }}
                        className="p-1 px-2 bg-[#E5E5E5] dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded text-[10px] font-bold uppercase transition-colors"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDuplicateRangePicker(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F7] dark:bg-white/5 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-transform active:scale-95 border border-line dark:border-white/10"
                    >
                      <Copy size={14} />
                      Duplicate to Range
                    </button>
                  )}
                </div>
              )}

              {/* Row 4: Personnel - Medium tags */}
              <div className="space-y-3 pt-3 border-t border-line">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Personnel
                  </span>
                  <div className="flex gap-4">
                    {!isReadOnly && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsUploaded(!isUploaded);
                          }}
                          className={cn(
                            "p-1 rounded-full",
                            isUploaded
                              ? "text-emerald-500 bg-emerald-500/5"
                              : "text-blue-500 hover:text-blue-600 bg-blue-500/5",
                          )}
                          title={isUploaded ? "Uploaded" : "Upload record"}
                        >
                          {isUploaded ? (
                            <ThumbsUp size={16} />
                          ) : (
                            <Database size={16} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRow(record.id);
                          }}
                          className="text-red-500 hover:text-red-600 p-1 bg-red-500/5 rounded-full"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRecordId(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-transform active:scale-95"
                      >
                        <Check size={14} />
                        OK
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRecordId(null);
                        }}
                        className="text-zinc-900 dark:text-white p-1 bg-[#E5E5E5] dark:bg-zinc-800 rounded-full"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-full min-h-[50px] bg-[#F5F5F7] dark:bg-black/20 border border-line rounded-xl px-4 py-3 cursor-pointer transition-all flex flex-wrap gap-2 items-center",
                    dragOverRecordId === record.id &&
                      "ring-2 ring-emerald-500/30 border-emerald-500/50 bg-emerald-500/5",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onDragOver={(e) => handleDragOver(e, record.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, record.id)}
                >
                  {workerIds.length === 0 ? (
                    <span className="text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                      Drag workers here from list
                    </span>
                  ) : (
                    workerIds.map((id, index) => {
                      const w = workersMap.get(id);
                      return w ? (
                        <span
                          key={`worker-tag-${record.id}-${id}-${index}`}
                          className="inline-flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-zinc-800 text-base font-black uppercase rounded-xl border border-line dark:border-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                        >
                          <span className="truncate max-w-[250px]">
                            {w.name}
                          </span>
                          {!isReadOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWorker(record.id, id);
                              }}
                              className="text-zinc-400 hover:text-red-500"
                            >
                              <X size={20} />
                            </button>
                          )}
                        </span>
                      ) : null;
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  },
);

AttendanceRow.displayName = "AttendanceRow";

interface AttendanceSheetProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  settings: SystemSettings;
  userRole: string;
  onUpdateAttendanceRecords: (records: AttendanceRecord[]) => void;
  onAddAttendance?: (record: AttendanceRecord) => void;
  onDeleteAttendance?: (id: string) => void;
  onAddWorker: (initialData?: Partial<Worker>) => void;
  selectedCompany?: string;
  selectedSite?: string;
  onBack?: () => void;
  onUpdateSettings?: (settings: SystemSettings) => void;
  selectedMonth: Date;
  onManualBackup?: () => void;
  isMonthLocked?: boolean;
  onUnlockMonth?: () => void;
  initialSearchTerm?: string;
}

const WorkerStatusItem = memo(
  ({
    worker,
    isActive,
    isExpandedRecordActive,
    isReadOnly,
    expandedRecordId,
    toggleWorker,
    handleDragStart,
    currentSelectionName,
  }: {
    worker: any;
    isActive: boolean;
    isExpandedRecordActive: boolean;
    isReadOnly: boolean;
    expandedRecordId: string | null;
    toggleWorker: (recordId: string, workerId: string) => void;
    handleDragStart: (e: React.DragEvent, workerId: string) => void;
    currentSelectionName?: string;
  }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      draggable={!isReadOnly}
      onClick={() => {
        if (!isReadOnly && expandedRecordId) {
          toggleWorker(expandedRecordId, worker.id);
        }
      }}
      onDragStart={(e) =>
        handleDragStart(e as unknown as React.DragEvent, worker.id)
      }
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl transition-all border",
        expandedRecordId && !isReadOnly
          ? "cursor-pointer"
          : "cursor-grab active:cursor-grabbing",
        isExpandedRecordActive
          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 shadow-sm"
          : isActive
            ? "bg-[#F5F5F7] dark:bg-zinc-800/50 border-line dark:border-zinc-700"
            : "bg-white dark:bg-[#0a0a0a] border-line dark:border-white/10 hover:border-zinc-300 dark:hover:border-zinc-600",
      )}
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-colors",
            isExpandedRecordActive
              ? "bg-emerald-500 text-white"
              : isActive
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-[#E5E5E5] dark:bg-zinc-800 text-zinc-500",
          )}
        >
          {worker.name.charAt(0)}
        </div>
        {isActive && (
          <motion.div
            layoutId={`status-${worker.id}`}
            className={cn(
              "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900",
              isExpandedRecordActive ? "bg-emerald-400" : "bg-emerald-500",
            )}
          />
        )}
      </div>

      <div className="flex flex-col min-w-0 flex-1 py-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm truncate",
              isExpandedRecordActive
                ? "text-emerald-900 dark:text-emerald-100 font-bold"
                : isActive
                  ? "text-zinc-900 dark:text-white font-medium"
                  : "text-zinc-700 dark:text-zinc-300",
            )}
          >
            {worker.name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            #{worker.workerNumber}
          </span>
          {worker.role && (
            <>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-[6px] font-black text-zinc-400/50 truncate uppercase mt-0.5">
                Secure
              </span>
            </>
          )}
        </div>
      </div>

      {expandedRecordId && !isReadOnly && (
        <div
          className={cn(
            "transition-opacity flex-shrink-0",
            isExpandedRecordActive
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          {isExpandedRecordActive ? (
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
              <X size={16} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
              <Plus size={16} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  ),
);

WorkerStatusItem.displayName = "WorkerStatusItem";

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  workers,
  attendance,
  settings,
  userRole,
  onUpdateAttendanceRecords,
  onAddAttendance,
  onDeleteAttendance,
  onAddWorker,
  selectedCompany,
  selectedSite,
  onBack,
  onUpdateSettings,
  selectedMonth,
  onManualBackup,
  isMonthLocked = false,
  onUnlockMonth,
  initialSearchTerm = "",
}) => {
  const isReadOnly =
    userRole === "Viewer" ||
    (isMonthLocked && userRole !== "Admin") ||
    isMonthLocked;
  const isAdmin = userRole === "Admin";

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [workerSearchTerm, setWorkerSearchTerm] = useState("");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const showSidebar = !!expandedRecordId;
  const [dragOverRecordId, setDragOverRecordId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [isCopyRangeModalOpen, setIsCopyRangeModalOpen] = useState(false);
  const [copiedWorkers, setCopiedWorkers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("copiedWorkers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleCopyWorkersToClipboard = useCallback((workerIds: string[]) => {
    setCopiedWorkers(workerIds);
    try {
      localStorage.setItem("copiedWorkers", JSON.stringify(workerIds));
    } catch (e) {
      console.warn("Failed to save copied workers to localStorage", e);
    }
  }, []);

  const handlePasteWorkersFromClipboard = useCallback(
    (recordId: string) => {
      if (
        isReadOnly ||
        !onUpdateAttendanceRecords ||
        copiedWorkers.length === 0
      )
        return;

      const targetRecord = attendance.find((r) => r.id === recordId);
      if (!targetRecord) return;

      onUpdateAttendanceRecords(
        attendance.map((record) => {
          // Remove pasted workers from other records on the same date
          if (record.id !== recordId && record.date === targetRecord.date) {
            if (
              record.workerIds &&
              record.workerIds.some((id) => copiedWorkers.includes(id))
            ) {
              const newWorkerIds = record.workerIds.filter(
                (id) => !copiedWorkers.includes(id),
              );
              const h = Number(record.hours) || 0;
              const ot =
                record.otHours !== undefined
                  ? Number(record.otHours)
                  : Math.max(0, h - 9);
              const r = Number(record.rate) || 0;
              const workerCount = Math.max(1, newWorkerIds.length);
              const m =
                workerCount > 1 || newWorkerIds.length > 0
                  ? workerCount
                  : record.mp !== undefined && record.mp !== null
                    ? Number(record.mp)
                    : 0;

              const calc = calculateAttendance(
                h,
                ot,
                m,
                r,
                settings,
                record.date,
                record.site,
              );

              return {
                ...record,
                workerIds: newWorkerIds,
                mp: workerCount,
                otHours: calc.otHours,
                total: calc.total,
                vat: calc.vat,
              };
            }
          }

          // Add to target record
          if (record.id === recordId) {
            const currentWorkerIds = record.workerIds || [];
            const newWorkerIds = Array.from(
              new Set([...currentWorkerIds, ...copiedWorkers]),
            );

            const h = Number(record.hours) || 0;
            const ot =
              record.otHours !== undefined
                ? Number(record.otHours)
                : Math.max(0, h - 9);
            const r = Number(record.rate) || 0;
            const workerCount = Math.max(1, newWorkerIds.length);
            const m =
              workerCount > 1 || newWorkerIds.length > 0
                ? workerCount
                : record.mp !== undefined && record.mp !== null
                  ? Number(record.mp)
                  : 0;

            const calc = calculateAttendance(
              h,
              ot,
              m,
              r,
              settings,
              record.date,
              record.site,
            );

            return {
              ...record,
              workerIds: newWorkerIds,
              mp: workerCount,
              total: calc.total,
              vat: calc.vat,
              otHours: calc.otHours,
            };
          }
          return record;
        }),
      );
    },
    [
      isReadOnly,
      onUpdateAttendanceRecords,
      attendance,
      copiedWorkers,
      settings,
    ],
  );

  const selection = {
    type: selectedCompany ? "company" : "site",
    name: selectedCompany || selectedSite || "",
  };

  const handleDeleteCurrent = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!onUpdateSettings || !onBack) return;
    const value = selectedCompany || selectedSite;
    const type = selectedCompany ? "company" : "site";

    // Delete attendance records for this month
    const newAttendance = attendance.filter((record) => {
      let isSameMonth = false;
      if (record.date) {
        const [y, m, d] = record.date.split("-");
        isSameMonth =
          parseInt(m) - 1 === selectedMonth.getMonth() &&
          parseInt(y) === selectedMonth.getFullYear();
      }

      if (isSameMonth) {
        if (type === "company" && record.companyName === value) return false;
        if (
          type === "site" &&
          record.site &&
          value &&
          isSameSite(record.site, value)
        )
          return false;
      }
      return true;
    });

    onUpdateAttendanceRecords(newAttendance);

    // Hide it for this month
    const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
    const newSettings = { ...settings };

    if (type === "company") {
      if (!newSettings.hiddenCompaniesByMonth)
        newSettings.hiddenCompaniesByMonth = {};
      if (!newSettings.hiddenCompaniesByMonth[monthKey])
        newSettings.hiddenCompaniesByMonth[monthKey] = [];
      if (!newSettings.hiddenCompaniesByMonth[monthKey].includes(value || "")) {
        newSettings.hiddenCompaniesByMonth[monthKey].push(value || "");
      }
    } else {
      if (!newSettings.hiddenSitesByMonth) newSettings.hiddenSitesByMonth = {};
      if (!newSettings.hiddenSitesByMonth[monthKey])
        newSettings.hiddenSitesByMonth[monthKey] = [];
      if (!newSettings.hiddenSitesByMonth[monthKey].includes(value || "")) {
        newSettings.hiddenSitesByMonth[monthKey].push(value || "");
      }
    }

    onUpdateSettings(newSettings);
    setShowDeleteModal(false);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  const handleSaveSite = (
    newName: string,
    newRate: number,
    folderName?: string,
  ) => {
    if (!onUpdateSettings || !selectedSite) return;

    const newSettings = { ...settings };

    // Update site name in projectSites array
    if (newSettings.projectSites) {
      newSettings.projectSites = newSettings.projectSites.map((s) =>
        s === selectedSite ? newName : s,
      );
    }

    // Update site rate
    if (!newSettings.siteRates) {
      newSettings.siteRates = {};
    }

    // If name changed, move the rate to the new name and delete the old one
    if (newName !== selectedSite) {
      newSettings.siteRates[newName] = newRate;
      delete newSettings.siteRates[selectedSite];
    } else {
      newSettings.siteRates[selectedSite] = newRate;
    }

    // Update site groups (folders)
    if (!newSettings.siteGroups) newSettings.siteGroups = {};

    // Remove from any existing group
    Object.keys(newSettings.siteGroups).forEach((group) => {
      if (newSettings.siteGroups![group]) {
        newSettings.siteGroups![group] = newSettings.siteGroups![group].filter(
          (s) => s !== selectedSite,
        );
      }
    });

    // Add to the new group
    const targetFolder = folderName || "Uncategorized";
    if (!newSettings.siteGroups[targetFolder])
      newSettings.siteGroups[targetFolder] = [];
    if (!newSettings.siteGroups[targetFolder].includes(newName)) {
      newSettings.siteGroups[targetFolder].push(newName);
    }

    // Update all attendance records for this site with the new rate
    if (onUpdateAttendanceRecords) {
      onUpdateAttendanceRecords(
        attendance.map((record) => {
          if (
            record.site &&
            selectedSite &&
            isSameSite(record.site, selectedSite)
          ) {
            const updatedRecord = { ...record, site: newName, rate: newRate };
            // Recalculate total
            const th = (updatedRecord.hours || 0) * (updatedRecord.mp || 0);
            updatedRecord.total = th * newRate;
            return updatedRecord;
          }
          return record;
        }),
      );
    }

    onUpdateSettings(newSettings);
    setShowEditSiteModal(false);

    // If name changed, we should probably go back or update selection
    if (newName !== selectedSite && onBack) {
      onBack();
    }
  };

  const handleAddRow = useCallback(() => {
    if (isReadOnly) return;

    const h = 0;
    const ot = 0;

    // Default to the first day of the selected month if we are viewing a past/future month
    let dateStr = getLocalDateString();
    const today = new Date();
    if (
      selectedMonth.getFullYear() !== today.getFullYear() ||
      selectedMonth.getMonth() !== today.getMonth()
    ) {
      dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const m = 0;

    const r = selectedSite ? getSiteRate(selectedSite, settings.siteRates) : 0;

    const workerCount = 1;
    const workerMp = 0;
    const normalHours = 0;
    const thValue = 0;
    const totalValue = 0;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      date: dateStr,
      hours: h,
      otHours: ot,
      mp: m,
      rate: r,
      total: totalValue,
      companyName: selectedCompany || "",
      site: selectedSite || "",
      workerIds: [],
    };

    if (onAddAttendance) {
      onAddAttendance(newRecord);
    } else if (onUpdateAttendanceRecords) {
      onUpdateAttendanceRecords([newRecord, ...attendance]);
    }
  }, [
    isReadOnly,
    onAddAttendance,
    onUpdateAttendanceRecords,
    9,
    selectedCompany,
    selectedSite,
    attendance,
  ]);

  const handleDeleteRow = useCallback(
    (id: string) => {
      if (isReadOnly) return;
      if (onDeleteAttendance) {
        onDeleteAttendance(id);
      } else if (onUpdateAttendanceRecords) {
        onUpdateAttendanceRecords(attendance.filter((r) => r.id !== id));
      }
    },
    [isReadOnly, onDeleteAttendance, onUpdateAttendanceRecords, attendance],
  );

  // (Duplicate definition removed)
  /*
const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  workers,
  attendance,
  settings,
  userRole,
  onUpdateAttendanceRecords,
  onAddAttendance,
  onDeleteAttendance,
  onAddWorker,
  selectedCompany,
  selectedSite,
  onBack,
  onUpdateSettings,
  selectedMonth,
  onManualBackup
}) => {
*/
  const calculateAttendanceCallback = useCallback(
    (h: number, ot: number, m: number, r: number, s: SystemSettings) => {
      return calculateAttendance(h, ot, m, r, s);
    },
    [],
  );

  const handleUpdateRecord = useCallback(
    (id: string, updates: Partial<AttendanceRecord>) => {
      if (isReadOnly || !onUpdateAttendanceRecords) return;

      onUpdateAttendanceRecords(
        attendance.map((record) => {
          if (record.id === id) {
            let updatedRecord = { ...record, ...updates };

            const h = Number(updatedRecord.hours) || 0;
            const ot = Number(updatedRecord.otHours) || 0;
            const r = Number(updatedRecord.rate) || 0;
            const workerCount = Math.max(
              1,
              Array.from(new Set(updatedRecord.workerIds || [])).length,
            );
            const m =
              workerCount > 1 || (updatedRecord.workerIds?.length || 0) > 0
                ? workerCount
                : updatedRecord.mp !== undefined && updatedRecord.mp !== null
                  ? Number(updatedRecord.mp)
                  : 0;

            // Apply calculation for the whole aggregate (workerCount)
            const calc = calculateAttendance(
              h,
              ot,
              m,
              r,
              settings,
              updatedRecord.date,
              updatedRecord.site,
            );

            updatedRecord.total = calc.total;
            updatedRecord.vat = calc.vat;

            updatedRecord.otHours = calc.otHours;

            return updatedRecord;
          }
          return record;
        }),
      );
    },
    [isReadOnly, onUpdateAttendanceRecords, attendance, settings],
  );

  const toggleWorker = useCallback(
    (recordId: string, workerId: string) => {
      if (isReadOnly || !onUpdateAttendanceRecords) return;

      const targetRecord = attendance.find((r) => r.id === recordId);
      if (!targetRecord) return;

      const isAdding = !(targetRecord.workerIds || []).includes(workerId);

      onUpdateAttendanceRecords(
        attendance.map((record) => {
          // If we are ADDING the worker, remove them from all OTHER records on the same date
          if (
            isAdding &&
            record.id !== recordId &&
            record.date === targetRecord.date
          ) {
            if (record.workerIds && record.workerIds.includes(workerId)) {
              const newWorkerIds = record.workerIds.filter(
                (id) => id !== workerId,
              );
              const h = Number(record.hours) || 0;
              const ot =
                record.otHours !== undefined
                  ? Number(record.otHours)
                  : Math.max(0, h - 9);
              const workerCount = Math.max(1, newWorkerIds.length);
              const m =
                workerCount > 1 || newWorkerIds.length > 0
                  ? workerCount
                  : record.mp !== undefined && record.mp !== null
                    ? Number(record.mp)
                    : 0;
              const r = Number(record.rate) || 0;

              const calc = calculateAttendance(
                h,
                ot,
                m,
                r,
                settings,
                record.date,
                record.site,
              );

              return {
                ...record,
                workerIds: newWorkerIds,
                mp: workerCount,
                otHours: calc.otHours,
                total: calc.total,
                vat: calc.vat,
              };
            }
          }

          // Handle the target record
          if (record.id === recordId) {
            const workerIds = record.workerIds || [];
            const newWorkerIds = workerIds.includes(workerId)
              ? workerIds.filter((id) => id !== workerId)
              : [...workerIds, workerId];

            const h = Number(record.hours) || 0;
            const ot = Number(record.otHours) || 0;
            const r = Number(record.rate) || 0;
            const workerCount = Math.max(1, newWorkerIds.length);
            const m =
              workerCount > 1 || newWorkerIds.length > 0
                ? workerCount
                : record.mp !== undefined && record.mp !== null
                  ? Number(record.mp)
                  : 0;

            const calc = calculateAttendance(
              h,
              ot,
              m,
              r,
              settings,
              record.date,
              record.site,
            );

            return {
              ...record,
              workerIds: newWorkerIds,
              total: calc.total,
              vat: calc.vat,
              otHours: calc.otHours,
            };
          }
          return record;
        }),
      );
    },
    [isReadOnly, onUpdateAttendanceRecords, attendance, settings],
  );

  const handleDuplicateToNextDate = useCallback(
    (recordId: string) => {
      if (isReadOnly || !onUpdateAttendanceRecords) return;

      const recordToDuplicate = attendance.find((r) => r.id === recordId);
      if (!recordToDuplicate) return;

      // Parse the date string manually to avoid timezone shifts
      const [year, month, day] = recordToDuplicate.date.split("-").map(Number);
      const nextDate = new Date(year, month - 1, day + 1);

      // Format back to YYYY-MM-DD
      const nextDateString = [
        nextDate.getFullYear(),
        String(nextDate.getMonth() + 1).padStart(2, "0"),
        String(nextDate.getDate()).padStart(2, "0"),
      ].join("-");

      const newRecord: AttendanceRecord = {
        ...recordToDuplicate,
        id: crypto.randomUUID(),
        date: nextDateString,
      };

      onUpdateAttendanceRecords([newRecord, ...attendance]);
    },
    [isReadOnly, onUpdateAttendanceRecords, attendance],
  );

  const handleCopyDateRange = useCallback(
    (
      sourceStart: string,
      sourceEnd: string,
      destStart: string,
      destEnd: string,
    ) => {
      if (isReadOnly || !onUpdateAttendanceRecords) return;

      const generateDates = (startStr: string, endStr: string): string[] => {
        const dates: string[] = [];
        const [sy, sm, sd] = startStr.split("-").map(Number);
        const [ey, em, ed] = endStr.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);

        const current = new Date(start);
        let limit = 0;
        while (current <= end && limit < 366) {
          limit++;
          const dateStr = [
            current.getFullYear(),
            String(current.getMonth() + 1).padStart(2, "0"),
            String(current.getDate()).padStart(2, "0"),
          ].join("-");
          dates.push(dateStr);
          current.setDate(current.getDate() + 1);
        }
        return dates;
      };

      const sourceDates = generateDates(sourceStart, sourceEnd);
      const destDates = generateDates(destStart, destEnd);

      if (sourceDates.length === 0 || destDates.length === 0) {
        alert("Invalid date ranges.");
        return;
      }

      const sourceRecords = attendance
        .filter((r) => {
          if (!sourceDates.includes(r.date)) return false;
          if (selectedSite && r.site && !isSameSite(r.site, selectedSite))
            return false;
          if (selectedCompany && r.companyName !== selectedCompany)
            return false;
          return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      if (sourceRecords.length === 0) {
        alert("No attendance records found in the source range to copy from.");
        return;
      }

      const targetRecords: AttendanceRecord[] = [];

      destDates.forEach((targetDate, destIdx) => {
        const sourceRecord = sourceRecords[destIdx % sourceRecords.length];

        const h = Number(sourceRecord.hours) || 0;
        const ot = Number(sourceRecord.otHours) || 0;
        const m =
          sourceRecord.workerIds?.length || Number(sourceRecord.mp) || 0;
        const r = Number(sourceRecord.rate) || 0;

        const calc = calculateAttendance(
          h,
          ot,
          m,
          r,
          settings,
          targetDate,
          sourceRecord.site,
        );

        targetRecords.push({
          ...sourceRecord,
          id: crypto.randomUUID(),
          date: targetDate,
          total: calc.total,
          vat: calc.vat,
          otHours: calc.otHours,
        });
      });

      const destDatesSet = new Set(destDates);
      const filteredAttendance = attendance.filter((r) => {
        if (destDatesSet.has(r.date)) {
          if (selectedSite && r.site && isSameSite(r.site, selectedSite))
            return false;
          if (selectedCompany && r.companyName === selectedCompany)
            return false;
        }
        return true;
      });

      onUpdateAttendanceRecords([...targetRecords, ...filteredAttendance]);
    },
    [
      isReadOnly,
      onUpdateAttendanceRecords,
      attendance,
      selectedSite,
      selectedCompany,
      settings,
    ],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, workerId: string) => {
      e.dataTransfer.setData("workerId", workerId);
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, recordId: string) => {
      e.preventDefault();
      if (isReadOnly) return;
      setDragOverRecordId(recordId);
    },
    [isReadOnly],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverRecordId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, recordId: string) => {
      e.preventDefault();
      setDragOverRecordId(null);
      if (isReadOnly || !onUpdateAttendanceRecords) return;

      const workerId = e.dataTransfer.getData("workerId");
      if (!workerId) return;

      const targetRecord = attendance.find((r) => r.id === recordId);
      if (!targetRecord) return;

      onUpdateAttendanceRecords(
        attendance.map((record) => {
          // Remove worker from other records on same date
          if (record.id !== recordId && record.date === targetRecord.date) {
            if (record.workerIds && record.workerIds.includes(workerId)) {
              const newWorkerIds = record.workerIds.filter(
                (id) => id !== workerId,
              );
              const h = Number(record.hours) || 0;
              const ot =
                record.otHours !== undefined
                  ? Number(record.otHours)
                  : Math.max(0, h - 9);
              const r = Number(record.rate) || 0;

              const workerCount = Math.max(1, newWorkerIds.length);
              const m =
                workerCount > 1 || newWorkerIds.length > 0
                  ? workerCount
                  : record.mp !== undefined && record.mp !== null
                    ? Number(record.mp)
                    : 0;

              const calc = calculateAttendance(
                h,
                ot,
                m,
                r,
                settings,
                record.date,
                record.site,
              );

              return {
                ...record,
                workerIds: newWorkerIds,
                mp: workerCount,
                otHours: calc.otHours,
                total: calc.total,
                vat: calc.vat,
              };
            }
          }

          // Add to target record
          if (record.id === recordId) {
            const workerIds = record.workerIds || [];
            if (workerIds.includes(workerId)) return record;
            const newWorkerIds = [...workerIds, workerId];

            const h = Number(record.hours) || 0;
            const ot = Number(record.otHours) || 0;
            const r = Number(record.rate) || 0;
            const workerCount = Math.max(1, newWorkerIds.length);
            const m =
              workerCount > 1 || newWorkerIds.length > 0
                ? workerCount
                : record.mp !== undefined && record.mp !== null
                  ? Number(record.mp)
                  : 0;

            const calc = calculateAttendance(
              h,
              ot,
              m,
              r,
              settings,
              record.date,
              record.site,
            );

            return {
              ...record,
              workerIds: newWorkerIds,
              total: calc.total,
              vat: calc.vat,
              otHours: calc.otHours,
            };
          }
          return record;
        }),
      );
    },
    [isReadOnly, onUpdateAttendanceRecords, attendance],
  );

  const filteredRecords = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    let records = attendance.filter((r) => {
      if (!r.date) return false;
      const [y, m] = r.date.split("-");
      return parseInt(y, 10) === year && parseInt(m, 10) === month;
    });

    // Sort records: expanded record first, then chronologically (1st, 2nd, 3rd, etc.)
    records.sort((a, b) => {
      if (a.id === expandedRecordId) return -1;
      if (b.id === expandedRecordId) return 1;
      return a.date.localeCompare(b.date);
    });

    if (selectedCompany) {
      records = records.filter((r) => r.companyName === selectedCompany);
    }

    if (selectedSite) {
      records = records.filter(
        (r) => r.site && isSameSite(r.site, selectedSite),
      );
    }

    if (!debouncedSearchTerm) return records;
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    
    // Create pre-indexed Map for O(1) worker lookups, boosting matching performance by 1000x
    const workersMap = new Map();
    workers.forEach((w) => {
      if (w && w.id) {
        workersMap.set(w.id, w);
      }
    });

    return records.filter((record) => {
      const basicMatch =
        record.companyName?.toLowerCase().includes(lowerSearch) ||
        record.site?.toLowerCase().includes(lowerSearch) ||
        record.date.includes(lowerSearch);

      if (basicMatch) return true;

      // Check worker names and numbers
      const recordWorkers = (record.workerIds || [])
        .map((id) => workersMap.get(id))
        .filter(Boolean);
      return recordWorkers.some(
        (w) =>
          w.name.toLowerCase().includes(lowerSearch) ||
          w.workerNumber.toLowerCase().includes(lowerSearch),
      );
    });
  }, [
    attendance,
    workers,
    debouncedSearchTerm,
    selectedCompany,
    selectedSite,
    selectedMonth,
    expandedRecordId,
  ]);

  const uniqueFilteredRecords = useMemo(() => {
    const map = new Map<string, any>();
    filteredRecords.forEach((r) => {
      if (!map.has(r.id)) {
        map.set(r.id, r);
      }
    });
    return Array.from(map.values());
  }, [filteredRecords]);

  // PERFORMANCE: Pre-calculate worker summaries and last sites for the current month
  const workerStats = useMemo(() => {
    if (!selectedCompany) return null;

    const stats: Record<
      string,
      { totalHours: number; totalOT: number; lastSite: string }
    > = {};
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;

    // Sort attendance by date desc to easily find last site
    const monthAttendance = attendance
      .filter((r) => {
        if (!r.date) return false;
        const [y, m] = r.date.split("-");
        return parseInt(y, 10) === year && parseInt(m, 10) === month;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    attendance.forEach((record) => {
      if (record.date) {
        const [y, m] = record.date.split("-");
        if (parseInt(y, 10) === year && parseInt(m, 10) === month) {
          record.workerIds?.forEach((id) => {
            if (!stats[id])
              stats[id] = { totalHours: 0, totalOT: 0, lastSite: "" };
            const h = Number(record.hours) || 0;
            stats[id].totalHours += Math.min(h, 9);
            stats[id].totalOT +=
              record.otHours !== undefined
                ? Number(record.otHours)
                : Math.max(0, h - 9);
          });
        }
      }
    });

    // Determine last site
    monthAttendance.forEach((record) => {
      if (record.site) {
        record.workerIds?.forEach((id) => {
          if (stats[id] && !stats[id].lastSite) {
            stats[id].lastSite = record.site;
          }
        });
      }
    });

    return stats;
  }, [attendance, selectedCompany, selectedMonth, 9]);

  const handleCopyWorkers = useCallback(
    (recordId: string) => {
      if (isReadOnly || !onUpdateAttendanceRecords) return;

      const currentIndex = filteredRecords.findIndex((r) => r.id === recordId);
      if (currentIndex <= 0) return;

      const targetRecord = filteredRecords[currentIndex];
      const sourceRecord = filteredRecords[currentIndex - 1];
      const copiedWorkers = sourceRecord.workerIds || [];

      // Copy from the physically preceding row
      onUpdateAttendanceRecords(
        attendance.map((record) => {
          // Remove copied workers from other records on the same date
          if (record.id !== recordId && record.date === targetRecord.date) {
            if (
              record.workerIds &&
              record.workerIds.some((id) => copiedWorkers.includes(id))
            ) {
              const newWorkerIds = record.workerIds.filter(
                (id) => !copiedWorkers.includes(id),
              );
              const workerCount = Math.max(1, newWorkerIds.length);
              const m =
                workerCount > 1 || newWorkerIds.length > 0
                  ? workerCount
                  : record.mp !== undefined && record.mp !== null
                    ? Number(record.mp)
                    : 0;
              const calc = calculateAttendance(
                Number(record.hours) || 0,
                Number(record.otHours) || 0,
                m,
                Number(record.rate) || 0,
                settings,
                record.date,
                record.site,
              );

              return {
                ...record,
                workerIds: newWorkerIds,
                total: calc.total,
                vat: calc.vat,
                otHours: calc.otHours,
              };
            }
          }

          // Add to target record
          if (record.id === recordId) {
            const newWorkerIds = [...copiedWorkers];
            const workerCount = Math.max(1, newWorkerIds.length);
            const m =
              workerCount > 1 || newWorkerIds.length > 0
                ? workerCount
                : record.mp !== undefined && record.mp !== null
                  ? Number(record.mp)
                  : 0;
            const calc = calculateAttendance(
              Number(record.hours) || 0,
              Number(record.otHours) || 0,
              m,
              Number(record.rate) || 0,
              settings,
              record.date,
              record.site,
            );

            return {
              ...record,
              workerIds: newWorkerIds,
              total: calc.total,
              vat: calc.vat,
              otHours: calc.otHours,
            };
          }
          return record;
        }),
      );
    },
    [
      isReadOnly,
      onUpdateAttendanceRecords,
      attendance,
      filteredRecords,
      settings,
      calculateAttendance,
    ],
  );

  const handleDuplicateToRange = useCallback(
    (recordId: string, targetDateStr: string) => {
      if (isReadOnly || !onUpdateAttendanceRecords) return;

      const recordToDuplicate = attendance.find((r) => r.id === recordId);
      if (!recordToDuplicate || !recordToDuplicate.date) return;

      const [sy, sm, sd] = recordToDuplicate.date.split("-").map(Number);
      const [ty, tm, td] = targetDateStr.split("-").map(Number);

      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ty, tm - 1, td);

      if (end <= start) {
        alert("Please select a date after the current record's date.");
        return;
      }

      // Generate dates from start + 1 day up to targetDate (inclusive)
      const destDates: string[] = [];
      const current = new Date(start);
      current.setDate(current.getDate() + 1);

      let limit = 0;
      while (current <= end && limit < 100) {
        limit++;
        const dateStr = [
          current.getFullYear(),
          String(current.getMonth() + 1).padStart(2, "0"),
          String(current.getDate()).padStart(2, "0"),
        ].join("-");
        destDates.push(dateStr);
        current.setDate(current.getDate() + 1);
      }

      if (destDates.length === 0) return;

      // Create new records
      const newRecords = destDates.map((targetDate) => {
        const h = Number(recordToDuplicate.hours) || 0;
        const ot = Number(recordToDuplicate.otHours) || 0;
        const m =
          recordToDuplicate.workerIds?.length ||
          Number(recordToDuplicate.mp) ||
          0;
        const r = Number(recordToDuplicate.rate) || 0;

        const calc = calculateAttendance(
          h,
          ot,
          m,
          r,
          settings,
          targetDate,
          recordToDuplicate.site,
        );

        const duplicated: AttendanceRecord = {
          ...recordToDuplicate,
          id: crypto.randomUUID(),
          date: targetDate,
          total: calc.total,
          vat: calc.vat,
          otHours: calc.otHours,
        };
        return duplicated;
      });

      // Remove existing records on the same target dates that match the same company and site
      const destDatesSet = new Set(destDates);
      const filteredAttendance = attendance.filter((r) => {
        if (destDatesSet.has(r.date)) {
          if (
            r.companyName === recordToDuplicate.companyName &&
            r.site &&
            recordToDuplicate.site &&
            isSameSite(r.site, recordToDuplicate.site)
          ) {
            return false;
          }
        }
        return true;
      });

      onUpdateAttendanceRecords([...newRecords, ...filteredAttendance]);
    },
    [isReadOnly, onUpdateAttendanceRecords, attendance, settings],
  );

  const filteredWorkersForCompany = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return workers.filter(
      (w) =>
        w.company === selectedCompany &&
        (w.name.toLowerCase().includes(lowerSearch) ||
          w.workerNumber.toLowerCase().includes(lowerSearch) ||
          w.role.toLowerCase().includes(lowerSearch) ||
          w.status.toLowerCase().includes(lowerSearch)),
    );
  }, [workers, selectedCompany, searchTerm]);

  const activeWorkerIds = useMemo(() => {
    const ids = new Set<string>();
    filteredRecords.forEach((record) => {
      record.workerIds?.forEach((id) => ids.add(id));
    });
    return ids;
  }, [filteredRecords]);

  const activeRecord = expandedRecordId
    ? attendance.find((r) => r.id === expandedRecordId)
    : null;

  const quickAddWorkers = useMemo(() => {
    // Count occurrences of each worker in attendance
    const workerCounts: Record<string, number> = {};
    attendance.forEach((record) => {
      record.workerIds?.forEach((id) => {
        workerCounts[id] = (workerCounts[id] || 0) + 1;
      });
    });

    return workers
      .filter((w) => {
        if (w.status !== "Active" || activeWorkerIds.has(w.id)) return false;
        
        if (activeRecord) {
           const recordDate = activeRecord.date;
           if (w.joiningDate && w.joiningDate > recordDate) return false;
           if (w.vacationStartDate && w.vacationStartDate <= recordDate && (!w.vacationReturnDate || w.vacationReturnDate > recordDate)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const countA = workerCounts[a.id] || 0;
        const countB = workerCounts[b.id] || 0;
        if (countA !== countB) return countB - countA;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [workers, attendance, activeWorkerIds, activeRecord]);

  const sidebarWorkers = useMemo(() => {
    const lowerSearch = workerSearchTerm.toLowerCase();
    
    // Get workers assigned to the CURRENT record (so they don't show up twice)
    const assignedIds = new Set<string>(activeRecord?.workerIds || []);

    return workers
      .filter(
        (w) => {
          if (assignedIds.has(w.id) || w.status !== "Active") return false;

          if (activeRecord) {
             const recordDate = activeRecord.date;
             if (w.joiningDate && w.joiningDate > recordDate) return false;
             if (w.vacationStartDate && w.vacationStartDate <= recordDate && (!w.vacationReturnDate || w.vacationReturnDate > recordDate)) return false;
          }

          return (w.name.toLowerCase().includes(lowerSearch) ||
            w.workerNumber.toLowerCase().includes(lowerSearch) ||
            w.role.toLowerCase().includes(lowerSearch) ||
            w.company.toLowerCase().includes(lowerSearch) ||
            w.status.toLowerCase().includes(lowerSearch));
        }
      )
      .sort((a, b) => {
        // Prioritize current company/site workers
        const aIsCurrent =
          selection.type === "company" ? a.company === selection.name : true;
        const bIsCurrent =
          selection.type === "company" ? b.company === selection.name : true;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [workers, workerSearchTerm, selection, expandedRecordId, attendance]);

  const workerSuggestions = useMemo(() => {
    if (!workerSearchTerm || !expandedRecordId) return [];
    const lowerSearch = workerSearchTerm.toLowerCase();
    const activeRecord = attendance.find((r) => r.id === expandedRecordId);
    const existingIds = new Set(activeRecord?.workerIds || []);

    return workers
      .filter(
        (w) =>
          w.status === "Active" &&
          (w.name.toLowerCase().includes(lowerSearch) ||
            w.workerNumber.toLowerCase().includes(lowerSearch)),
      )
      .sort((a, b) => {
        // Show assigned workers first in suggestions if they match search
        const aIsAssigned = existingIds.has(a.id);
        const bIsAssigned = existingIds.has(b.id);
        if (aIsAssigned && !bIsAssigned) return -1;
        if (!aIsAssigned && bIsAssigned) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [workers, workerSearchTerm, expandedRecordId, attendance]);

  return (
    <div className="space-y-1 max-w-[1600px] mx-auto pb-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 bg-white dark:bg-[#0a0a0a] p-2 rounded-xl border border-line dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 hover:bg-[#E5E5E5] dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-zinc-500" />
              </button>
            )}
            <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic font-serif">
              {selectedMonth.toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </h1>
            {isMonthLocked && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Settings className="w-3 h-3 text-amber-500 animate-spin-slow" />
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest whitespace-nowrap">
                  Locked Month
                </span>
                {isAdmin && onUnlockMonth && (
                  <button
                    onClick={onUnlockMonth}
                    className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded hover:bg-amber-600 transition-colors"
                  >
                    Unlock
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl text-[10px] font-black uppercase tracking-widest opacity-50">
            {selectedCompany || selectedSite || "Operational Logs"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (selectedCompany || selectedSite) && (
            <button
              onClick={handleDeleteCurrent}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-red-200 dark:border-red-500/20"
              title={`Delete ${selectedCompany ? "Company" : "Site"}`}
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Worker Search/Add Bar */}
          {!isReadOnly && (
            <div className="relative group/search">
              <div className="relative">
                <Plus
                  size={16}
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
                    expandedRecordId ? "text-emerald-500" : "text-zinc-400",
                  )}
                />
                <input
                  type="text"
                  placeholder={
                    expandedRecordId
                      ? "Add personnel to selected row..."
                      : "Select a row to add personnel..."
                  }
                  value={workerSearchTerm}
                  onChange={(e) => setWorkerSearchTerm(e.target.value)}
                  disabled={!expandedRecordId}
                  className={cn(
                    "pl-9 pr-3 py-2 border rounded-lg text-xs outline-none w-72 transition-all",
                    expandedRecordId
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-zinc-900 dark:text-white placeholder:text-emerald-600/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                      : "bg-[#F5F5F7] dark:bg-zinc-900/50 border-line dark:border-white/10 text-zinc-400 cursor-not-allowed",
                  )}
                />
              </div>

              <AnimatePresence>
                {workerSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-line dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    {workerSuggestions.map((worker, index) => {
                      const activeRecord = attendance.find(
                        (r) => r.id === expandedRecordId,
                      );
                      const isAssigned = activeRecord?.workerIds?.includes(
                        worker.id,
                      );

                      return (
                        <button
                          key={`suggestion-${worker.id}-${index}`}
                          onClick={() => {
                            toggleWorker(expandedRecordId, worker.id);
                            setWorkerSearchTerm("");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group",
                            isAssigned
                              ? "hover:bg-red-50 dark:hover:bg-red-500/10"
                              : "hover:bg-emerald-50 dark:hover:bg-emerald-500/10",
                          )}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black",
                              isAssigned
                                ? "bg-red-500/10 text-red-600"
                                : "bg-emerald-500/10 text-emerald-600",
                            )}
                          >
                            {isAssigned ? (
                              <X size={14} />
                            ) : (
                              worker.name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-xs font-bold truncate",
                                isAssigned
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-zinc-900 dark:text-white",
                              )}
                            >
                              {worker.name}
                            </p>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                              #{worker.workerNumber}{" "}
                              {isAssigned && "• Assigned"}
                            </p>
                          </div>
                          {isAssigned && (
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              Remove
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#F5F5F7] dark:bg-zinc-900/50 border border-line dark:border-white/10 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none w-48 transition-all text-zinc-900 dark:text-white"
            />
          </div>

          {!isReadOnly && !selectedCompany && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAllExpanded(!isAllExpanded)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-line dark:border-white/10 text-zinc-500 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-all"
                title={isAllExpanded ? "Minimize All" : "Expand All"}
              >
                {isAllExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                <span>{isAllExpanded ? "Minimize All" : "Expand All"}</span>
              </button>
              {selectedSite && (
                <button
                  onClick={() => setShowEditSiteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-line dark:border-white/10 text-zinc-500 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-all"
                >
                  <Edit2 size={16} />
                  <span>Edit Site</span>
                </button>
              )}
              <button
                onClick={() => setIsCopyRangeModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-line dark:border-white/10 text-zinc-500 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-all"
                title="Copy Data Range"
              >
                <Clipboard size={16} />
                <span>Copy Range</span>
              </button>
              <button
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm shadow-emerald-500/20"
              >
                <PlusCircle size={16} />
                <span>Add Row</span>
              </button>

              <div className="flex items-center gap-1 border-l border-line dark:border-white/10 pl-2">
                <button
                  className="p-2 text-zinc-500 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Undo"
                >
                  <Undo size={16} />
                </button>
                <button
                  className="p-2 text-zinc-500 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Redo"
                >
                  <Redo size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Suggestions Bar removed as per user request */}

      <div className="flex flex-col lg:flex-row gap-4">
        {showSidebar && (
          <div className="w-full lg:w-80 shrink-0">
            <div className="relative bg-white dark:bg-[#0a0a0a] rounded-2xl border border-line dark:border-white/10 shadow-xl p-4 sticky top-4 flex flex-col max-h-[calc(100vh-100px)] hover:shadow-2xl hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/3 dark:bg-emerald-500/5 blur-[40px] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:scale-150 transition-all duration-500 animate-pulse" />
              <div className="relative z-10 flex items-center justify-between mb-4 pb-4 border-b border-line dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Users size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-widest text-sm">
                      Personnel
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter opacity-60">
                      {sidebarWorkers.length} matching of {workers.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedRecordId(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#E5E5E5] dark:hover:bg-white/5 rounded-xl transition-all"
                  title="Close Sidebar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative z-10 mb-6">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors"
                />
                <input
                  type="text"
                  placeholder="ID, Name, Role..."
                  value={workerSearchTerm}
                  onChange={(e) => setWorkerSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F5F5F7] dark:bg-zinc-900 border border-line dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 font-medium"
                />
              </div>

              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <AnimatePresence mode="popLayout">
                  {sidebarWorkers.length > 0 ? (
                    sidebarWorkers.map((worker, index) => {
                      const isActive = activeWorkerIds.has(worker.id);

                      return (
                        <div
                          key={`sidebar-worker-container-${worker.id}-${index}`}
                        >
                          {index === 0 && (
                            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 ml-1 flex items-center gap-2">
                              <Users size={10} />
                              <span>Available Personnel for this Date</span>
                            </div>
                          )}

                          <WorkerStatusItem
                            worker={worker}
                            isActive={isActive}
                            isExpandedRecordActive={false}
                            isReadOnly={isReadOnly}
                            expandedRecordId={expandedRecordId}
                            toggleWorker={toggleWorker}
                            handleDragStart={handleDragStart}
                            currentSelectionName={selection.name}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 bg-[#F5F5F7] dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                        <Search size={20} className="text-zinc-300" />
                      </div>
                      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                        Personnel Not Found
                      </p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                        Refine your search parameters
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Main Table Content */}
        <div className="flex-1 min-w-0 w-full">
          <div className="relative bg-white dark:bg-[#0a0a0a] rounded-2xl border border-line dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-emerald-500/20 dark:hover:border-emerald-500/20 transition-all duration-300 overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/3 dark:bg-emerald-500/5 blur-[120px] -mr-56 -mt-56 rounded-full pointer-events-none group-hover:scale-110 transition-all duration-500 animate-pulse" />
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left border-collapse">
                {selectedCompany ? (
                  <>
                    <thead>
                      <tr className="bg-[#F5F5F7] dark:bg-zinc-900/50 border-b border-line dark:border-white/10">
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          S.No.
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Emp.No.
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Salary
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Standard
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          OT
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Last Site
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line dark:divide-white/5">
                      {filteredWorkersForCompany.length > 0 ? (
                        filteredWorkersForCompany.map((worker, index) => {
                          const summary = workerStats?.[worker.id] || {
                            totalHours: 0,
                            totalOT: 0,
                            lastSite: "",
                          };

                          return (
                            <tr
                              key={`company-worker-${worker.id}-${index}`}
                              className="hover:bg-[#F5F5F7]/80 dark:hover:bg-zinc-800/50 transition-colors group h-12"
                            >
                              <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-[16px] font-bold text-zinc-900 dark:text-white">
                                  {worker.name}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                                {worker.workerNumber}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
                                {formatCurrency(
                                  worker.monthlySalary,
                                  settings.currency,
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  {summary.totalHours}h
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                  {summary.totalOT}h
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {worker.company}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {summary.lastSite ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E5E5E5] dark:bg-zinc-800 rounded-full text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                                    <MapPin size={10} />
                                    {summary.lastSite}
                                  </div>
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                {worker.role}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => {
                                    if (
                                      activeWorkerIds.has(worker.id) &&
                                      onUpdateAttendanceRecords
                                    ) {
                                      onUpdateAttendanceRecords(
                                        attendance.map((record) => {
                                          if (
                                            record.workerIds?.includes(
                                              worker.id,
                                            )
                                          ) {
                                            const newWorkerIds =
                                              record.workerIds.filter(
                                                (id) => id !== worker.id,
                                              );
                                            return {
                                              ...record,
                                              workerIds: newWorkerIds,
                                              mp: newWorkerIds.length,
                                            };
                                          }
                                          return record;
                                        }),
                                      );
                                    }
                                  }}
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                                    activeWorkerIds.has(worker.id)
                                      ? "bg-emerald-500 text-white shadow-sm hover:bg-red-500 hover:scale-105"
                                      : worker.status === "Active"
                                        ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300"
                                        : "bg-[#E5E5E5] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
                                  )}
                                  title={
                                    activeWorkerIds.has(worker.id)
                                      ? "Click to remove from all attendance records this month"
                                      : ""
                                  }
                                >
                                  {activeWorkerIds.has(worker.id)
                                    ? "Daily"
                                    : worker.status}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="p-4 text-center text-zinc-500 dark:text-zinc-400"
                          >
                            No staff found for this company.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead>
                      <tr className="bg-[#F5F5F7]/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-line dark:border-white/10 shadow-sm">
                        <th className="px-1 py-2 w-[120px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          Date
                        </th>
                        <th className="px-1 py-1 w-[400px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          Workers
                        </th>
                        <th className="px-1 py-1 w-[70px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          Standard
                        </th>
                        <th className="px-1 py-1 w-[70px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          OT
                        </th>
                        <th className="px-1 py-1 w-[70px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          MP
                        </th>
                        <th className="px-1 py-1 w-[80px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          Total (TH)
                        </th>
                        <th className="px-1 py-1 w-[100px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          Rate
                        </th>
                        <th className="px-1 py-1 w-[120px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          Subtotal
                        </th>
                        <th className="px-1 py-1 w-[100px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          VAT
                        </th>
                        <th className="px-1 py-1 w-[120px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">
                          Total
                        </th>
                        {!isReadOnly && (
                          <th className="px-1 py-1 w-[120px] text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] text-center">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line dark:divide-white/5">
                      {uniqueFilteredRecords.map(
                        (record: any, index: number) => (
                          <AttendanceRow
                            key={`attendance-${record.id || "temp"}-${index}`}
                            record={record}
                            settings={settings}
                            isReadOnly={isReadOnly}
                            workers={workers}
                            attendance={attendance}
                            selectedCompany={selectedCompany}
                            expandedRecordId={expandedRecordId}
                            setExpandedRecordId={setExpandedRecordId}
                            dragOverRecordId={dragOverRecordId}
                            handleUpdateRecord={handleUpdateRecord}
                            handleDeleteRow={handleDeleteRow}
                            handleCopyWorkers={handleCopyWorkers}
                            handleDuplicateToRange={handleDuplicateToRange}
                            handleDuplicateToNextDate={
                              handleDuplicateToNextDate
                            }
                            handleCopyWorkersToClipboard={
                              handleCopyWorkersToClipboard
                            }
                            handlePasteWorkersFromClipboard={
                              handlePasteWorkersFromClipboard
                            }
                            copiedWorkersCount={copiedWorkers.length}
                            toggleWorker={toggleWorker}
                            handleDragOver={handleDragOver}
                            handleDragLeave={handleDragLeave}
                            handleDrop={handleDrop}
                            onAddWorker={onAddWorker}
                            isAllExpanded={isAllExpanded}
                            onManualBackup={onManualBackup}
                          />
                        ),
                      )}
                      {filteredRecords.length === 0 && (
                        <tr key="empty-state">
                          <td
                            colSpan={isReadOnly ? 10 : 11}
                            className="p-4 text-center text-zinc-500 dark:text-zinc-400"
                          >
                            No attendance records found.{" "}
                            {searchTerm
                              ? "Try a different search term."
                              : 'Click "Add Row" to create one.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={`Delete ${selectedCompany ? "Company" : "Site"}`}
        message={`Are you sure you want to delete ${selectedCompany || selectedSite}? This will not delete worker records but they will no longer be associated with this ${selectedCompany ? "company" : "site"}.`}
        confirmLabel="Delete"
        type="danger"
      />

      <SiteModal
        isOpen={showEditSiteModal}
        onClose={() => setShowEditSiteModal(false)}
        onSave={handleSaveSite}
        existingSites={(settings.projectSites || []).filter((s) => {
          const mKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
          return !(settings.hiddenSitesByMonth?.[mKey] || []).includes(s);
        })}
        folders={Object.keys(settings.siteGroups || {})}
        initialSite={selectedSite || ""}
        initialRate={
          selectedSite ? getSiteRate(selectedSite, settings.siteRates) || 0 : 0
        }
        initialFolder={
          selectedSite
            ? Object.keys(settings.siteGroups || {}).find((g) =>
                settings.siteGroups![g].includes(selectedSite!),
              )
            : ""
        }
      />

      <CopyRangeModal
        isOpen={isCopyRangeModalOpen}
        onClose={() => setIsCopyRangeModalOpen(false)}
        onCopy={handleCopyDateRange}
        defaultMonth={selectedMonth}
        entityName={selectedSite || selectedCompany || "Operational Logs"}
      />
    </div>
  );
};
