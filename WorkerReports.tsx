import React, { useState } from "react";
import {
  SystemSettings,
  Worker,
  BackupHistoryItem,
  AttendanceRecord,
  DeleteRequest,
} from "../types";
import {
  Save,
  Shield,
  Building2,
  Calculator,
  Percent,
  Globe,
  Filter,
  Info,
  RotateCcw,
  Database,
  Download,
  Upload,
  History,
  Clock,
  CloudUpload,
  Loader2,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Check,
  X,
  HardDrive,
  Activity,
  AlertTriangle,
  Lock,
  Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ConfirmationModal } from "./ConfirmationModal";
import { ExcelImportModal } from "./ExcelImportModal";
import { ActivityLogModal } from "./ActivityLogModal";
import { ExportModal } from "./ExportModal";
import { logActivity } from "../lib/activity-logger";

interface SettingsSheetProps {
  settings: SystemSettings;
  workers: Worker[];
  onUpdateSettings: (settings: SystemSettings) => void;
  backupHistory: BackupHistoryItem[];
  onManualBackup: (
    scope?: "all" | "period",
    filters?: { year: number; month?: number | null },
  ) => void;
  onRestore: (file: File) => void;
  onRestoreFromData: (data: string) => void;
  onRecoverLegacyData?: () => void;
  onBootstrap?: () => void;
  onClearAttendance?: () => void;
  onImportAttendance?: (records: AttendanceRecord[]) => void;
  isBootstrapping?: boolean;
  selectedMonth?: Date;
  dataHealth?: {
    attendanceSize: number;
    workersSize: number;
    settingsSize?: number;
    accountsSize?: number;
    attendanceCount?: number;
    workersCount?: number;
    accountsCount?: number;
    isNearLimit: boolean;
  };
  dbProvider?: "supabase" | "local";
  onUpdateDbProvider?: (provider: "supabase" | "local") => void;
  portalId?: string;
  onUpdatePortalId?: (portalId: string) => void;
  isMasterControlLocked?: boolean;
  onDeleteRequest?: (request: Omit<DeleteRequest, 'id' | 'requestDate' | 'status'>) => Promise<void>;
  onApproveDeleteRequest?: (request: DeleteRequest) => Promise<void>;
  onRejectDeleteRequest?: (requestId: string) => Promise<void>;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  settings,
  workers,
  onUpdateSettings,
  backupHistory,
  onManualBackup,
  onRestore,
  onRestoreFromData,
  onRecoverLegacyData,
  onBootstrap,
  onClearAttendance,
  onImportAttendance,
  isBootstrapping,
  selectedMonth,
  dataHealth,
  dbProvider = "local",
  onUpdateDbProvider,
  portalId = "FahimKhan_Portal",
  onUpdatePortalId,
  isMasterControlLocked = false,
  onDeleteRequest,
  onApproveDeleteRequest,
  onRejectDeleteRequest,
}) => {
  const [localSettings, setLocalSettings] = React.useState({
    ...settings,
    companies: settings?.companies || [],
    projectSites: settings?.projectSites || [],
  });
  
  const [tempPortalId, setTempPortalId] = React.useState(portalId);

  React.useEffect(() => {
    setLocalSettings({
      ...settings,
      companies: settings?.companies || [],
      projectSites: settings?.projectSites || [],
    });
  }, [settings]);

  React.useEffect(() => {
    setTempPortalId(portalId);
  }, [portalId]);

  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = React.useState(false);
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [showBootstrapModal, setShowBootstrapModal] = React.useState(false);
  const [showRecoverModal, setShowRecoverModal] = React.useState(false);
  const [showActivityLog, setShowActivityLog] = React.useState(false);
  const [restoreData, setRestoreData] = React.useState<string | null>(null);

  const departments = React.useMemo(
    () => ["All", ...new Set(workers.map((w) => w.department))],
    [workers],
  );

  const [newCompany, setNewCompany] = useState("");
  const [newSite, setNewSite] = useState("");
  const [newSiteMinHours, setNewSiteMinHours] = useState<number | "">("");
  const [newSiteWorkerHours, setNewSiteWorkerHours] = useState<number | "">("");
  const [newSiteVat, setNewSiteVat] = useState<number | "">("");
  const [newSiteVatOption, setNewSiteVatOption] = useState<"with" | "without">("with");

  const [editingCompany, setEditingCompany] = useState<{
    index: number;
    value: string;
  } | null>(null);
  const [editingSite, setEditingSite] = useState<{
    index: number;
    value: string;
    minChargeHours?: number;
    workerStandardHours?: number;
    vatPercentage?: number;
    vatPercentageOption?: "with" | "without";
  } | null>(null);

  const dashboardCompanies = React.useMemo(
    () => ["All", ...(localSettings.companies || [])],
    [localSettings.companies],
  );

  const handleChange = (key: keyof SystemSettings, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addCompany = () => {
    const trimmedName = newCompany.trim().toUpperCase();
    if (
      trimmedName &&
      !localSettings.companies.some((c) => c.toUpperCase() === trimmedName)
    ) {
      handleChange("companies", [...localSettings.companies, trimmedName]);
      setNewCompany("");
    }
  };

  const removeCompany = (company: string) => {
    if (isMasterControlLocked) {
      if (onDeleteRequest) {
        onDeleteRequest({
          type: 'COMPANY',
          targetId: company,
          label: `Company: ${company}`,
          details: `Remove company from global list.`
        });
      }
      return;
    }

    handleChange(
      "companies",
      localSettings.companies.filter((c) => c !== company),
    );
  };

  const startEditCompany = (index: number, value: string) => {
    setEditingCompany({ index, value });
  };

  const saveEditCompany = () => {
    if (editingCompany && editingCompany.value.trim()) {
      const trimmedName = editingCompany.value.trim().toUpperCase();
      const updatedCompanies = [...localSettings.companies];

      // Check for duplicates
      if (
        updatedCompanies.some(
          (c, idx) =>
            idx !== editingCompany.index && c.toUpperCase() === trimmedName,
        )
      ) {
        // Duplicate exists, don't save
        setEditingCompany(null);
        return;
      }

      updatedCompanies[editingCompany.index] = trimmedName;
      handleChange("companies", updatedCompanies);
      setEditingCompany(null);
    }
  };

  const addSite = () => {
    const trimmedName = newSite.trim().toUpperCase();
    if (
      trimmedName &&
      !localSettings.projectSites.some((s) => s.toUpperCase() === trimmedName)
    ) {
      const updatedSites = [...localSettings.projectSites, trimmedName];
      const newSiteSettings = { ...(localSettings.siteSettings || {}) };

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

      setLocalSettings((prev) => ({
        ...prev,
        projectSites: updatedSites,
        siteSettings: newSiteSettings,
      }));
      setNewSite("");
      setNewSiteMinHours("");
      setNewSiteWorkerHours("");
      setNewSiteVat("");
      setNewSiteVatOption("with");
    }
  };

  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("done"); // 'done' | 'not_continued' | 'duplicate' | 'other'
  const [otherReasonText, setOtherReasonText] = useState<string>("");

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

    if (isMasterControlLocked) {
      if (onDeleteRequest) {
        onDeleteRequest({
          type: 'SITE',
          targetId: siteToDelete,
          label: `Site: ${siteToDelete}`,
          details: `Reason: ${fullReason}`
        });
      }
      setSiteToDelete(null);
      return;
    }

    const updatedSites = localSettings.projectSites.filter(
      (s) => s !== siteToDelete,
    );
    const newSiteSettings = { ...(localSettings.siteSettings || {}) };
    if (newSiteSettings[siteToDelete]) {
      delete newSiteSettings[siteToDelete];
    }
    const newSiteRates = { ...(localSettings.siteRates || {}) };
    if (newSiteRates[siteToDelete]) {
      delete newSiteRates[siteToDelete];
    }
    const newSiteMinChargeHours = {
      ...(localSettings.siteMinChargeHours || {}),
    };
    if (newSiteMinChargeHours[siteToDelete]) {
      delete newSiteMinChargeHours[siteToDelete];
    }

    setLocalSettings((prev) => ({
      ...prev,
      projectSites: updatedSites,
      siteSettings: newSiteSettings,
      siteRates: newSiteRates,
      siteMinChargeHours: newSiteMinChargeHours,
    }));

    // Log deletion activity on system with the selected reason
    logActivity(
      "DELETE",
      "SITE",
      `Deleted project site: ${siteToDelete}. Reason: ${fullReason}`,
    );

    setSiteToDelete(null);
  };

  const startEditSite = (index: number, value: string) => {
    const siteSettings = localSettings.siteSettings?.[value];
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
      const updatedSites = [...localSettings.projectSites];
      const oldName = updatedSites[editingSite.index];

      // Check for duplicates
      if (
        updatedSites.some(
          (s, idx) =>
            idx !== editingSite.index && s.toUpperCase() === trimmedName,
        )
      ) {
        // Duplicate exists, don't save
        setEditingSite(null);
        return;
      }

      updatedSites[editingSite.index] = trimmedName;

      const newSiteRates = { ...(localSettings.siteRates || {}) };
      const newSiteSettings = { ...(localSettings.siteSettings || {}) };

      if (oldName !== trimmedName) {
        if (newSiteRates[oldName] !== undefined) {
          newSiteRates[trimmedName] = newSiteRates[oldName];
          delete newSiteRates[oldName];
        }
        if (newSiteSettings[oldName] !== undefined) {
          newSiteSettings[trimmedName] = newSiteSettings[oldName];
          delete newSiteSettings[oldName];
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

      setLocalSettings((prev) => ({
        ...prev,
        projectSites: updatedSites,
        siteRates: newSiteRates,
        siteSettings: newSiteSettings,
      }));
      setEditingSite(null);
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setShowSuccessModal(true);
  };

  const handleReset = () => {
    const defaults: SystemSettings = {
      ...settings,
      totalWorkingDays: 31,
      standardWorkingHours: 8,
      defaultOTRate: 10,
      salaryMethod: "PerDayWage",
      maxPaidLeave: 2,
      currency: "AED",
      roundingRule: "TwoDecimals",
      taxPercentage: 0,
      vatPercentage: 5,
      bonusPercentage: 0,
    };
    setLocalSettings(defaults);
    setShowResetModal(false);
  };

  return (
    <div className="space-y-16 pb-24 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-10"
      >
        <div className="max-w-2xl space-y-4">
          <h2 className="luxury-heading text-6xl">System Configuration</h2>
          <p className="text-zinc-500 font-medium tracking-wide leading-relaxed">
            The "Brain" of your payroll system. Changes here affect all
            calculations across the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowActivityLog(true)}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all border border-blue-100 dark:border-blue-500/20"
          >
            <Activity size={18} />
            Activity Log
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const localData = localStorage.getItem("portal_auto_backup");
              if (localData) {
                if (
                  window.confirm(
                    "Found local auto-backup. This might contain your unsaved project data. Would you like to restore it? This will overwrite current online data.",
                  )
                ) {
                  try {
                    const parsed = JSON.parse(localData);
                    onRestoreFromData(JSON.stringify(parsed));
                    alert(
                      "Locally cached data restored successfully. Please check your attendance tab.",
                    );
                  } catch (e: any) {
                    alert("Error parsing local backup: " + e.message);
                  }
                }
              } else {
                alert("No local auto-backup found on this device.");
              }
            }}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all border border-orange-100 dark:border-orange-500/20"
          >
            <RotateCcw size={18} />
            Emergency Local Restore
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
          >
            <RotateCcw size={18} />
            Reset Defaults
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="btn-primary !px-10 !py-4 !rounded-2xl relative group/btn overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600 opacity-0 group-hover/btn:opacity-20 transition-opacity animate-gradient-x" />
            <Save size={18} />
            Save Changes
          </motion.button>
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        title="Settings Saved"
        message="System configuration has been updated successfully. All payroll calculations have been recalculated based on the new rules."
        confirmLabel="Got it"
        type="info"
      />

      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
        title="Reset Calculation Rules?"
        message="Are you sure you want to reset all calculation rules to their default values? This will not affect worker data, but will change how their salaries are calculated."
        confirmLabel="Reset Now"
        type="warning"
      />

      <ConfirmationModal
        isOpen={showBootstrapModal}
        onClose={() => setShowBootstrapModal(false)}
        onConfirm={() => {
          if (onBootstrap) onBootstrap();
          setShowBootstrapModal(false);
        }}
        title="Reset ALL System Data?"
        message="CRITICAL ACTION: This will delete all your current workers, attendance records, and settings, and replace them with sample data. This cannot be undone. Are you absolutely sure?"
        confirmLabel="Yes, Reset Everything"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showRecoverModal}
        onClose={() => setShowRecoverModal(false)}
        onConfirm={() => {
          if (onRecoverLegacyData) onRecoverLegacyData();
          setShowRecoverModal(false);
        }}
        title="Recover Legacy Data?"
        message="This will fetch your old data from the global store and merge it into your current workspace. Are you sure you want to proceed?"
        confirmLabel="Yes, Recover Data"
        type="warning"
      />

      <ExcelImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        workers={workers}
        settings={settings}
        onImportAttendance={onImportAttendance || (() => {})}
      />

      <ActivityLogModal
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={onManualBackup}
        defaultMonth={selectedMonth || new Date()}
      />

      <ConfirmationModal
        isOpen={restoreData !== null}
        onClose={() => setRestoreData(null)}
        onConfirm={() => {
          if (restoreData) {
            onRestoreFromData(restoreData);
          }
          setRestoreData(null);
        }}
        title="Restore Backup?"
        message="Are you sure you want to restore this backup? Your current workers, attendance, and settings will be completely overwritten by the backup data."
        confirmLabel="Yes, Restore Backup"
        type="warning"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Pending Approval Requests */}
        {!isMasterControlLocked && (settings.deleteRequests || []).length > 0 && (
          <div className="col-span-full">
            <SettingsCard icon={<AlertTriangle size={20} className="text-amber-500" />} title="Pending Approvals">
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  The following deletion requests were submitted while Master Control was locked. Review and approve to perform the actual deletion.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(settings.deleteRequests || []).map((req) => (
                    <div key={req.id} className="p-4 bg-white dark:bg-zinc-900 border border-line dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {req.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(req.requestDate).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {req.label}
                        </h4>
                        {req.details && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {req.details}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRejectDeleteRequest?.(req.id)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                          title="Reject Request"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => onApproveDeleteRequest?.(req)}
                          className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer"
                          title="Approve & Delete"
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SettingsCard>
          </div>
        )}

        {/* Company & Period */}
        <SettingsCard icon={<Building2 size={20} />} title="Company & Period">
          <div className="space-y-4">
            <Field label="System Name">
              <input
                type="text"
                value={localSettings.systemName}
                onChange={(e) => handleChange("systemName", e.target.value)}
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
              />
            </Field>
            <Field label="System Creator">
              <input
                type="text"
                value={localSettings.systemCreator}
                disabled={isMasterControlLocked}
                onChange={(e) => handleChange("systemCreator", e.target.value)}
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white disabled:opacity-50"
              />
            </Field>
            <Field label="Company Name">
              <input
                type="text"
                value={localSettings.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Payroll Month">
                <select
                  value={localSettings.payrollMonth}
                  onChange={(e) => handleChange("payrollMonth", e.target.value)}
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                >
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((m) => (
                    <option key={`month-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year">
                <input
                  type="number"
                  value={localSettings.payrollYear || ""}
                  onChange={(e) =>
                    handleChange(
                      "payrollYear",
                      parseInt(e.target.value) || new Date().getFullYear(),
                    )
                  }
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                />
              </Field>
            </div>
          </div>
        </SettingsCard>

        {/* Company Management */}
        {!isMasterControlLocked && (
          <SettingsCard icon={<Building2 size={20} />} title="Company Management">
            <div className="space-y-6">
              <Field label="Add New Company">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === "Enter" && addCompany()}
                    placeholder="Enter company name..."
                    className="flex-1 bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                  />
                  <button
                    onClick={addCompany}
                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </Field>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {localSettings.companies?.map((company, index) => (
                  <div
                    key={`company-${company}-${index}`}
                    className="group flex items-center justify-between p-3 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-xl border border-line dark:border-zinc-700 transition-all hover:border-zinc-400 dark:hover:border-zinc-500"
                  >
                    {editingCompany?.index === index ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingCompany.value}
                          onChange={(e) =>
                            setEditingCompany({
                              ...editingCompany,
                              value: e.target.value.toUpperCase(),
                            })
                          }
                          onKeyPress={(e) =>
                            e.key === "Enter" && saveEditCompany()
                          }
                          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm font-bold outline-none"
                          autoFocus
                        />
                        <button
                          onClick={saveEditCompany}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingCompany(null)}
                          className="p-2 text-zinc-400 hover:bg-[#E5E5E5] dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#E5E5E5] dark:bg-zinc-700 flex items-center justify-center text-zinc-500">
                            <Building2 size={14} />
                          </div>
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">
                            {company}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditCompany(index, company)}
                            className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit Company"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => removeCompany(company)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Company"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </SettingsCard>
        )}

        {/* Project Sites */}
        {!isMasterControlLocked && (
          <SettingsCard icon={<Globe size={20} />} title="Site Management">
          <div className="space-y-6">
            <div className="border border-line dark:border-zinc-700/50 rounded-xl p-4 bg-[#F5F5F7]/30 dark:bg-zinc-800/20 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Add New Site</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSite()}
                    placeholder="Enter site name..."
                    className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 dark:text-white outline-none"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Min Charge (h)</label>
                  <input
                    type="number"
                    value={newSiteMinHours}
                    onChange={(e) =>
                      setNewSiteMinHours(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="e.g. 4"
                    className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 dark:text-white outline-none"
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-line/40 dark:border-zinc-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      VAT Option
                    </label>
                    <p className="text-[9px] text-zinc-400">Apply or exempt UAE VAT</p>
                  </div>
                  <div className="flex bg-[#E5E5EA] dark:bg-zinc-850 rounded-lg p-0.5">
                    <button
                      type="button"
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
                    <button
                      type="button"
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
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-line/40 dark:border-zinc-700/30">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      Custom VAT (%) <span className="opacity-50">(Optional)</span>
                    </span>
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
                      className="w-28 bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold focus:ring-1 focus:ring-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={addSite}
                disabled={!newSite.trim()}
                className="w-full mt-2 px-4 py-3 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Site
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {localSettings.projectSites?.map((site, index) => (
                <div
                  key={`site-${site}-${index}`}
                  className="group flex items-center justify-between p-3 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-xl border border-line dark:border-zinc-700 transition-all hover:border-zinc-400 dark:hover:border-zinc-500"
                >
                  {editingSite?.index === index ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingSite.value}
                          onChange={(e) =>
                            setEditingSite({
                              ...editingSite,
                              value: e.target.value,
                            })
                          }
                          onKeyPress={(e) => e.key === "Enter" && saveEditSite()}
                          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm font-bold outline-none"
                          autoFocus
                        />
                        <input
                          type="number"
                          value={editingSite.minChargeHours || ""}
                          onChange={(e) =>
                            setEditingSite({
                              ...editingSite,
                              minChargeHours: parseFloat(e.target.value),
                            })
                          }
                          placeholder="Min Charge (h)"
                          className="w-32 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm font-bold outline-none"
                        />
                        <button
                          onClick={saveEditSite}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingSite(null)}
                          className="p-2 text-zinc-400 hover:bg-[#E5E5E5] dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="border border-line/55 dark:border-zinc-700/50 rounded-xl p-2.5 bg-white dark:bg-zinc-900/60 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-zinc-400">VAT Status</span>
                          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSite({
                                  ...editingSite,
                                  vatPercentageOption: "with",
                                  vatPercentage: editingSite.vatPercentage === 0 ? undefined : editingSite.vatPercentage,
                                });
                              }}
                              className={cn(
                                "px-2 py-0.5 text-[9px] font-black uppercase rounded-md transition-all duration-150",
                                editingSite.vatPercentageOption === "with"
                                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
                              )}
                            >
                              With VAT
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSite({
                                  ...editingSite,
                                  vatPercentageOption: "without",
                                  vatPercentage: 0,
                                });
                              }}
                              className={cn(
                                "px-2 py-0.5 text-[9px] font-black uppercase rounded-md transition-all duration-150",
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
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/30 dark:border-zinc-700/30">
                            <span className="text-[9px] text-zinc-400 font-medium font-bold">
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
                              className="w-20 bg-zinc-50 dark:bg-zinc-950 border border-line dark:border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-center font-bold focus:ring-1 focus:ring-zinc-900 dark:text-white outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#E5E5E5] dark:bg-zinc-700 flex items-center justify-center text-zinc-500">
                            <Globe size={14} />
                          </div>
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">
                            {site}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {localSettings.siteSettings?.[site] &&
                            localSettings.siteSettings[site].minChargeHours >
                              0 && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Min Charge:{" "}
                                {
                                  localSettings.siteSettings[site]
                                    .minChargeHours
                                }
                                h
                              </span>
                            )}
                          {localSettings.siteSettings?.[site]?.vatPercentage !== undefined && (
                            <span
                              className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                                localSettings.siteSettings[site].vatPercentage === 0
                                  ? "text-rose-500 bg-rose-500/10"
                                  : "text-amber-500 bg-amber-500/10 animate-pulse",
                              )}
                            >
                              {localSettings.siteSettings[site].vatPercentage === 0
                                ? "No VAT"
                                : `VAT ${localSettings.siteSettings[site].vatPercentage}%`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditSite(index, site)}
                          className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit Site"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeSite(site)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Site"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>
        )}

        {/* Calculation Logic */}
        <SettingsCard icon={<Calculator size={20} />} title="Calculation Rules">
          <div className="space-y-4">
            <Field label="Salary Calculation Method">
              <select
                value={localSettings.salaryMethod}
                onChange={(e) => handleChange("salaryMethod", e.target.value)}
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
              >
                <option value="FixedMonthly">
                  Monthly Fixed / Working Days
                </option>
                <option value="PerDayWage">Per-Day Fixed Wage</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Working Days">
                <input
                  type="number"
                  disabled={isMasterControlLocked}
                  value={localSettings.totalWorkingDays || ""}
                  onChange={(e) =>
                    handleChange(
                      "totalWorkingDays",
                      parseInt(e.target.value) || 30,
                    )
                  }
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white disabled:opacity-50"
                />
              </Field>
              <Field label="Std. Hours">
                <input
                  type="number"
                  disabled={isMasterControlLocked}
                  value={localSettings.standardWorkingHours || ""}
                  onChange={(e) =>
                    handleChange(
                      "standardWorkingHours",
                      parseInt(e.target.value) || 8,
                    )
                  }
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white disabled:opacity-50"
                />
              </Field>
            </div>
          </div>
        </SettingsCard>

        {/* Financials */}
        <SettingsCard icon={<Percent size={20} />} title="Financial Modifiers">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tax Deduction (%)">
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.taxPercentage || ""}
                  onChange={(e) =>
                    handleChange(
                      "taxPercentage",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                />
              </Field>
              <Field label="VAT (UAE Gov %)">
                <input
                  type="number"
                  step="0.1"
                  value={
                    localSettings.vatPercentage !== undefined
                      ? localSettings.vatPercentage
                      : 5
                  }
                  onChange={(e) =>
                    handleChange(
                      "vatPercentage",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                />
              </Field>
              <Field label="Bonus (%)">
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.bonusPercentage || ""}
                  onChange={(e) =>
                    handleChange(
                      "bonusPercentage",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                />
              </Field>
            </div>
            <Field label="Max Paid Leave (Days/Month)">
              <input
                type="number"
                value={localSettings.maxPaidLeave || ""}
                onChange={(e) =>
                  handleChange("maxPaidLeave", parseInt(e.target.value) || 0)
                }
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
              />
            </Field>
          </div>
        </SettingsCard>

        {/* System & Localization */}
        <SettingsCard icon={<Globe size={20} />} title="System & Localization">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Currency">
                <select
                  value={localSettings.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="PKR">PKR (Rs)</option>
                </select>
              </Field>
              <Field label="Rounding">
                <select
                  value={localSettings.roundingRule}
                  onChange={(e) => handleChange("roundingRule", e.target.value)}
                  className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                >
                  <option value="WholeNumber">Whole Number</option>
                  <option value="TwoDecimals">2 Decimals</option>
                </select>
              </Field>
            </div>
          </div>
        </SettingsCard>

        {/* Dashboard Controls */}
        <SettingsCard icon={<Filter size={20} />} title="Dashboard Filters">
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select which data group should be prioritized on the main
              dashboard.
            </p>
            <Field label="Filter by Company">
              <select
                value={localSettings.dashboardFilterCompany}
                onChange={(e) =>
                  handleChange("dashboardFilterCompany", e.target.value)
                }
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
              >
                {dashboardCompanies.map((c, i) => (
                  <option key={`company-${c}-${i}`} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Filter by Department">
              <select
                value={localSettings.dashboardFilterDepartment}
                onChange={(e) =>
                  handleChange("dashboardFilterDepartment", e.target.value)
                }
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
              >
                {departments.map((d, i) => (
                  <option key={`dept-${d}-${i}`} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </SettingsCard>

        {/* Custom Options */}
        <SettingsCard icon={<Pencil size={20} />} title="Custom Options">
          <div className="space-y-4">
            <Field label="Wood Settings">
              <input
                type="text"
                value={localSettings.woodSettings || ""}
                onChange={(e) => handleChange("woodSettings", e.target.value)}
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                placeholder="Enter wood settings details"
              />
            </Field>
            <Field label="Other Options">
              <input
                type="text"
                value={localSettings.otherOptions || ""}
                onChange={(e) => handleChange("otherOptions", e.target.value)}
                className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                placeholder="Enter other options"
              />
            </Field>
          </div>
        </SettingsCard>

        {/* Storage & Health */}
        <SettingsCard icon={<HardDrive size={20} />} title="Storage & Health">
          <div className="space-y-6">
            <div className="p-4 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-2xl border border-line dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900">
                  <Activity size={16} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Database Usage
                  </h4>
                  <p className="text-[8px] text-zinc-500 font-medium uppercase tracking-widest">
                    {dbProvider === "supabase" ? "Supabase Storage" : "Local Storage"}
                  </p>
                </div>
              </div>

              {/* Database Provider Status */}
              <div className="mt-4 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-line dark:border-white/5">
                <h5 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-2">Active Database</h5>
                
                {dbProvider === "supabase" && (
                  <div className="space-y-3 pt-3">
                    <p className="text-[10px] text-zinc-500 mt-2">
                      Connected to Supabase cloud. Data is synced across your devices.
                    </p>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('syncLocalToCloud'))}
                      className="w-full py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                    >
                      Push Local Data to Cloud
                    </button>
                  </div>
                )}
                
                {dbProvider === "local" && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-2 font-medium">
                    Working offline (Local Storage). Data will not be synced to the cloud.
                  </p>
                )}
              </div>

              {dataHealth ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Workers Data
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-300">
                        {dataHealth.workersCount || 0} records (
                        {(dataHealth.workersSize / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (dataHealth.workersSize / 1048576) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Attendance Records
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-300">
                        {dataHealth.attendanceCount || 0} records (
                        {(dataHealth.attendanceSize / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (dataHealth.attendanceSize / 1048576) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Accounts Ledger Records
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-300">
                        {dataHealth.accountsCount || 0} records (
                        {((dataHealth.accountsSize || 0) / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, ((dataHealth.accountsSize || 0) / 1048576) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        System Settings
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-300">
                        {((dataHealth.settingsSize || 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  {dataHealth.isNearLimit && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
                      <AlertTriangle
                        className="text-amber-500 shrink-0 mt-0.5"
                        size={16}
                      />
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
                          Storage Nearing Capacity
                        </h5>
                        <p className="text-xs text-amber-700 dark:text-amber-500/80 leading-relaxed font-medium">
                          Your dataset is growing large. Consider exporting
                          legacy attendance records and clearing them to
                          maintain optimal performance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Calculating usage...
                </div>
              )}
            </div>

            {/* Data Usage & Accounts Eligibility Options */}
            <div className="p-4 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-2xl border border-line dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Activity size={16} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Data Usage & Accounts settings
                  </h4>
                  <p className="text-[8px] text-zinc-500 font-medium uppercase tracking-widest">
                    Manage Accounts Ledger Eligibility
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.otherOptions?.includes("accounts_eligible") ?? true}
                    onChange={(e) => {
                      const current = localSettings.otherOptions || "";
                      let newValue = current;
                      if (e.target.checked) {
                        if (!current.includes("accounts_eligible")) {
                          newValue = current ? `${current},accounts_eligible` : "accounts_eligible";
                        }
                      } else {
                        newValue = current.split(",").filter(x => x !== "accounts_eligible").join(",");
                      }
                      handleChange("otherOptions", newValue);
                    }}
                    className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-emerald-500 focus:ring-emerald-500/50 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      Make Accounts Eligible for Editing
                    </span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5 leading-relaxed">
                      If enabled, all users can easily edit transaction details, currency values, reasons, and amounts.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.otherOptions?.includes("track_ledger_size") ?? true}
                    onChange={(e) => {
                      const current = localSettings.otherOptions || "";
                      let newValue = current;
                      if (e.target.checked) {
                        if (!current.includes("track_ledger_size")) {
                          newValue = current ? `${current},track_ledger_size` : "track_ledger_size";
                        }
                      } else {
                        newValue = current.split(",").filter(x => x !== "track_ledger_size").join(",");
                      }
                      handleChange("otherOptions", newValue);
                    }}
                    className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-emerald-500 focus:ring-emerald-500/50 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      Track Accounts in Data Health
                    </span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5 leading-relaxed">
                      Calculates real-time size consumption and totals for worker accounts within the database.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Bulk Cleanups */}
            <div className="p-4 bg-red-50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900 dark:text-red-400">
                    Bulk Data Cleanup
                  </h4>
                  <p className="text-[10px] text-red-700 dark:text-red-500/80 font-medium mt-0.5">
                    Clear large datasets if storage is nearing limit.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "CRITICAL WARNING: This will permanently delete ALL attendance records in the database. Ensure you have backed up your data first! Are you absolutely sure?",
                    )
                  ) {
                    if (onClearAttendance) {
                      onClearAttendance();
                    }
                  }
                }}
                className="px-4 py-2 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 bg-white dark:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors w-full sm:w-auto"
              >
                Clear All Attendance
              </button>
            </div>

            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Globe size={16} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-tight text-emerald-500">
                  Connected to Cloud Sync
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">
                  Live
                </span>
              </div>
            </div>

            <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 mt-1">
                  <Database size={16} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest leading-none">
                    Can't see your data?
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                    If you migrated from a legacy system and your workers are missing,
                    please use the{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      Restore Data
                    </span>{" "}
                    button below to upload your data backup JSON.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Backup & Restore */}
        {!isMasterControlLocked && (
          <SettingsCard icon={<Database size={20} />} title="Backup & Restore">
          <div className="space-y-6">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Securely backup all your records including workers and attendance.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex flex-col items-center justify-center p-6 bg-[#F5F5F7] dark:bg-zinc-800 rounded-2xl border border-line dark:border-white/5 hover:border-zinc-900 dark:hover:border-white transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors mb-3">
                  <Download size={20} />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Manual Export
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                  JSON Download
                </span>
              </button>

              <button
                onClick={() => setShowExcelImportModal(true)}
                className="flex flex-col items-center justify-center p-6 bg-[#F5F5F7] dark:bg-zinc-800 rounded-2xl border border-line dark:border-white/5 hover:border-blue-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors mb-3">
                  <Upload size={20} />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Import Excel
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                  Bulk Data Upload
                </span>
              </button>

              <label className="flex flex-col items-center justify-center p-6 bg-[#F5F5F7] dark:bg-zinc-800 rounded-2xl border border-line dark:border-white/5 hover:border-zinc-900 dark:hover:border-white transition-all group cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onRestore(file);
                  }}
                />
                <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors mb-3">
                  <Upload size={20} />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Restore Data
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                  Upload JSON
                </span>
              </label>

              {onRecoverLegacyData && (
                <button
                  onClick={() => setShowRecoverModal(true)}
                  className="flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-900/30 hover:border-blue-600 dark:hover:border-blue-500 transition-all group col-span-1 sm:col-span-2"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-blue-500 group-hover:text-blue-600 transition-colors mb-3">
                    <Database size={20} />
                  </div>
                  <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    Recover Legacy Data
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">
                    Fetch old data from legacy backup
                  </span>
                </button>
              )}

              {onBootstrap && (
                <button
                  onClick={() => setShowBootstrapModal(true)}
                  disabled={isBootstrapping}
                  className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 hover:border-red-600 dark:hover:border-red-500 transition-all group col-span-1 sm:col-span-2"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-red-500 group-hover:text-red-600 transition-colors mb-3">
                    {isBootstrapping ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <RotateCcw size={20} />
                    )}
                  </div>
                  <span className="text-sm font-bold text-red-900 dark:text-red-100">
                    Reset All System Data
                  </span>
                  <span className="text-[10px] text-red-600 dark:text-red-400 uppercase tracking-widest mt-1">
                    {isBootstrapping
                      ? "Resetting..."
                      : "Delete everything and load sample data"}
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <History size={14} className="text-zinc-400" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Backup History
                </span>
              </div>

              <div className="space-y-2">
                {backupHistory
                  .filter((item) => item.type === "Manual")
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime(),
                  )
                  .slice(0, 5)
                  .map((item, index) => (
                    <div
                      key={`backup-${item.id}-${index}`}
                      className="flex items-center justify-between p-3 bg-[#F5F5F7]/50 dark:bg-zinc-950/50 rounded-xl border border-line dark:border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            "bg-emerald-500/10 text-emerald-500",
                          )}
                        >
                          <Database size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">
                            {item.fileName}
                          </div>
                          <div className="text-[9px] text-zinc-400">
                            {new Date(item.timestamp).toLocaleString()} •{" "}
                            {item.size}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                            "bg-emerald-500/10 text-emerald-500",
                          )}
                        >
                          {item.type}
                        </div>
                        {item.data && (
                          <button
                            onClick={() => setRestoreData(item.data!)}
                            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            title="Restore this backup"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                {backupHistory.filter((item) => item.type === "Manual")
                  .length === 0 && (
                  <p className="text-center py-4 text-[10px] text-zinc-400 italic">
                    No manual backup history available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>
        )}

        {/* Master Access Control */}
        <SettingsCard icon={<Shield size={20} />} title="Master Access Control">
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure system-wide protection and authorization settings.
            </p>
            <div className="flex items-center justify-between p-3 bg-[#F5F5F7] dark:bg-zinc-800 rounded-lg border border-line dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Enable Sheet Protection
                </span>
              </div>
              <button
                onClick={() =>
                  handleChange("isProtected", !localSettings.isProtected)
                }
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  localSettings.isProtected
                    ? "bg-zinc-900 dark:bg-white"
                    : "bg-zinc-200 dark:bg-zinc-700",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-3 h-3 bg-white dark:bg-zinc-900 rounded-full transition-all",
                    localSettings.isProtected ? "right-1" : "left-1",
                  )}
                />
              </button>
            </div>

            {localSettings.isProtected && !isMasterControlLocked && (
              <div className="flex items-center justify-between p-3 bg-[#F5F5F7] dark:bg-zinc-800 rounded-lg border border-line dark:border-zinc-700">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Master PIN Code
                  </span>
                </div>
                <input
                  type="password"
                  value={localSettings.masterPin || ""}
                  onChange={(e) => handleChange("masterPin", e.target.value)}
                  placeholder="Enter new PIN"
                  maxLength={10}
                  className="w-32 bg-white dark:bg-zinc-900 border border-line dark:border-zinc-700 rounded-lg text-sm text-center font-bold tracking-widest outline-none focus:ring-zinc-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </SettingsCard>

        {/* Danger Zone */}
        <SettingsCard
          icon={<AlertTriangle size={20} className="text-red-500" />}
          title="Danger Zone"
        >
          <div className="space-y-6">
            <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl text-red-500 shadow-sm">
                  <Trash2 size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                    Clear Attendance History
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-400/80 leading-relaxed font-medium mb-4">
                    This will permanently delete all attendance entries. Your
                    worker list and system settings will be preserved. This
                    action cannot be undone.
                  </p>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete ALL attendance records? This cannot be undone.",
                        )
                      ) {
                        onClearAttendance?.();
                      }
                    }}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95"
                  >
                    Wipe Attendance DB
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>

      {/* Site Deletion Reason Modal */}
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
                  <AlertTriangle size={36} />
                </div>

                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold text-white">
                    Delete Project Site
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-[320px] mx-auto leading-relaxed">
                    Why are you deleting{" "}
                    <span className="font-extrabold text-white">
                      "{siteToDelete}"
                    </span>
                    ? Please provide a reason:
                  </p>
                </div>

                <div className="w-full space-y-3">
                  {[
                    { id: "done", label: "Done / Job finished" },
                    {
                      id: "not_continued",
                      label: "This site is not continued",
                    },
                    { id: "duplicate", label: "Duplicate / Error entry" },
                    { id: "other", label: "Other option" },
                  ].map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                        deleteReason === option.id
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200",
                      )}
                      onClick={() => setDeleteReason(option.id)}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                          deleteReason === option.id
                            ? "border-emerald-500"
                            : "border-zinc-600",
                        )}
                      >
                        {deleteReason === option.id && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-zinc-300">
                        {option.label}
                      </span>
                    </label>
                  ))}

                  {deleteReason === "other" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 w-full"
                    >
                      <textarea
                        placeholder="Type the specific reason here..."
                        value={otherReasonText}
                        onChange={(e) => setOtherReasonText(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 hover:border-zinc-600 outline-none transition-all placeholder:text-zinc-500 text-white min-h-[80px]"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-col w-full gap-3 pt-2">
                  <button
                    onClick={confirmRemoveSite}
                    disabled={
                      deleteReason === "other" && !otherReasonText.trim()
                    }
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

const SettingsCard = ({ icon, title, children }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="glass-card p-10 relative group overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative z-10">
      <div className="flex items-center gap-6 mb-10">
        <div className="w-14 h-14 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-all duration-200 border border-black/5 dark:border-white/5 shadow-2xl group-hover:shadow-emerald-500/20">
          {icon}
        </div>
        <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic font-serif group-hover:translate-x-1 transition-transform duration-200">
          {title}
        </h3>
      </div>
      {children}
    </div>
  </motion.div>
);

const Field = ({ label, children }: any) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-1 font-serif italic">
      {label}
    </label>
    {children}
  </div>
);
