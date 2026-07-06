import React, { useEffect } from "react";
import LZString from "lz-string";
import { StaffInfo } from "./components/StaffInfo";
import { AttendanceSheet } from "./components/AttendanceSheet";
import { AttendanceSelection } from "./components/AttendanceSelection";
import { Dashboard } from "./components/Dashboard";
import { SettingsSheet } from "./components/SettingsSheet";
import { Profile } from "./components/Profile";
import { NotificationPanel } from "./components/NotificationPanel";
import { WorkerModal } from "./components/WorkerModal";
import { SiteManagement } from "./components/SiteManagement";
import { WorkerReports } from "./components/WorkerReports";
import { WorkerDetailModal } from "./components/WorkerDetailModal";
import {
  Worker,
  AttendanceRecord,
  AttendanceStatus,
  SystemSettings,
  User,
  Theme,
  Notification,
  DeleteRequest,
} from "./types";
import { INITIAL_WORKERS, generateInitialAttendance } from "./data/initialData";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Settings,
  Bell,
  LogOut,
  Shield,
  Moon,
  Sun,
  User as UserIcon,
  Search,
  X,
  FileText,
  Database,
  Calculator,
  ShoppingCart,
  UserX,
  AlertCircle,
  Globe,
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  Wallet,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, deduplicateAttendanceRecords } from "./lib/utils";
import { ConstructionCalculator } from "./components/ConstructionCalculator";
import { LabourCard } from "./components/LabourCard";
import { AbsentWorkers } from "./components/AbsentWorkers";
import { AccountsModule } from "./components/AccountsModule";

import { BackupData, BackupHistoryItem } from "./types";
import { generateBackup } from "./lib/backupService";
import { logActivity } from "./lib/activity-logger";
import { supabase } from "./lib/supabase";
import { WHATSAPP_ATTENDANCE } from "./data/whatsappData";

import { ConfirmationModal } from "./components/ConfirmationModal";

const DEFAULT_PORTAL_ID = "FahimKhan_Portal";

/**
 * Sanitizes settings to remove any case-insensitive duplicates of project sites and companies.
 * It also trims trailing and leading whitespaces.
 */
function sanitizeSettings(config: SystemSettings): SystemSettings {
  if (!config) return config;

  const uniqueProjectSites: string[] = [];
  const siteMap = new Map<string, string>(); // lowercase -> canonical trimmed name
  const rawSites = config.projectSites || [];
  
  rawSites.forEach(site => {
    const trimmed = (site || "").trim();
    if (!trimmed) return;
    const lowerKey = trimmed.toLowerCase();
    if (!siteMap.has(lowerKey)) {
      siteMap.set(lowerKey, trimmed);
      uniqueProjectSites.push(trimmed);
    }
  });

  const uniqueCompanies: string[] = [];
  const companyMap = new Map<string, string>(); // lowercase -> canonical trimmed name
  const rawCompanies = config.companies || [];

  rawCompanies.forEach(company => {
    const trimmed = (company || "").trim();
    if (!trimmed) return;
    const lowerKey = trimmed.toLowerCase();
    if (!companyMap.has(lowerKey)) {
      companyMap.set(lowerKey, trimmed);
      uniqueCompanies.push(trimmed);
    }
  });

  // Re-map site-keyed maps to canonical names
  const newSiteSettings: Record<string, any> = {};
  if (config.siteSettings) {
    Object.entries(config.siteSettings).forEach(([siteName, sSettings]) => {
      const trimmed = (siteName || "").trim();
      const canonicalName = siteMap.get(trimmed.toLowerCase()) || trimmed;
      newSiteSettings[canonicalName] = sSettings;
    });
  }

  const newSiteRates: Record<string, number> = {};
  if (config.siteRates) {
    Object.entries(config.siteRates).forEach(([siteName, rate]) => {
      const trimmed = (siteName || "").trim();
      const canonicalName = siteMap.get(trimmed.toLowerCase()) || trimmed;
      newSiteRates[canonicalName] = rate;
    });
  }

  const newSiteMinChargeHours: Record<string, number> = {};
  if (config.siteMinChargeHours) {
    Object.entries(config.siteMinChargeHours).forEach(([siteName, hours]) => {
      const trimmed = (siteName || "").trim();
      const canonicalName = siteMap.get(trimmed.toLowerCase()) || trimmed;
      newSiteMinChargeHours[canonicalName] = hours;
    });
  }

  // Re-map siteGroups members as well
  const newSiteGroups: Record<string, string[]> = {};
  if (config.siteGroups) {
    Object.entries(config.siteGroups).forEach(([groupName, groupSites]) => {
      const uniqueGroupSites: string[] = [];
      const seenGroupSites = new Set<string>();
      if (Array.isArray(groupSites)) {
        groupSites.forEach(site => {
          const trimmed = (site || "").trim();
          if (!trimmed) return;
          const lowerKey = trimmed.toLowerCase();
          const canonicalName = siteMap.get(lowerKey) || trimmed;
          if (!seenGroupSites.has(lowerKey)) {
            seenGroupSites.add(lowerKey);
            uniqueGroupSites.push(canonicalName);
          }
        });
      }
      newSiteGroups[groupName] = uniqueGroupSites;
    });
  }

  return {
    ...config,
    projectSites: uniqueProjectSites,
    companies: uniqueCompanies,
    siteSettings: newSiteSettings,
    siteRates: newSiteRates,
    siteMinChargeHours: newSiteMinChargeHours,
    siteGroups: newSiteGroups
  };
}

export default function App() {
  const [settings, setSettings] = React.useState<SystemSettings>({
    systemName: "portal",
    systemCreator: "Mohammed Fahim Khan",
    companyName: "Project portal",
    payrollMonth: "April",
    payrollYear: 2026,
    totalWorkingDays: 30,
    standardWorkingHours: 9,
    defaultOTRate: 10,
    salaryMethod: "PerDayWage",
    maxPaidLeave: 2,
    currency: "AED",
    roundingRule: "TwoDecimals",
    taxPercentage: 0,
    vatPercentage: 5, // Default UAE VAT 5%
    bonusPercentage: 0,
    isProtected: false,
    masterPin: "8974",
    dashboardFilterCompany: "All",
    dashboardFilterDepartment: "All",
    projectSites: [
      "SPT Villa number 13",
      "SPT Villa",
      "SPT Palm Jumeirah",
      "SP D1",
      "SPD Villa",
      "Dubai Hills, villa number 13",
      "Jafza Jabel Ali",
      "Fujairah",
      "Dubai Team Fujairah",
      "Dubai festibel city",
    ],
    siteGroups: {
      "SPT Sites": [
        "SPT Villa number 13",
        "SPT Villa",
        "SPT Palm Jumeirah",
        "SP D1",
      ],
      "SPD Sites": ["SPD Villa", "Dubai Hills, villa number 13"],
    },
    companies: ["CONTRACTING", "SAMA", "CLEANING", "CALIPHX", "AAF", "DUTCO"],
  });

  const [currentUser, setCurrentUser] = React.useState<User | null>({
    id: "FahimKhan_Admin",
    username: "mohammed.fahim",
    name: "Mohammed Fahim Khan",
    role: "Admin",
    email: "mohammed.fahim8974@gmail.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fahim",
  });
  const [isAuthReady, setIsAuthReady] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [syncStatus, setSyncStatus] = React.useState<
    "IDLE" | "FETCHING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [lastFetchError, setLastFetchError] = React.useState<string | null>(
    null,
  );
  const [showForceLoad, setShowForceLoad] = React.useState(false);

  const handleLogout = React.useCallback(async () => {
    // Auth system removed - manual logout disabled
    console.log("Authorization system disabled.");
  }, []);

  React.useEffect(() => {
    // Log login activity when user becomes authenticated
    if (currentUser) {
      logActivity("LOGIN", "SYSTEM", `User ${currentUser.name} signed in`);
    }
  }, [currentUser]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowForceLoad(true);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const [theme, setTheme] = React.useState<Theme>(() => {
    try {
      return (localStorage.getItem("portal_theme") as Theme) || "dark";
    } catch (e) {
      return "dark";
    }
  });

  const [dbProvider, setDbProvider] = React.useState<"supabase" | "local">("supabase");

  const [portalId, setPortalId] = React.useState<string>(() => {
    try {
      return localStorage.getItem("portal_id") || DEFAULT_PORTAL_ID;
    } catch (e) {
      return DEFAULT_PORTAL_ID;
    }
  });
  const [activeTab, setActiveTab] = React.useState<
    | "dashboard"
    | "master"
    | "attendance"
    | "calculator"
    | "absent-workers"
    | "settings"
    | "profile"
    | "sites"
    | "worker-reports"
    | "labour-card"
    | "accounts"
  >("dashboard");
  const [attendanceSelection, setAttendanceSelection] = React.useState<{
    type: "company" | "site";
    value: string;
  } | null>(null);
  const [selectedWorkerIdForLabourCard, setSelectedWorkerIdForLabourCard] =
    React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState(new Date());
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUniversalSearch, setShowUniversalSearch] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([
    {
      id: "1",
      title: "Payroll Generated",
      message: "The payroll for March 2026 has been successfully generated.",
      time: "2h ago",
      read: false,
      type: "success",
    },
    {
      id: "2",
      title: "New Worker Joined",
      message: "A new worker, John Doe, has been added to the database.",
      time: "5h ago",
      read: false,
      type: "info",
    },
    {
      id: "3",
      title: "System Update",
      message: "portal v2.4 is now live with new reporting features.",
      time: "1d ago",
      read: true,
      type: "info",
    },
  ]);
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [globalSearch, setGlobalSearch] = React.useState("");
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = React.useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedGlobalSearch(globalSearch);
    }, 150);
    return () => clearTimeout(handler);
  }, [globalSearch]);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = React.useState(false);
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([]);
  const [backupHistory, setBackupHistory] = React.useState<BackupHistoryItem[]>(
    [],
  );
  const [editingWorker, setEditingWorker] = React.useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = React.useState<Worker | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = React.useState(false);
  const [selectedWorkerForDetail, setSelectedWorkerForDetail] =
    React.useState<Worker | null>(null);
  const [isWorkerDetailModalOpen, setIsWorkerDetailModalOpen] =
    React.useState(false);
  const [dataHealth, setDataHealth] = React.useState<{
    attendanceSize: number;
    workersSize: number;
    settingsSize: number;
    accountsSize: number;
    attendanceCount: number;
    workersCount: number;
    accountsCount: number;
    isNearLimit: boolean;
  }>({
    attendanceSize: 0,
    workersSize: 0,
    settingsSize: 0,
    accountsSize: 0,
    attendanceCount: 0,
    workersCount: 0,
    accountsCount: 0,
    isNearLimit: false,
  });

  // Master Control States
  const [isMasterUnlocked, setIsMasterUnlocked] = React.useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = React.useState<boolean>(false);
  const [pinInput, setPinInput] = React.useState<string>("");
  const [pinError, setPinError] = React.useState<boolean>(false);

  const settingsClickCount = React.useRef(0);
  const lastSettingsClickTime = React.useRef(0);

  const handleSettingsClick = React.useCallback(() => {
    const now = Date.now();
    if (now - lastSettingsClickTime.current > 2000) {
      settingsClickCount.current = 0;
    }
    lastSettingsClickTime.current = now;
    settingsClickCount.current += 1;

    setActiveTab("settings");

    if (settingsClickCount.current >= 5) {
      if (isMasterUnlocked) {
        setIsMasterUnlocked(false);
      } else {
        setIsPinModalOpen(true);
      }
      settingsClickCount.current = 0;
    }
  }, [isMasterUnlocked]);

  const isMasterControlLocked = settings.isProtected && !isMasterUnlocked;

  const handleVerifyPin = React.useCallback(() => {
    const requiredPin = settings.masterPin || "8974";
    if (pinInput === requiredPin) {
      setIsMasterUnlocked(true);
      setIsPinModalOpen(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
    }
  }, [pinInput, settings.masterPin]);

  // Handle Theme application
  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("portal_theme", theme);
  }, [theme]);


  // Monitor data health - debounced to avoid performance hits
  React.useEffect(() => {
    if (activeTab !== "settings") {
      // Just update counts quickly, skip heavy JSON parsing and Blob building
      setDataHealth((prev) => ({
        ...prev,
        attendanceCount: attendance.length,
        workersCount: workers.length,
        accountsCount: workers.reduce((sum, w) => sum + (w.advancePayments?.length || 0), 0),
      }));
      return;
    }

    const timer = setTimeout(() => {
      try {
        const attendanceStr = JSON.stringify(attendance);
        const workersStr = JSON.stringify(workers);
        const settingsStr = JSON.stringify(settings);
        
        // Sum all worker advance payments (ledger rows) to track size and count
        const allAccounts = workers.flatMap(w => w.advancePayments || []);
        const accountsStr = JSON.stringify(allAccounts);

        const attendanceSize = new Blob([attendanceStr]).size;
        const workersSize = new Blob([workersStr]).size;
        const settingsSize = new Blob([settingsStr]).size;
        const accountsSize = new Blob([accountsStr]).size;

        const attendanceCount = attendance.length;
        const workersCount = workers.length;
        const accountsCount = allAccounts.length;

        const totalSize = attendanceSize + workersSize + settingsSize + accountsSize;
        const isNearLimit = totalSize > 4 * 1024 * 1024; // 4MB

        setDataHealth({
          attendanceSize,
          workersSize,
          settingsSize,
          accountsSize,
          attendanceCount,
          workersCount,
          accountsCount,
          isNearLimit,
        });
      } catch (e) {
        setDataHealth((prev) => ({
          ...prev,
          attendanceCount: attendance.length,
          workersCount: workers.length,
          accountsCount: workers.reduce((sum, w) => sum + (w.advancePayments?.length || 0), 0),
        }));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [attendance, workers, settings, activeTab]);

  const [dataLoaded, setDataLoaded] = React.useState({
    workers: false,
    attendance: false,
    settings: false,
  });

  const [isBootstrapping, setIsBootstrapping] = React.useState(false);
  const [quotaExceeded, setQuotaExceeded] = React.useState(false);
  const [isMonthUnlocked, setIsMonthUnlocked] = React.useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = React.useState("");
  const hasAutoBootstrapped = React.useRef(false);

  const isMonthLocked = React.useMemo(() => {
    if (isMonthUnlocked) return false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const selMonth = selectedMonth.getMonth();
    const selYear = selectedMonth.getFullYear();

    // Lock if selected month is in the past
    if (selYear < currentYear) return true;
    if (selYear === currentYear && selMonth < currentMonth) return true;
    return false;
  }, [selectedMonth, isMonthUnlocked]);

  // Reset unlock status when month changes
  React.useEffect(() => {
    setIsMonthUnlocked(false);
  }, [selectedMonth]);

  // Unified Data Fetching & Real-Time Syncing
  React.useEffect(() => {
    let isDataFetched = false;
    let unsubWorkers = () => {};
    let unsubAttendance = () => {};
    let unsubSettings = () => {};

    const fetchData = async () => {
      console.log(`Starting data fetch (Workspace: ${portalId})...`);
      setSyncStatus("FETCHING");
      setLastFetchError(null);

      const timeoutId = setTimeout(() => {
        if (!isDataFetched) {
          console.warn("Data fetch timed out. Forcing dashboard access.");
          setIsLoading(false);
        }
      }, 8000);

      try {
        const extractPayload = (payload: any) => {
          if (!payload) return null;
          if (payload._compressed) {
            try {
              return JSON.parse(LZString.decompressFromBase64(payload._compressed) || "{}");
            } catch (e) {
              console.error("Decompression failed", e);
              return null;
            }
          }
          return payload;
        };

        if (dbProvider === "local") {
          const localWorkers = localStorage.getItem(`portal_${portalId}_workers`);
          const localAttendance = localStorage.getItem(`portal_${portalId}_attendance`);
          const localSettings = localStorage.getItem(`portal_${portalId}_settings`);
          
          if (localWorkers) {
            try {
              let parse = JSON.parse(localWorkers);
              parse = extractPayload(parse) || parse;
              setWorkers(parse.list || []);
            } catch (pE) {
              setWorkers([]);
            }
          } else {
            setWorkers([]);
          }
          setDataLoaded((prev) => ({ ...prev, workers: true }));
  
          if (localAttendance) {
            try {
              let parse = JSON.parse(localAttendance);
              parse = extractPayload(parse) || parse;
              let hasBadDates = false;
              const cleanedList = (parse.list || [])
                .filter((record: any) => {
                  return (
                    record &&
                    typeof record.date === "string" &&
                    record.date.length >= 8 &&
                    record.date !== "NaN-NaN-NaN"
                  );
                })
                .map((record: any) => {
                  if (record.date && typeof record.date === "string") {
                    const parts = record.date.split("-");
                    if (parts.length === 3 && parseInt(parts[0]) < 2000) {
                      parts[0] = new Date().getFullYear().toString();
                      hasBadDates = true;
                      return { ...record, date: parts.join("-") };
                    }
                  }
                  return record;
                });
  
              setAttendance(deduplicateAttendanceRecords(cleanedList));
            } catch (pE) {
              setAttendance([]);
            }
          } else {
            setAttendance([]);
          }
          setDataLoaded((prev) => ({ ...prev, attendance: true }));
  
          if (localSettings) {
            try {
              let parse = JSON.parse(localSettings);
              parse = extractPayload(parse) || parse;
              setSettings(sanitizeSettings(parse.config || {}));
            } catch (pE) {}
          }
          setDataLoaded((prev) => ({ ...prev, settings: true }));
  
          clearTimeout(timeoutId);
          isDataFetched = true;
          setSyncStatus("SUCCESS");
          setIsLoading(false);
          console.log("Local storage data load complete.");
        } else if (dbProvider === "supabase") {
          // Fetch workers
          const { data: wData, error: wError } = await supabase
            .from("shared_data")
            .select("payload")
            .eq("portal_id", portalId)
            .eq("data_key", "workers")
            .maybeSingle();

          if (wError) console.warn("Supabase fetch workers error:", wError);
          const wPayload = extractPayload(wData?.payload);
          if (wPayload?.list) {
            setWorkers(wPayload.list);
          } else {
            setWorkers([]);
          }
          setDataLoaded((prev) => ({ ...prev, workers: true }));

          // Fetch attendance
          const { data: aData, error: aError } = await supabase
            .from("shared_data")
            .select("payload")
            .eq("portal_id", portalId)
            .eq("data_key", "attendance")
            .maybeSingle();

          if (aError) console.warn("Supabase fetch attendance error:", aError);
          const aPayload = extractPayload(aData?.payload);
          if (aPayload?.list) {
            setAttendance(deduplicateAttendanceRecords(aPayload.list));
          } else {
            setAttendance([]);
          }
          setDataLoaded((prev) => ({ ...prev, attendance: true }));

          // Fetch settings
          const { data: sData, error: sError } = await supabase
            .from("shared_data")
            .select("payload")
            .eq("portal_id", portalId)
            .eq("data_key", "settings")
            .maybeSingle();

          if (sError) console.warn("Supabase fetch settings error:", sError);
          const sPayload = extractPayload(sData?.payload);
          if (sPayload?.config) {
            setSettings(sanitizeSettings(sPayload.config));
          }
          setDataLoaded((prev) => ({ ...prev, settings: true }));

          clearTimeout(timeoutId);
          isDataFetched = true;
          setSyncStatus("SUCCESS");
          setIsLoading(false);
          console.log("Supabase fetch complete.");
        }

      } catch (err: any) {
        console.error("Fetch/Sync exception:", err);
        setLastFetchError(
          `Connection Interrupted: ${err instanceof Error ? err.message : String(err)}`,
        );
        setSyncStatus("ERROR");
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      unsubWorkers();
      unsubAttendance();
      unsubSettings();
    };
  }, [portalId, dbProvider]);

  const handleError = React.useCallback(
    (error: any, op: string, path: string) => {
      console.error(`Local Storage Error [${op}] at [${path}]:`, error);
      setNotifications((prev) => [
        {
          id: "local_err_" + Date.now(),
          title: "Storage Error",
          message: `There was a problem saving data: ${error.message || String(error)}`,
          time: "Just now",
          read: false,
          type: "warning"
        },
        ...prev
      ]);
    },
    [],
  );

  // Use a ref to store active timeouts for debouncing database writes
  const saveTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({});
  const lastSavedContent = React.useRef<Record<string, string>>({});

  const saveData = React.useCallback(
    async (key: string, data: any) => {
      const dataStr = JSON.stringify(data);
      if (lastSavedContent.current[key] === dataStr) {
        return; // Skip if data hasn't actually changed
      }

      if (saveTimeouts.current[key]) {
        clearTimeout(saveTimeouts.current[key]);
      }

      saveTimeouts.current[key] = setTimeout(async () => {
        try {
          const compressed = LZString.compressToBase64(dataStr);
          if (dbProvider === "local") {
            localStorage.setItem(`portal_${portalId}_${key}`, JSON.stringify({ _compressed: compressed }));
          } else if (dbProvider === "supabase") {
            const { error } = await supabase.from("shared_data").upsert({
              portal_id: portalId,
              data_key: key,
              payload: { _compressed: compressed },
              updated_at: new Date().toISOString()
            });
            if (error) throw error;
          }
          lastSavedContent.current[key] = dataStr;
        } catch (e: any) {
          handleError(e, "upsert", `shared_data/${portalId}_${key}`);
        }
      }, 1000);
    },
    [handleError, portalId, dbProvider],
  );

  const isAdmin = currentUser?.role === "Admin";
  const isManager =
    currentUser?.role === "Admin" || currentUser?.role === "Manager";

  const handleUpdateAttendance = React.useCallback(
    async (newAttendance: AttendanceRecord[]) => {
      // Deduplicate before saving
      const uniqueAttendance = deduplicateAttendanceRecords(newAttendance);
      setAttendance(uniqueAttendance);

      try {
        await saveData("attendance", { list: uniqueAttendance });
        logActivity("UPDATE", "ATTENDANCE", "Updated attendance records");
      } catch (error) {
        handleError(error, "save", "attendance");
      }
    },
    [saveData],
  );

  const handleUpdateAttendanceRecord = React.useCallback(
    async (id: string, updates: Partial<AttendanceRecord>) => {
      setAttendance((prevAttendance) => {
        const updatedAttendance = prevAttendance.map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        );
        const uniqueAttendance = deduplicateAttendanceRecords(updatedAttendance);
        saveData("attendance", { list: uniqueAttendance }).catch((e) =>
          handleError(e, "save", "attendance"),
        );
        return uniqueAttendance;
      });
    },
    [saveData, handleError],
  );

  const handleUpdateSettings = React.useCallback(
    async (newSettings: SystemSettings) => {
      const sanitized = sanitizeSettings(newSettings);
      setSettings(sanitized);
      try {
        await saveData("settings", { config: sanitized });
        logActivity("UPDATE", "SETTINGS", "Updated system settings");
      } catch (error) {
        handleError(error, "save", "settings");
      }
    },
    [saveData],
  );

  const handleAddAttendance = React.useCallback(
    async (newRecord: AttendanceRecord) => {
      setAttendance((prev) => {
        const updatedAttendance = [newRecord, ...prev];
        const uniqueAttendance = deduplicateAttendanceRecords(updatedAttendance);
        saveData("attendance", { list: uniqueAttendance }).catch((e) =>
          handleError(e, "save", "attendance"),
        );
        return uniqueAttendance;
      });
    },
    [saveData, handleError],
  );

  const handleDeleteAttendanceRecord = React.useCallback(
    async (id: string) => {
      setAttendance((prev) => {
        const updatedAttendance = prev.filter((r) => r.id !== id);
        saveData("attendance", { list: updatedAttendance }).catch((e) =>
          handleError(e, "save", "attendance"),
        );
        return updatedAttendance;
      });
    },
    [saveData, handleError],
  );

  const handleManualBackup = React.useCallback(async (scope: 'all' | 'period' = 'all', filters?: { year: number; month?: number | null }) => {
    let filteredAttendance = attendance;
    let label: string | undefined = undefined;

    if (scope === 'period' && filters) {
      const { year, month } = filters;
      if (month !== null && month !== undefined) {
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        filteredAttendance = attendance.filter(r => r.date && r.date.startsWith(prefix));
        label = `${year}_${String(month + 1).padStart(2, '0')}`;
      } else {
        const prefix = `${year}-`;
        filteredAttendance = attendance.filter(r => r.date && r.date.startsWith(prefix));
        label = `${year}`;
      }
    }

    const backupData = generateBackup(workers, filteredAttendance, settings);

    try {
      const { downloadBackup } = await import("./lib/backupService");
      downloadBackup(backupData, label);
    } catch (e) {
      console.error("Failed to trigger local download:", e);
    }

    try {
      localStorage.setItem(`portal_${portalId}_backup`, JSON.stringify({
        ...backupData,
        name: label 
          ? `Period Export (${label}) - ${new Date().toLocaleDateString()}` 
          : `Manual Backup - ${new Date().toLocaleDateString()}`,
        type: "Manual",
        updated_at: new Date().toISOString()
      }));

      logActivity("BACKUP", "SYSTEM", label ? `Created period export (${label})` : "Created manual system backup");

      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: label ? "Period Export Saved" : "Backup Saved",
          message: label
            ? `Data for ${label} has been exported cleanly.`
            : "Your system data has been safely backed up.",
          time: "Just now",
          read: false,
          type: "success",
        },
        ...prev,
      ]);
    } catch (error) {
      handleError(error, "save", "backup");
    }
  }, [workers, attendance, settings, saveData]);

  const handleBootstrapData = React.useCallback(
    async (showConfirm = true) => {
      if (
        showConfirm &&
        typeof window !== "undefined" &&
        !window.confirm(
          "This will reset all data to initial DB values. Are you sure?",
        )
      )
        return;

      setIsBootstrapping(true);
      try {
        const initialAttendance = [
          ...WHATSAPP_ATTENDANCE,
          ...generateInitialAttendance(INITIAL_WORKERS),
        ];

        await Promise.all([
          saveData("workers", { list: INITIAL_WORKERS }),
          saveData("attendance", { list: initialAttendance }),
          saveData("settings", { config: settings }),
          saveData("init", {
            initializedAt: new Date().toISOString(),
            bootstrapped: true,
          }),
        ]);

        logActivity("RESTORE", "SYSTEM", "Reset system to default data");

        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: "System Reset",
            message: "All data has been reset to default sample data.",
            time: "Just now",
            read: false,
            type: "success",
          },
          ...prev,
        ]);
      } catch (error) {
        handleError(error, "bootstrap", "reset");
      } finally {
        setIsBootstrapping(false);
      }
    },
    [settings, saveData],
  );

  const handleClearAttendance = React.useCallback(async () => {
    setAttendance([]);
    saveData("attendance", { list: [] }).catch((e) =>
      handleError(e, "clear", "attendance"),
    );
    logActivity("DELETE", "SYSTEM", "Cleared all attendance records");
    setNotifications((prev) => [
      {
        id: Date.now().toString(),
        title: "Database Cleared",
        message: "All attendance records have been successfully deleted.",
        time: "Just now",
        read: false,
        type: "success",
      },
      ...prev,
    ]);
  }, [handleUpdateAttendance]);

  const handleImportAttendance = React.useCallback(
    async (newRecords: AttendanceRecord[]) => {
      // Merge new records with existing attendance
      setAttendance((prev) => {
        const merged = [...prev, ...newRecords];
        // Sort for neatness
        merged.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        saveData("attendance", { list: merged }).catch((e) =>
          handleError(e, "upload", "attendance"),
        );
        return merged;
      });
      logActivity(
        "CREATE",
        "SYSTEM",
        `Imported ${newRecords.length} attendance records from Excel`,
      );
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: "Import Successful",
          message: `Successfully imported ${newRecords.length} attendance records from Excel.`,
          time: "Just now",
          read: false,
          type: "success",
        },
        ...prev,
      ]);
    },
    [handleUpdateAttendance],
  );

  const handleManualCleanup = React.useCallback(async () => {
    if (workers.length === 0) return;

    const uniqueWorkersMap = new Map<string, Worker>();
    const workerNumberToCanonicalId = new Map<string, string>();
    const duplicateIds = new Set<string>();
    const nameToCanonicalId = new Map<string, string>();

    let mergedCount = 0;

    workers.forEach((worker) => {
      const numKey = worker.workerNumber
        ? worker.workerNumber.toLowerCase().trim()
        : "";
      const nameKey = worker.name.toLowerCase().trim();

      if (numKey && numKey !== "") {
        if (!uniqueWorkersMap.has(numKey)) {
          uniqueWorkersMap.set(numKey, worker);
          workerNumberToCanonicalId.set(numKey, worker.id);
          nameToCanonicalId.set(nameKey, worker.id);
        } else {
          duplicateIds.add(worker.id);
          mergedCount++;
        }
      } else if (nameKey && nameKey !== "") {
        if (!nameToCanonicalId.has(nameKey)) {
          nameToCanonicalId.set(nameKey, worker.id);
        } else {
          duplicateIds.add(worker.id);
          mergedCount++;
        }
      }
    });

    if (mergedCount > 0) {
      const cleanedWorkers = workers.filter((w) => !duplicateIds.has(w.id));

      const updatedAttendance = attendance.map((record) => {
        let updatedWorkerIds =
          record.workerIds?.map((id) => {
            const worker = workers.find((w) => w.id === id);
            if (!worker) return id;

            let canonicalId = worker.id;
            const numKey = worker.workerNumber
              ? worker.workerNumber.toLowerCase().trim()
              : "";
            const nameKey = worker.name.toLowerCase().trim();

            if (numKey && numKey !== "") {
              canonicalId = workerNumberToCanonicalId.get(numKey) || worker.id;
            } else if (nameKey && nameKey !== "") {
              canonicalId = nameToCanonicalId.get(nameKey) || worker.id;
            }
            return canonicalId;
          }) || [];

        updatedWorkerIds = Array.from(new Set(updatedWorkerIds));

        return { ...record, workerIds: updatedWorkerIds };
      });

      try {
        await Promise.all([
          saveData("workers", { list: cleanedWorkers }),
          saveData("attendance", { list: updatedAttendance }),
        ]);

        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: "Cleanup Successful",
            message: `Successfully merged ${mergedCount} duplicate worker records.`,
            time: "Just now",
            read: false,
            type: "success",
          },
          ...prev,
        ]);
      } catch (error) {
        handleError(error, "save", "cleanup");
      }
    } else {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: "Cleanup Complete",
          message: "No duplicate workers found.",
          time: "Just now",
          read: false,
          type: "info",
        },
        ...prev,
      ]);
    }
  }, [workers, attendance]);

  const workerTaskQueue = React.useRef<Promise<any>>(Promise.resolve());

  const handleEditWorker = React.useCallback((worker: Worker) => {
    setEditingWorker(worker);
    setIsWorkerModalOpen(true);
  }, []);

  const handleViewWorkerDetail = React.useCallback((worker: Worker) => {
    setSelectedWorkerForDetail(worker);
    setIsWorkerDetailModalOpen(true);
  }, []);

  const handleAddWorker = React.useCallback(() => {
    // Bulletproof unique ID generation (Time + Random String)
    const uniqueId = `worker-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    let nextWorkerNumber = "";
    if (workers && workers.length > 0) {
      let maxNum = 0;
      workers.forEach(w => {
        const num = parseInt(w.workerNumber, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });
      if (maxNum > 0) {
        nextWorkerNumber = (maxNum + 1).toString();
      }
    }

    const defaultWorker: Worker = {
      id: uniqueId,
      workerNumber: nextWorkerNumber,
      name: "",
      role: "",
      company: "",
      department: "",
      monthlySalary: 0,
      otRatePerHour: 0,
      status: "Active",
      joiningDate: new Date().toISOString().split("T")[0],
      sheetName: "Main Sheet",
      assignedSites: [],
    };
    setEditingWorker(defaultWorker);
    setIsWorkerModalOpen(true);
  }, [workers]);

  // Removed handleEditWorker

  const handleSaveWorker = React.useCallback(
    async (worker: Worker) => {
      workerTaskQueue.current = workerTaskQueue.current.then(async () => {
        try {
          if (!worker.id) throw new Error("Worker ID is missing");
          const workerId = worker.id;
          const workerWithId = { ...worker };
          const workerNumStr = worker.workerNumber
            ? String(worker.workerNumber).toLowerCase()
            : "";

          // Functional update to get latest state
          let finalUpdatedWorkers: Worker[] = [];

          await new Promise<void>((resolve) => {
            setWorkers((prevWorkers) => {
              let calculatedWorkers: Worker[];
              const duplicateNumber = prevWorkers.find(
                (w) =>
                  w.workerNumber &&
                  String(w.workerNumber).toLowerCase() === workerNumStr &&
                  w.id !== workerId,
              );

              if (duplicateNumber) {
                const newSites = worker.assignedSites || [];
                const existingSites = duplicateNumber.assignedSites || [];
                const mergedSites = Array.from(
                  new Set([...existingSites, ...newSites]),
                );

                const updatedWorker = {
                  ...workerWithId,
                  id: duplicateNumber.id,
                  assignedSites: mergedSites,
                };

                const existingWorkerIndex = prevWorkers.findIndex(
                  (w) => w.id === duplicateNumber.id,
                );
                calculatedWorkers = [...prevWorkers];
                calculatedWorkers[existingWorkerIndex] = updatedWorker;
                finalUpdatedWorkers = calculatedWorkers;
              } else {
                const existingWorkerIndex = prevWorkers.findIndex(
                  (w) => w.id === workerId,
                );

                if (existingWorkerIndex >= 0) {
                  calculatedWorkers = [...prevWorkers];
                  calculatedWorkers[existingWorkerIndex] = workerWithId;
                  finalUpdatedWorkers = calculatedWorkers;
                } else {
                  calculatedWorkers = [...prevWorkers, workerWithId];
                  finalUpdatedWorkers = calculatedWorkers;
                }
              }
              resolve();
              return calculatedWorkers;
            });
          });

          await saveData("workers", { list: finalUpdatedWorkers });
          logActivity(
            worker.id ? "UPDATE" : "CREATE",
            "WORKER",
            `Saved worker: ${worker.name}`,
          );

          setIsWorkerModalOpen(false);
          setEditingWorker(null);
        } catch (error) {
          handleError(error, "save", "worker");
        }
      });
    },
    [saveData],
  );

  const handleDeleteWorker = React.useCallback(
    (id: string) => {
      const worker = workers.find((w) => w.id === id);
      if (worker) {
        setWorkerToDelete(worker);
        setIsDeleteModalOpen(true);
      }
    },
    [workers],
  );

  const confirmDeleteWorker = React.useCallback(async () => {
    if (!workerToDelete) return;
    const id = workerToDelete.id;
    const workerName = workerToDelete.name;

    const updatedWorkers = workers.filter((w) => w.id !== id);
    setWorkers(updatedWorkers);
    saveData("workers", { list: updatedWorkers })
      .then(() =>
        logActivity(
          "DELETE",
          "WORKER",
          `Deleted worker: ${workerName} (${id})`,
        ),
      )
      .catch((e) => handleError(e, "delete", "worker"));

    const updatedAttendance = attendance.map((a) => {
      if (a.workerIds?.includes(id)) {
        return { ...a, workerIds: a.workerIds.filter((wId) => wId !== id) };
      }
      return a;
    });
    setAttendance(updatedAttendance);
    saveData("attendance", { list: updatedAttendance }).catch((e) =>
      handleError(e, "save", "attendance"),
    );

    setWorkerToDelete(null);
    setIsDeleteModalOpen(false);
  }, [workerToDelete, workers, attendance, saveData]);

  const handleDeleteAllWorkers = React.useCallback(async () => {
    setIsDeleteAllModalOpen(true);
  }, []);

  const confirmDeleteAllWorkers = React.useCallback(async () => {
    setWorkers([]);
    saveData("workers", { list: [] }).catch((e) =>
      handleError(e, "clear", "workers"),
    );
    setAttendance([]);
    saveData("attendance", { list: [] }).catch((e) =>
      handleError(e, "clear", "attendance"),
    );
    setIsDeleteAllModalOpen(false);
  }, [saveData]);

  const handleUpdateWorkers = React.useCallback(
    async (updatedWorkersList: Worker[]) => {
      setWorkers(updatedWorkersList);
      try {
        await saveData("workers", { list: updatedWorkersList });
        logActivity(
          "UPDATE",
          "WORKER",
          `Batch updated worker records/company assignments`
        );
      } catch (error) {
        handleError(error, "save", "workers");
        throw error;
      }
    },
    [saveData, handleError]
  );

  const handleDeleteRequest = React.useCallback(async (request: Omit<DeleteRequest, 'id' | 'requestDate' | 'status'>) => {
    const newRequest: DeleteRequest = {
      ...request,
      id: Math.random().toString(36).substr(2, 9),
      requestDate: new Date().toISOString(),
      status: 'PENDING'
    };
    
    const updatedSettings = {
      ...settings,
      deleteRequests: [...(settings.deleteRequests || []), newRequest]
    };
    
    await handleUpdateSettings(updatedSettings);
    alert("Delete request submitted for approval.");
  }, [settings, handleUpdateSettings]);

  const handleApproveDeleteRequest = React.useCallback(async (request: DeleteRequest) => {
    try {
      let currentSettings = { ...settings };

      if (request.type === 'WORKER') {
        await handleDeleteWorker(request.targetId);
      } else if (request.type === 'LEDGER_ENTRY') {
        const worker = workers.find(w => w.id === request.parentId);
        if (worker) {
          const updatedPayments = (worker.advancePayments || []).filter(p => p.id !== request.targetId);
          await handleSaveWorker({ ...worker, advancePayments: updatedPayments });
        }
      } else if (request.type === 'PETTY_CASH_TX') {
         const tx = (settings.pettyCashTransactions || []).find(t => t.id === request.targetId);
         if (tx) {
           let updatedWallets = [...(settings.managerWallets || [])];
           let updatedTransactions = (settings.pettyCashTransactions || []).filter(t => t.id !== request.targetId);
           const wallet = updatedWallets.find(w => w.id === tx.managerId);
           if (wallet) {
             let balanceAdjustment = 0;
             if (tx.type === 'TOPUP' || tx.type === 'MANUAL_CREDIT') {
               balanceAdjustment = -tx.amount;
             } else if (tx.type === 'MANUAL_DEBIT') {
               balanceAdjustment = tx.amount;
             }
             updatedWallets = updatedWallets.map(w => 
               w.id === tx.managerId 
                 ? { ...w, balance: w.balance + balanceAdjustment, updatedAt: new Date().toISOString() } 
                 : w
             );
           }
           currentSettings.managerWallets = updatedWallets;
           currentSettings.pettyCashTransactions = updatedTransactions;
         }
      } else if (request.type === 'SITE') {
         const updatedSites = (settings.projectSites || []).filter(s => s !== request.targetId);
         const newSiteSettings = { ...(settings.siteSettings || {}) };
         delete newSiteSettings[request.targetId];
         currentSettings.projectSites = updatedSites;
         currentSettings.siteSettings = newSiteSettings;
      }

      const updatedRequests = (currentSettings.deleteRequests || []).filter(r => r.id !== request.id);
      await handleUpdateSettings({ ...currentSettings, deleteRequests: updatedRequests });
      
      logActivity("DELETE", "SETTINGS", `Approved delete request: ${request.label}`);
    } catch (e) {
      handleError(e, "approve", "delete_request");
    }
  }, [settings, workers, handleDeleteWorker, handleSaveWorker, handleUpdateSettings, handleError]);

  const handleRejectDeleteRequest = React.useCallback(async (requestId: string) => {
    const updatedRequests = (settings.deleteRequests || []).filter(r => r.id !== requestId);
    await handleUpdateSettings({ ...settings, deleteRequests: updatedRequests });
    logActivity("DELETE", "SETTINGS", `Rejected delete request: ${requestId}`);
  }, [settings, handleUpdateSettings]);

  const handleImportWorkers = React.useCallback(
    async (newWorkers: Worker[]) => {
      const existingWorkerNumbers = new Set(
        workers.map((w) => w.workerNumber.toLowerCase()),
      );
      const uniqueNewWorkers = newWorkers.filter(
        (w) => !existingWorkerNumbers.has(w.workerNumber.toLowerCase()),
      );

      if (uniqueNewWorkers.length === 0) {
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: "Import Complete",
            message: "All imported workers already exist in the database.",
            time: "Just now",
            read: false,
            type: "info",
          },
          ...prev,
        ]);
        return;
      }

      const updatedWorkers = [...workers, ...uniqueNewWorkers];
      const updatedAttendance = [
        ...attendance,
        ...generateInitialAttendance(uniqueNewWorkers),
      ];

      try {
        await Promise.all([
          saveData("workers", { list: updatedWorkers }),
          saveData("attendance", { list: updatedAttendance }),
        ]);

        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: "Import Successful",
            message: `Imported ${uniqueNewWorkers.length} new workers.`,
            time: "Just now",
            read: false,
            type: "success",
          },
          ...prev,
        ]);
      } catch (error) {
        handleError(error, "save", "import");
      }
    },
    [workers, attendance, saveData],
  );

  const handleRestoreFromData = React.useCallback(
    async (dataString: string) => {
      try {
        const data = JSON.parse(dataString);
        setWorkers(data.workers || []);
        setAttendance(data.attendance || []);
        if (data.settings) setSettings(data.settings);
        
        if (dbProvider === "supabase") {
          setSyncStatus("FETCHING");
          const results = await Promise.all([
            supabase.from("shared_data").upsert({ portal_id: portalId, data_key: "workers", payload: { _compressed: LZString.compressToBase64(JSON.stringify({ list: data.workers || [] })) }, updated_at: new Date().toISOString() }),
            supabase.from("shared_data").upsert({ portal_id: portalId, data_key: "attendance", payload: { _compressed: LZString.compressToBase64(JSON.stringify({ list: data.attendance || [] })) }, updated_at: new Date().toISOString() }),
            supabase.from("shared_data").upsert({ portal_id: portalId, data_key: "settings", payload: { _compressed: LZString.compressToBase64(JSON.stringify({ config: data.settings || {} })) }, updated_at: new Date().toISOString() })
          ]);
          for (const res of results) {
            if (res.error) throw new Error(res.error.message || "Supabase restore failed");
          }
          setSyncStatus("SUCCESS");
        } else {
          await Promise.all([
            saveData("workers", { list: data.workers || [] }),
            saveData("attendance", { list: data.attendance || [] }),
            saveData("settings", { config: data.settings || {} }),
          ]);
        }

        logActivity("RESTORE", "SYSTEM", "Restored system database");
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: "Restore Success",
            message: "System data replaced with backup.",
            time: "Just now",
            read: false,
            type: "success",
          },
          ...prev,
        ]);
      } catch (error) {
        handleError(error, "restore", "data");
      }
    },
    [saveData, dbProvider, portalId],
  );

  const handleRestore = React.useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        await handleRestoreFromData(text);
      } catch (error) {
        handleError(error, "restore", "restore-file");
      }
    },
    [handleRestoreFromData, handleError],
  );

  const handleRecoverLegacyData = React.useCallback(async () => {
    setIsBootstrapping(true);
    try {
      // Prompt user that this is for manual recovery/upload
      console.log("Manual recovery triggered");
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: "Recovery Mode",
          message:
            'Please use the "Upload JSON" button to restore your legacy system data.',
          time: "Just now",
          read: false,
          type: "info",
        },
        ...prev,
      ]);
    } catch (e) {
      console.error("Recovery failed:", e);
    } finally {
      setIsBootstrapping(false);
    }
  }, [handleBootstrapData]);

  // Automatic backup logic
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const data = generateBackup(workers, attendance, settings);
      try {
        localStorage.setItem("portal_auto_backup", JSON.stringify(data));
        localStorage.setItem(`portal_${portalId}_backup`, JSON.stringify({
          ...data,
          type: "Auto",
          timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      } catch (e) {
        console.warn("Backup fail", e);
      }
    }, 900000); // 15 mins
    return () => clearInterval(interval);
  }, [workers, attendance, settings, portalId]);

  React.useEffect(() => {
    const syncLocalToCloud = async () => {
      if (dbProvider !== "supabase") return;
      try {
        setSyncStatus("FETCHING");
        
        // Read directly from local storage to ensure we don't push empty state
        const localWorkersStr = localStorage.getItem(`portal_${portalId}_workers`);
        const localAttendanceStr = localStorage.getItem(`portal_${portalId}_attendance`);
        const localSettingsStr = localStorage.getItem(`portal_${portalId}_settings`);
        
        let workersToPush = workers;
        let attendanceToPush = attendance;
        let settingsToPush = settings;
        
        const extractPayload = (payload: any) => {
          if (!payload) return null;
          if (payload._compressed) {
            try { return JSON.parse(LZString.decompressFromBase64(payload._compressed) || "{}"); } catch (e) { return null; }
          }
          return payload;
        };

        if (localWorkersStr) {
          try {
            let parse = JSON.parse(localWorkersStr);
            parse = extractPayload(parse) || parse;
            if (parse.list && parse.list.length > 0) workersToPush = parse.list;
          } catch (e) {}
        }
        
        if (localAttendanceStr) {
          try {
            let parse = JSON.parse(localAttendanceStr);
            parse = extractPayload(parse) || parse;
            if (parse.list && parse.list.length > 0) attendanceToPush = parse.list;
          } catch (e) {}
        }
        
        if (localSettingsStr) {
          try {
            let parse = JSON.parse(localSettingsStr);
            parse = extractPayload(parse) || parse;
            if (parse.config && Object.keys(parse.config).length > 0) settingsToPush = parse.config;
          } catch (e) {}
        }

        const compressedWorkers = LZString.compressToBase64(JSON.stringify({ list: workersToPush }));
        const compressedAttendance = LZString.compressToBase64(JSON.stringify({ list: attendanceToPush }));
        const compressedSettings = LZString.compressToBase64(JSON.stringify({ config: settingsToPush }));
        
        const [wRes, aRes, sRes] = await Promise.all([
          supabase.from("shared_data").upsert({ portal_id: portalId, data_key: "workers", payload: { _compressed: compressedWorkers }, updated_at: new Date().toISOString() }),
          supabase.from("shared_data").upsert({ portal_id: portalId, data_key: "attendance", payload: { _compressed: compressedAttendance }, updated_at: new Date().toISOString() }),
          supabase.from("shared_data").upsert({ portal_id: portalId, data_key: "settings", payload: { _compressed: compressedSettings }, updated_at: new Date().toISOString() })
        ]);
        
        if (wRes.error) throw new Error("Workers sync failed: " + wRes.error.message);
        if (aRes.error) throw new Error("Attendance sync failed: " + aRes.error.message);
        if (sRes.error) throw new Error("Settings sync failed: " + sRes.error.message);
        
        // Update local state if we recovered from local storage
        if (workersToPush !== workers) setWorkers(workersToPush);
        if (attendanceToPush !== attendance) setAttendance(attendanceToPush);
        if (settingsToPush !== settings) setSettings(settingsToPush);

        setSyncStatus("SUCCESS");
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: "Cloud Sync Complete",
            message: "Your local data has been successfully pushed to Supabase.",
            time: "Just now",
            read: false,
            type: "success",
          },
          ...prev,
        ]);
      } catch (e) {
        console.error("Failed to upload to Supabase", e);
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: "Sync Failed",
            message: "Could not push data to Supabase. Check your connection.",
            time: "Just now",
            read: false,
            type: "error",
          },
          ...prev,
        ]);
      }
    };

    window.addEventListener('syncLocalToCloud', syncLocalToCloud);
    return () => window.removeEventListener('syncLocalToCloud', syncLocalToCloud);
  }, [workers, attendance, settings, portalId, dbProvider]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const fuzzySearch = React.useCallback((text: string, query: string) => {
    if (!query) return true;
    const target = text.toLowerCase();
    const pattern = query.toLowerCase().trim();

    // Direct inclusion
    if (target.includes(pattern)) return true;

    // Abbreviation / Initial matching (e.g., "J A N" -> "John Antonio Nelson")
    const words = pattern.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      const targetWords = target.split(/\s+/).filter(Boolean);
      let wordIndex = 0;
      let matchCount = 0;

      words.forEach((w) => {
        while (wordIndex < targetWords.length) {
          if (targetWords[wordIndex].startsWith(w)) {
            matchCount++;
            wordIndex++;
            break;
          }
          wordIndex++;
        }
      });
      if (matchCount === words.length) return true;
    }

    return false;
  }, []);

  const filteredWorkersBySearch = React.useMemo(() => {
    if (!debouncedGlobalSearch) return workers;
    return workers.filter(
      (w) =>
        fuzzySearch(w.name, debouncedGlobalSearch) ||
        (w.workerNumber && fuzzySearch(w.workerNumber, debouncedGlobalSearch)),
    );
  }, [workers, debouncedGlobalSearch, fuzzySearch]);

  const handleUpdateRecord = React.useCallback(
    (id: string, updates: Partial<AttendanceRecord>) => {
      setAttendance((prev) => {
        const newAttendance = prev.map((record) =>
          record.id === id ? { ...record, ...updates } : record,
        );
        const uniqueAttendance = deduplicateAttendanceRecords(newAttendance);
        saveData("attendance", { list: uniqueAttendance }).catch((e) =>
          handleError(e, "save", "attendance"),
        );
        return uniqueAttendance;
      });
    },
    [saveData, handleError],
  );



  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#050505] flex items-center justify-center flex-col gap-8 relative overflow-hidden transition-colors duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent animate-pulse" />

        {/* Diagnostic Overlay */}
        <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
          <div className="relative mb-12">
            <div className="w-24 h-24 border-2 border-line dark:border-white/5 border-t-emerald-500 rounded-full animate-spin duration-[2000ms]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-line dark:border-white/5 border-b-emerald-400 rounded-full animate-spin-reverse duration-[1500ms]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe
                size={24}
                className={cn(
                  "transition-colors duration-500",
                  syncStatus === "ERROR"
                    ? "text-red-500"
                    : "text-emerald-500 animate-pulse",
                )}
              />
            </div>
          </div>

          <div className="space-y-4 w-full">
            <div className="space-y-1">
              <h2 className="luxury-heading text-3xl text-zinc-900 dark:text-white transition-opacity duration-300">
                {syncStatus === "ERROR" ? "Sync Interrupted" : "Portal Genesis"}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    syncStatus === "ERROR" ? "bg-red-500" : "bg-emerald-500",
                  )}
                />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400">
                  {syncStatus === "FETCHING"
                    ? "Synchronizing Cloud Vault"
                    : syncStatus === "ERROR"
                      ? "Connection Warning"
                      : "Establishing Connection"}
                </p>
              </div>
            </div>

            {lastFetchError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl text-left shadow-2xl shadow-red-500/5"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                      Diagnostic Report
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                      The system encountered a resistance during data retrieval.
                      This usually implies your internet is unstable or the
                      security script hasn't been applied to your database.
                    </p>
                    <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5">
                      <p className="text-[9px] text-zinc-500 font-mono break-all line-clamp-2">
                        Error: {lastFetchError}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="pt-8 flex flex-col gap-3">
              {showForceLoad && (
                <button
                  onClick={() => setIsLoading(false)}
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl relative z-10"
                >
                  Enter Emergency Dashboard
                </button>
              )}

              {syncStatus === "ERROR" && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-transparent border border-line dark:border-white/10 text-zinc-900 dark:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#E5E5E5] dark:hover:bg-white/5 transition-all relative z-10"
                >
                  Refresh Connection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#050505] flex transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#050505] border-r border-line dark:border-white/10 flex flex-col sticky top-0 h-screen z-30 print:hidden shadow-xl dark:shadow-none transition-colors duration-200">
        <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
          <div
            className="flex items-center gap-5 mb-16 group cursor-pointer relative"
            onClick={() => setActiveTab("profile")}
          >
            <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-14 h-14 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-zinc-950 font-black text-2xl shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 relative z-10">
              {settings.systemName.charAt(0)}
            </div>
            <div className="min-w-0 relative z-10">
              <h1 className="luxury-heading text-2xl leading-none text-zinc-900 dark:text-white group-hover:text-emerald-400 transition-colors">
                {settings.systemName}
              </h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] font-black mt-2 truncate opacity-60">
                {settings.companyName}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2 px-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                Navigation
              </p>
              <nav className="space-y-1">
                <NavItem
                  active={activeTab === "dashboard"}
                  onClick={() => setActiveTab("dashboard")}
                  icon={<LayoutDashboard size={16} />}
                  label="Dashboard"
                />
                <NavItem
                  active={activeTab === "master"}
                  onClick={() => setActiveTab("master")}
                  icon={<Users size={16} />}
                  label="Staff Statues"
                />
                <NavItem
                  active={activeTab === "attendance"}
                  onClick={() => {
                    setActiveTab("attendance");
                    setAttendanceSelection(null);
                  }}
                  icon={<CalendarCheck size={16} />}
                  label="Attendance"
                />
                <NavItem
                  active={activeTab === "absent-workers"}
                  onClick={() => setActiveTab("absent-workers")}
                  icon={<UserX size={16} />}
                  label="Absent Workers"
                />
                <NavItem
                  active={activeTab === "calculator"}
                  onClick={() => setActiveTab("calculator")}
                  icon={<Calculator size={16} />}
                  label="Site Calculator"
                />

                <NavItem
                  active={activeTab === "worker-reports"}
                  onClick={() => setActiveTab("worker-reports")}
                  icon={<TrendingUp size={16} />}
                  label="Worker Reports"
                />
                <NavItem
                  active={activeTab === "labour-card"}
                  onClick={() => setActiveTab("labour-card")}
                  icon={<FileText size={16} />}
                  label="Labour Card"
                />
                <NavItem
                  active={activeTab === "accounts"}
                  onClick={() => setActiveTab("accounts")}
                  icon={<BookOpen size={16} />}
                  label="Accounts"
                />
              </nav>
            </div>

            <div>
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2 px-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                System
              </p>
              <nav className="space-y-1">
                <NavItem
                  active={activeTab === "profile"}
                  onClick={() => setActiveTab("profile")}
                  icon={<UserIcon size={16} />}
                  label="My Profile"
                />
                {isAdmin && (
                  <NavItem
                    active={activeTab === "settings"}
                    onClick={handleSettingsClick}
                    icon={<Settings size={16} />}
                    label="System Settings"
                  />
                )}
              </nav>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-3 border-t border-zinc-100 dark:border-white/5 bg-[#F5F5F7]/50 dark:bg-white/[0.02] backdrop-blur-3xl">
          <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-white/2 rounded-xl border border-zinc-100 dark:border-white/5 shadow-sm dark:shadow-inner group/theme">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] font-serif italic group-hover/theme:text-zinc-900 dark:group-hover/theme:text-zinc-300 transition-colors">
              Theme
            </span>
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative duration-300 shadow-inner overflow-hidden",
                theme === "dark"
                  ? "bg-emerald-500/20"
                  : "bg-zinc-200 dark:bg-zinc-800",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
              <motion.div
                animate={{ x: theme === "dark" ? 26 : 2 }}
                transition={{ type: "spring", damping: 15, stiffness: 150 }}
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full shadow-2xl flex items-center justify-center z-10",
                  theme === "dark"
                    ? "bg-emerald-500"
                    : "bg-white dark:bg-zinc-600",
                )}
              >
                {theme === "dark" ? (
                  <Moon size={10} className="text-black" />
                ) : (
                  <Sun size={10} className="text-emerald-500" />
                )}
              </motion.div>
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.reload()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-900 transition-all duration-200 group border border-transparent hover:border-line font-serif italic"
          >
            <Bell
              size={16}
              className="group-hover:-translate-x-1 transition-transform duration-200"
            />
            Refresh Portal
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#F5F5F7] dark:bg-[#050505] transition-colors duration-200 custom-scrollbar print:overflow-visible">
        <header className="h-16 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20 border-b border-line dark:border-white/10 print:hidden">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn-icons-png.flaticon.com/512/2921/2921225.png"
              alt="Construction Logo"
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">
              PORTAL
            </span>
          </div>

          <div className="flex-[2] flex justify-center relative">
            <div className="relative max-w-md w-full group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search intelligence..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowUniversalSearch(true);
                }}
                onFocus={() => setShowUniversalSearch(true)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#E5E5E5] dark:bg-[#0f172a] border border-line dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all shadow-sm outline-none text-zinc-900 dark:text-white text-center"
              />

              <AnimatePresence>
                {showUniversalSearch && globalSearch && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUniversalSearch(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0f172a] border border-line dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 py-2 max-h-[400px] overflow-y-auto custom-scrollbar"
                    >
                      <p className="px-4 py-2 text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        Universal Search Recommendations
                      </p>
                      {filteredWorkersBySearch.length > 0 ? (
                        filteredWorkersBySearch.slice(0, 8).map((worker) => (
                          <button
                            key={`global-search-${worker.id}`}
                            onClick={() => {
                              setSelectedWorkerIdForLabourCard(worker.id);
                              setActiveTab("labour-card");
                              setShowUniversalSearch(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#E5E5E5] dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 group-hover:text-emerald-500 transition-colors">
                              {worker.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                {worker.name}
                              </p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">
                                {worker.role} • {worker.company}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-xs text-zinc-500 italic">
                          No matches found in the matrix
                        </div>
                      )}

                      {/* Search in other categories? */}
                      <div className="border-t border-zinc-100 dark:border-white/5 mt-2 pt-2 px-4">
                        <button
                          onClick={() => {
                            setActiveTab("master");
                            setShowUniversalSearch(false);
                          }}
                          className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:translate-x-1 transition-all"
                        >
                          View in Staff Directory <FileText size={12} />
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-end gap-3 sm:gap-4">
            {/* Database Provider Quick Selector */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#0f172a] border border-line dark:border-white/10 rounded-full shadow-sm text-xs select-none">
              <Database size={13} className="text-zinc-500 font-bold" />
              <select
                value={dbProvider}
                onChange={(e) => {
                  const newProvider = e.target.value as any;
                  setDbProvider(newProvider);
                  localStorage.setItem("portal_db_provider", newProvider);
                }}
                className="bg-transparent border-0 font-bold text-[9px] tracking-wider uppercase text-zinc-700 dark:text-zinc-300 py-0.5 outline-none cursor-pointer focus:ring-0 focus:outline-none"
              >
                <option value="supabase" className="bg-white dark:bg-[#0f172a] text-zinc-800 dark:text-white">Supabase</option>
                <option value="local" className="bg-white dark:bg-[#0f172a] text-zinc-800 dark:text-white">Offline Local</option>
              </select>
            </div>

            {/* Sync Status Indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={syncStatus}
              className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 shadow-sm",
                syncStatus === "FETCHING" &&
                  "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
                syncStatus === "SUCCESS" &&
                  "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                syncStatus === "ERROR" &&
                  "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
                syncStatus === "IDLE" &&
                  "bg-[#E5E5E5] dark:bg-white/5 border-line dark:border-white/10 text-zinc-500",
              )}
              title={lastFetchError || "Cloud synchronization status"}
            >
              {syncStatus === "FETCHING" && (
                <RefreshCw size={14} className="animate-spin" />
              )}
              {syncStatus === "SUCCESS" && <CheckCircle2 size={14} />}
              {syncStatus === "ERROR" && (
                <CloudOff size={14} className="animate-pulse" />
              )}
              {syncStatus === "IDLE" && <Cloud size={14} />}

              <span className="text-[9px] font-black uppercase tracking-[0.2em] pt-[1px]">
                {syncStatus === "FETCHING"
                  ? "Syncing"
                  : syncStatus === "SUCCESS"
                    ? "Live"
                    : syncStatus === "ERROR"
                      ? "Failed"
                      : "Offline"}
              </span>
            </motion.div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all border border-line dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-sm",
                  showNotifications &&
                    "text-zinc-900 dark:text-white ring-2 ring-zinc-900 dark:ring-white",
                )}
              >
                <Bell size={18} />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0f172a]" />
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                  onMarkAsRead={handleMarkAsRead}
                  onClearAll={handleClearAll}
                />
              )}
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />

            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("profile")}
                className="flex items-center gap-3 group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-none">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-1">
                    {currentUser.role}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#E5E5E5] dark:bg-zinc-800 border border-line dark:border-white/10 overflow-hidden group-hover:ring-2 group-hover:ring-zinc-900 dark:group-hover:ring-white transition-all shadow-sm">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-500 font-bold">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </header>

        <div className="px-2 py-2 max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && (
                <Dashboard
                  isMasterControlLocked={isMasterControlLocked}
                  workers={filteredWorkersBySearch}
                  attendance={attendance}
                  settings={settings}
                  onBootstrap={handleBootstrapData}
                  isBootstrapping={isBootstrapping}
                  syncStatus={syncStatus}
                  lastError={lastFetchError}
                  selectedMonth={selectedMonth}
                  onMonthChange={setSelectedMonth}
                />
              )}
              {activeTab === "master" && (
                <StaffInfo
                  isMasterControlLocked={isMasterControlLocked}
                  workers={workers}
                  attendance={attendance}
                  settings={settings}
                  isAdmin={isAdmin}
                  onAddNewWorker={handleAddWorker}
                  onEditWorker={handleEditWorker}
                  onDeleteWorker={handleDeleteWorker}
                  onDeleteAllWorkers={handleDeleteAllWorkers}
                  onImportWorkers={handleImportWorkers}
                  onViewWorkerDetail={handleViewWorkerDetail}
                  onManualCleanup={handleManualCleanup}
                  onUpdateWorkers={handleUpdateWorkers}
                  selectedMonth={selectedMonth}
                />
              )}
              {activeTab === "attendance" &&
                (!attendanceSelection ? (
                  <AttendanceSelection
                    settings={settings}
                    attendance={attendance}
                    workers={workers}
                    onSelect={(type, value) =>
                      setAttendanceSelection({ type, value })
                    }
                    onBootstrap={handleBootstrapData}
                    isBootstrapping={isBootstrapping}
                    onUpdateSettings={handleUpdateSettings}
                    onUpdateAttendanceRecords={handleUpdateAttendance}
                    isAdmin={currentUser.role === "Admin"}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    isMonthLocked={isMonthLocked}
                    onUnlockMonth={() => setIsMonthUnlocked(true)}
                    initialSearchTerm={globalSearchTerm}
                    onSearchChange={setGlobalSearchTerm}
                  />
                ) : (
                  <AttendanceSheet
                    workers={workers}
                    attendance={attendance}
                    settings={settings}
                    userRole={currentUser.role}
                    onUpdateAttendanceRecords={handleUpdateAttendance}
                    onAddAttendance={handleAddAttendance}
                    onDeleteAttendance={handleDeleteAttendanceRecord}
                    selectedCompany={
                      attendanceSelection.type === "company"
                        ? attendanceSelection.value
                        : undefined
                    }
                    selectedSite={
                      attendanceSelection.type === "site"
                        ? attendanceSelection.value
                        : undefined
                    }
                    onBack={() => setAttendanceSelection(null)}
                    onUpdateSettings={handleUpdateSettings}
                    selectedMonth={selectedMonth}
                    onManualBackup={handleManualBackup}
                    onAddWorker={handleAddWorker}
                    isMonthLocked={isMonthLocked}
                    onUnlockMonth={() => setIsMonthUnlocked(true)}
                    initialSearchTerm={globalSearchTerm}
                  />
                ))}
              {activeTab === "calculator" && (
                <ConstructionCalculator
                  isMasterControlLocked={isMasterControlLocked}
                  projectSites={Array.from(
                    new Set([
                      ...(settings.projectSites || []),
                      ...attendance.map((a) => a.site).filter(Boolean)
                    ])
                  ).filter(
                    (s) =>
                      !(
                        settings.hiddenSitesByMonth?.[
                          `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`
                        ] || []
                      ).includes(s),
                  )}
                  attendance={attendance}
                  workers={workers}
                  settings={settings}
                  selectedMonth={selectedMonth}
                  onMonthChange={setSelectedMonth}
                />
              )}
              {activeTab === "sites" && isAdmin && (
                <SiteManagement
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  workers={workers}
                  attendance={attendance}
                  selectedMonth={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  onUpdateAttendanceRecords={handleUpdateAttendance}
                />
              )}
              {activeTab === "absent-workers" && (
                <AbsentWorkers
                  workers={workers}
                  attendance={attendance}
                  settings={settings}
                />
              )}

              {activeTab === "worker-reports" && (
                <WorkerReports
                  isMasterControlLocked={false}
                  workers={workers}
                  attendance={attendance}
                  settings={settings}
                  onViewWorkerDetail={handleViewWorkerDetail}
                />
              )}
              {activeTab === "labour-card" && (
                <LabourCard
                  isMasterControlLocked={isMasterControlLocked}
                  workers={workers}
                  attendance={attendance}
                  settings={settings}
                  initialWorkerId={selectedWorkerIdForLabourCard}
                  onUpdateWorker={handleSaveWorker}
                  onUpdateAttendance={handleUpdateAttendance}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}
              {activeTab === "accounts" && (
                <AccountsModule
                  workers={workers}
                  settings={settings}
                  onUpdateWorker={handleSaveWorker}
                  onUpdateSettings={handleUpdateSettings}
                  onDeleteRequest={handleDeleteRequest}
                  isMasterControlLocked={isMasterControlLocked}
                />
              )}
              {activeTab === "settings" && (
                <SettingsSheet
                  isMasterControlLocked={isMasterControlLocked}
                  settings={settings}
                  workers={workers}
                  onDeleteRequest={handleDeleteRequest}
                  onApproveDeleteRequest={handleApproveDeleteRequest}
                  onRejectDeleteRequest={handleRejectDeleteRequest}
                  onUpdateSettings={async (newSettings) => {
                    // Check for renames
                    const renamedCompanies = new Map<string, string>();
                    (settings.companies || []).forEach((oldName, i) => {
                      const newName = (newSettings.companies || [])[i];
                      if (
                        newName &&
                        oldName !== newName &&
                        (newSettings.companies || []).length ===
                          (settings.companies || []).length
                      ) {
                        renamedCompanies.set(oldName, newName);
                      }
                    });

                    const renamedSites = new Map<string, string>();
                    (settings.projectSites || []).forEach((oldName, i) => {
                      const newName = (newSettings.projectSites || [])[i];
                      if (
                        newName &&
                        oldName !== newName &&
                        (newSettings.projectSites || []).length ===
                          (settings.projectSites || []).length
                      ) {
                        renamedSites.set(oldName, newName);
                      }
                    });

                    if (renamedCompanies.size > 0 || renamedSites.size > 0) {
                      const updatedWorkers = workers.map((w) => {
                        let updated = { ...w };
                        let hasChanges = false;
                        if (renamedCompanies.has(w.company)) {
                          updated.company = renamedCompanies.get(w.company)!;
                          hasChanges = true;
                        }
                        if (w.assignedSites) {
                          const newAssignedSites = w.assignedSites.map(
                            (s) => renamedSites.get(s) || s,
                          );
                          if (
                            JSON.stringify(newAssignedSites) !==
                            JSON.stringify(w.assignedSites)
                          ) {
                            updated.assignedSites = newAssignedSites;
                            hasChanges = true;
                          }
                        }
                        return hasChanges ? updated : w;
                      });

                      const workersChanged = updatedWorkers.some(
                        (w, i) => w !== workers[i],
                      );
                      if (workersChanged) {
                        setWorkers(updatedWorkers);
                        saveData("workers", {
                          list: updatedWorkers,
                        }).catch((e) => handleError(e, "save", "workers"));
                      }

                      // Propagate renames of companies or sites to attendance records
                      const updatedAttendance = attendance.map((record) => {
                        let updated = { ...record };
                        let hasChanges = false;
                        
                        if (record.companyName) {
                          const matchedCompanyKey = Array.from(renamedCompanies.keys()).find(
                            (k) => k.trim().toLowerCase() === record.companyName.trim().toLowerCase()
                          );
                          if (matchedCompanyKey) {
                            updated.companyName = renamedCompanies.get(matchedCompanyKey)!;
                            hasChanges = true;
                          }
                        }
                        
                        if (record.site) {
                          const matchedSiteKey = Array.from(renamedSites.keys()).find(
                            (k) => k.trim().toLowerCase() === record.site.trim().toLowerCase()
                          );
                          if (matchedSiteKey) {
                            updated.site = renamedSites.get(matchedSiteKey)!;
                            hasChanges = true;
                          }
                        }
                        return hasChanges ? updated : record;
                      });

                      const attendanceChanged = updatedAttendance.some(
                        (r, i) => r !== attendance[i]
                      );
                      if (attendanceChanged) {
                        setAttendance(updatedAttendance);
                        saveData("attendance", {
                          list: updatedAttendance,
                        }).catch((e) => handleError(e, "save", "attendance"));
                      }
                    }

                    setSettings(newSettings);
                    saveData("settings", { config: newSettings }).catch(
                      (e) => handleError(e, "save", "settings"),
                    );
                  }}
                  backupHistory={backupHistory}
                  onManualBackup={handleManualBackup}
                  onRestore={handleRestore}
                  onRestoreFromData={handleRestoreFromData}
                  onRecoverLegacyData={handleRecoverLegacyData}
                  onBootstrap={() => handleBootstrapData(false)}
                  onClearAttendance={handleClearAttendance}
                  onImportAttendance={handleImportAttendance}
                  isBootstrapping={isBootstrapping}
                  dataHealth={dataHealth}
                  selectedMonth={selectedMonth}
                  dbProvider={dbProvider}
                  onUpdateDbProvider={async (newProvider) => {
                    setDbProvider(newProvider);
                    localStorage.setItem("portal_db_provider", newProvider);
                  }}
                  portalId={portalId}
                  onUpdatePortalId={(newId) => {
                    setPortalId(newId);
                    localStorage.setItem("portal_id", newId);
                  }}
                />
              )}
              {activeTab === "profile" && (
                <Profile user={currentUser} onUpdateUser={setCurrentUser} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <footer className="mt-20 pt-8 border-t border-line dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                Developed by{" "}
                <span className="text-zinc-900 dark:text-white">
                  {settings.systemCreator}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                System Creator: {settings.systemCreator}
              </p>
              <div className="h-4 w-px bg-zinc-200 dark:bg-white/5" />
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                © 2026 {settings.systemName}
              </p>
            </div>
          </footer>
        </div>
      </main>

      <WorkerModal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        onSave={handleSaveWorker}
        worker={editingWorker}
        settings={settings}
        masterWorkers={workers}
        onUpdateSettings={async (newSettings) => {
          setSettings(newSettings);
          saveData("settings", { config: newSettings }).catch((e) =>
            handleError(e, "save", "settings"),
          );
        }}
      />

      <WorkerDetailModal
        isOpen={isWorkerDetailModalOpen}
        onClose={() => setIsWorkerDetailModalOpen(false)}
        worker={selectedWorkerForDetail}
        attendance={attendance}
        settings={settings}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setWorkerToDelete(null);
        }}
        onConfirm={confirmDeleteWorker}
        title="Delete Worker"
        message={
          workerToDelete
            ? `Are you sure you want to delete ${workerToDelete.name}? This will also remove them from all shared attendance records. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Worker"
        type="danger"
      />

      <ConfirmationModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={confirmDeleteAllWorkers}
        title="Delete All Workers"
        message="Are you sure you want to delete ALL workers? This will clear the entire master database and all attendance history. This action is IRREVERSIBLE."
        confirmLabel="Clear All Data"
        type="danger"
      />

      {/* Master PIN Authentication Modal */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-line dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl w-14 h-14 mx-auto mb-6 border border-emerald-500/20 flex items-center justify-center shadow-lg">
                <ShieldCheck size={28} className="animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-2 font-serif italic">Master Access Control</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-6">Enter customizable PIN to authorize full access</p>
              
              <div className="space-y-4">
                <input
                  type="password"
                  maxLength={10}
                  placeholder="••••"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyPin();
                  }}
                  className={cn(
                    "w-full text-center text-3xl font-black font-mono tracking-[0.5em] py-3 bg-[#F5F5F7] dark:bg-zinc-800 border-2 rounded-2xl outline-none focus:ring-0 transition-all",
                    pinError 
                      ? "border-red-500 text-red-500 focus:border-red-500" 
                      : "border-line dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-white text-zinc-950 dark:text-white"
                  )}
                />
                
                {pinError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-xs font-bold text-red-500 uppercase tracking-wider"
                  >
                    Incorrect PIN code. Try again.
                  </motion.p>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setIsPinModalOpen(false);
                      setPinInput("");
                      setPinError(false);
                    }}
                    className="flex-1 py-3 border border-line dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyPin}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const NavItem = React.memo(
  ({ icon, label, active, onClick, className }: NavItemProps) => {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.3em] transition-all duration-200 group relative overflow-hidden font-serif italic",
          active
            ? "text-white shadow-[0_20px_50px_rgba(16,185,129,0.3)] translate-x-4"
            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-[#E5E5E5] dark:hover:bg-white/5 hover:translate-x-4",
          className,
        )}
      >
        {active && (
          <motion.div
            layoutId="nav-active"
            className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 -z-10"
            transition={{ type: "spring", bounce: 0.1, duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_70%)]" />
          </motion.div>
        )}
        <span
          className={cn(
            "transition-all duration-200 group-hover:scale-125 group-hover:rotate-12",
            active
              ? "text-white"
              : "text-zinc-400 group-hover:text-emerald-500",
          )}
        >
          {icon}
        </span>
        <span className="relative z-10">{label}</span>
        {active && (
          <motion.div
            layoutId="nav-glow"
            className="absolute right-0 top-0 bottom-0 w-2 bg-white shadow-[0_0_40px_rgba(255,255,255,1)]"
            transition={{ type: "spring", bounce: 0.1, duration: 0.2 }}
          />
        )}
      </button>
    );
  },
);

NavItem.displayName = "NavItem";
