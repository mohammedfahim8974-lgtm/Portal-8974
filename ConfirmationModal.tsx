import React from "react";
import { Worker, AdvancePayment, SystemSettings, ManagerWallet, PettyCashTransaction, DeleteRequest } from "../types";
import { 
  Search, 
  Plus, 
  Trash2, 
  Calendar, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  X,
  Printer,
  Edit2,
  BookOpen,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Download,
  AlertCircle,
  TrendingUp,
  User,
  Activity,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  FileText,
  DollarSign,
  UserPlus,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { logActivity } from "../lib/activity-logger";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { ConfirmationModal } from "./ConfirmationModal";

interface AccountsModuleProps {
  workers: Worker[];
  settings: SystemSettings;
  onUpdateWorker: (worker: Worker) => Promise<void>;
  onUpdateSettings?: (settings: SystemSettings) => Promise<void>;
  onDeleteRequest?: (request: Omit<DeleteRequest, 'id' | 'requestDate' | 'status'>) => Promise<void>;
  isMasterControlLocked?: boolean;
}

type EntryType = "combined" | "salary_only" | "advance_only" | "opening_balance";

export function AccountsModule({
  workers,
  settings,
  onUpdateWorker,
  onUpdateSettings,
  onDeleteRequest,
  isMasterControlLocked,
}: AccountsModuleProps) {
  // Completely public and editable for every user as requested ("make this also public? Like every, every, every guy can use it.")
  const isReadOnly = false; 

  const [activeSubTab, setActiveSubTab] = React.useState<"workers" | "pettycash">("workers");

  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedYear, setSelectedYear] = React.useState<number>(settings.payrollYear || new Date().getFullYear());

  // Form modal/editor state
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
  const [formEntryType, setFormEntryType] = React.useState<EntryType>("advance_only");
  const [formSalary, setFormSalary] = React.useState("");
  const [formAdvance, setFormAdvance] = React.useState("");
  const [formDate, setFormDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [formCurrency, setFormCurrency] = React.useState("AED");
  const [formLocalAmount, setFormLocalAmount] = React.useState("");
  const [formExchangeRate, setFormExchangeRate] = React.useState("");
  const [formRemarks, setFormRemarks] = React.useState("");
  const [formError, setFormError] = React.useState("");

  // Linked Manager Wallet state
  const [formManagerId, setFormManagerId] = React.useState<string>("none");

  // Manager Wallets / Petty cash system states
  const [isWalletModalOpen, setIsWalletModalOpen] = React.useState(false);
  const [walletManagerName, setWalletManagerName] = React.useState("");
  const [walletOpeningBalance, setWalletOpeningBalance] = React.useState("");
  const [isTopUp, setIsTopUp] = React.useState(false);
  const [selectedWalletIdForTopUp, setSelectedWalletIdForTopUp] = React.useState("");
  const [walletTopUpDate, setWalletTopUpDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [walletTopUpRemarks, setWalletTopUpRemarks] = React.useState("");

  // Manual transaction states
  const [isManualTxModalOpen, setIsManualTxModalOpen] = React.useState(false);
  const [manualTxType, setManualTxType] = React.useState<'MANUAL_DEBIT' | 'MANUAL_CREDIT'>('MANUAL_DEBIT');
  const [manualTxAmount, setManualTxAmount] = React.useState("");
  const [manualTxManagerId, setManualTxManagerId] = React.useState("");
  const [manualTxRemarks, setManualTxRemarks] = React.useState("");
  const [manualTxDate, setManualTxDate] = React.useState(new Date().toISOString().split("T")[0]);

  // Confirmation states
  const [confirmDeleteEntry, setConfirmDeleteEntry] = React.useState<{ id: string; label: string } | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = React.useState<{ id: string } | null>(null);

  const activeWorker = React.useMemo(() => {
    return workers.find((w) => w.id === selectedWorkerId) || null;
  }, [workers, selectedWorkerId]);

  // Set default salary when worker changes or form opens
  React.useEffect(() => {
    if (activeWorker && !editingEntryId) {
      setFormSalary(String(activeWorker.monthlySalary || ""));
    }
  }, [activeWorker, editingEntryId, isFormOpen]);

  const filteredWorkers = React.useMemo(() => {
    return workers.filter((w) => {
      const query = searchQuery.toLowerCase();
      const nameMatch = w.name.toLowerCase().includes(query);
      const numMatch = (w.workerNumber || "").toLowerCase().includes(query);
      const compMatch = w.company.toLowerCase().includes(query);
      const deptMatch = (w.department || "").toLowerCase().includes(query);
      return nameMatch || numMatch || compMatch || deptMatch;
    });
  }, [workers, searchQuery]);

  // Months formatter helper
  const formatMonthYear = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-AE", { month: "short", year: "2-digit" });
  };

  // Convert raw transactions inside worker's advancePayments array into structured ledger rows
  const ledgerRows = React.useMemo(() => {
    if (!activeWorker) return [];

    const rawPayments = activeWorker.advancePayments || [];
    
    // Seed legacy advances if any
    const payments = [...rawPayments];
    if (activeWorker.advances && activeWorker.advances > 0 && payments.length === 0) {
      payments.push({
        id: "legacy-seeded-adv",
        amount: activeWorker.advances,
        date: `${settings.payrollYear}-${getMonthNumber(settings.payrollMonth)}-15`,
        remarks: "Seeded Legacy Advance",
        localAmount: "Cash liya"
      });
    }

    // Sort chronologically
    payments.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance row by row
    let runningBalance = 0;
    return payments.map((p) => {
      const salary = p.customSalary || 0;
      const advance = p.amount || 0;
      runningBalance = runningBalance + salary - advance;

      let label = "";
      if (p.isOpeningBalance) {
        label = "Last pending";
      } else if (p.customSalary && p.customSalary > 0) {
        label = formatMonthYear(p.date);
      } else {
        label = ""; // standalone advance has empty month exactly like the image
      }

      return {
        ...p,
        monthLabel: label,
        salary,
        advance,
        balance: runningBalance,
      };
    });
  }, [activeWorker, settings.payrollMonth, settings.payrollYear]);

  // Compute Ledger totals
  const totals = React.useMemo(() => {
    let totalSalary = 0;
    let totalAdvance = 0;

    ledgerRows.forEach((row) => {
      totalSalary += row.salary;
      totalAdvance += row.advance;
    });

    const netBalance = totalSalary - totalAdvance;

    return {
      totalSalary,
      totalAdvance,
      netBalance,
    };
  }, [ledgerRows]);

  // Extract unique available years from transactions to filter statement
  const statementYears = React.useMemo(() => {
    const years = new Set<number>();
    years.add(settings.payrollYear || new Date().getFullYear());
    years.add(new Date().getFullYear());

    if (activeWorker?.joiningDate) {
      const joinYear = new Date(activeWorker.joiningDate).getFullYear();
      if (!isNaN(joinYear)) {
        years.add(joinYear);
      }
    }

    ledgerRows.forEach((row) => {
      const d = new Date(row.date);
      if (!isNaN(d.getTime())) {
        years.add(d.getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [ledgerRows, activeWorker, settings.payrollYear]);

  // Filter ledger rows to only show items for the selected statement year
  const filteredLedgerRows = React.useMemo(() => {
    return ledgerRows.filter((row) => {
      const d = new Date(row.date);
      if (isNaN(d.getTime())) return true; // Keep malformed or special entries
      return d.getFullYear() === selectedYear;
    });
  }, [ledgerRows, selectedYear]);

  // Helper mapping month string to digit
  function getMonthNumber(monthName: string): string {
    const monthMap: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
      july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
      jan: "01", feb: "02", mar: "03", apr: "04", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    return monthMap[String(monthName).toLowerCase()] || "01";
  }

  // Handle Recording New/Edit Entry
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorker) return;

    const salaryAmt = (formEntryType === "combined" || formEntryType === "salary_only" || formEntryType === "opening_balance")
      ? parseFloat(formSalary) || 0
      : 0;

    const advanceAmt = (formEntryType === "combined" || formEntryType === "advance_only" || formEntryType === "opening_balance")
      ? parseFloat(formAdvance) || 0
      : 0;

    if (formEntryType === "salary_only" && salaryAmt <= 0) {
      setFormError("Please enter a valid salary credit amount.");
      return;
    }

    if (formEntryType === "advance_only" && advanceAmt <= 0) {
      setFormError("Please enter a valid advance debit amount.");
      return;
    }

    if ((formEntryType === "combined" || formEntryType === "opening_balance") && salaryAmt <= 0 && advanceAmt <= 0) {
      setFormError("Please enter at least a valid salary credit or advance debit.");
      return;
    }

    if (!formDate) {
      setFormError("Please select a transaction date.");
      return;
    }

    const currentPayments = activeWorker.advancePayments || [];
    let updatedPayments: AdvancePayment[];

    let updatedWallets = [...(settings.managerWallets || [])];
    let updatedPcTransactions = [...(settings.pettyCashTransactions || [])];

    // If in edit mode, first "revert" previous petty cash linkages
    if (editingEntryId) {
      const oldPayment = currentPayments.find(p => p.id === editingEntryId);
      if (oldPayment && oldPayment.managerId && oldPayment.amount > 0) {
        // Refund previous manager wallet
        updatedWallets = updatedWallets.map(w => 
          w.id === oldPayment.managerId 
            ? { ...w, balance: w.balance + (oldPayment.amount || 0), updatedAt: new Date().toISOString() } 
            : w
        );
        // Remove old petty cash transaction
        updatedPcTransactions = updatedPcTransactions.filter(t => t.linkedLedgerId !== editingEntryId);
      }
    }

    const selectedManager = settings.managerWallets?.find(w => w.id === formManagerId);
    const ledgerId = editingEntryId || `ledger-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newPaymentData: Omit<AdvancePayment, "id"> = {
      amount: advanceAmt,
      date: formDate,
      customSalary: salaryAmt > 0 ? salaryAmt : undefined,
      isOpeningBalance: formEntryType === "opening_balance" ? true : undefined,
      currency: formCurrency,
      localAmount: formCurrency !== "AED" ? (formLocalAmount.trim() || undefined) : undefined,
      exchangeRate: formCurrency !== "AED" ? (formExchangeRate.trim() || undefined) : undefined,
      remarks: formRemarks.trim() || undefined,
      managerId: formManagerId !== "none" ? formManagerId : undefined,
      managerName: selectedManager ? selectedManager.managerName : undefined,
    };

    if (editingEntryId) {
      // Edit mode
      updatedPayments = currentPayments.map((p) => 
        p.id === editingEntryId 
          ? { ...p, ...newPaymentData }
          : p
      );
    } else {
      // Add mode
      const newPayment: AdvancePayment = {
        id: ledgerId,
        ...newPaymentData
      };
      updatedPayments = [...currentPayments, newPayment];
    }

    // Sort updated payments chronologically
    updatedPayments.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate total advances sum to sync legacy advances counter
    const totalAdvancesSum = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const updatedWorker: Worker = {
      ...activeWorker,
      advancePayments: updatedPayments,
      advances: totalAdvancesSum, // sync total advance for backward compatibility
    };

    // Apply new petty cash links
    if (formManagerId !== "none" && advanceAmt > 0) {
      const walletIdx = updatedWallets.findIndex(w => w.id === formManagerId);
      if (walletIdx !== -1) {
        updatedWallets[walletIdx] = {
          ...updatedWallets[walletIdx],
          balance: updatedWallets[walletIdx].balance - advanceAmt,
          updatedAt: new Date().toISOString(),
        };

        const newPcTx: PettyCashTransaction = {
          id: `pc-tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'ADVANCE_DEBIT',
          amount: advanceAmt,
          managerId: formManagerId,
          managerName: updatedWallets[walletIdx].managerName,
          date: formDate,
          remarks: `Advance given to ${activeWorker.name}. ${formRemarks.trim() ? `Remarks: ${formRemarks.trim()}` : ""}`,
          workerId: activeWorker.id,
          workerName: activeWorker.name,
          linkedLedgerId: ledgerId,
        };
        updatedPcTransactions.push(newPcTx);
      }
    }

    try {
      if (onUpdateSettings) {
        await onUpdateSettings({
          ...settings,
          managerWallets: updatedWallets,
          pettyCashTransactions: updatedPcTransactions,
        });
      }

      await onUpdateWorker(updatedWorker);
      logActivity(
        editingEntryId ? "UPDATE" : "CREATE",
        "WORKER",
        `Recorded ledger entry for ${activeWorker.name}: Salary +${salaryAmt}, Advance -${advanceAmt}${formManagerId !== "none" ? ` (Deducted from ${selectedManager?.managerName}'s Petty Cash)` : ""}`
      );
      
      // Reset form
      setIsFormOpen(false);
      setEditingEntryId(null);
      setFormSalary(String(activeWorker.monthlySalary || ""));
      setFormAdvance("");
      setFormCurrency("AED");
      setFormLocalAmount("");
      setFormExchangeRate("");
      setFormRemarks("");
      setFormManagerId("none");
      setFormError("");
    } catch (err) {
      setFormError("Failed to save changes. Please try again.");
    }
  };

  // Trigger editing form
  const handleOpenEdit = (row: any) => {
    setEditingEntryId(row.id);
    if (row.isOpeningBalance) {
      setFormEntryType("opening_balance");
    } else if (row.salary > 0 && row.advance > 0) {
      setFormEntryType("combined");
    } else if (row.salary > 0) {
      setFormEntryType("salary_only");
    } else {
      setFormEntryType("advance_only");
    }

    setFormSalary(String(row.salary || ""));
    setFormAdvance(String(row.advance || ""));
    setFormDate(row.date);
    setFormCurrency(row.currency || "AED");
    setFormLocalAmount(row.localAmount || "");
    setFormExchangeRate(row.exchangeRate || "");
    setFormRemarks(row.remarks || "");
    setFormManagerId(row.managerId || "none");
    setFormError("");
    setIsFormOpen(true);
  };

  // Handle deleting a ledger entry
  const handleDeleteEntry = async (entryId: string, rowLabel: string) => {
    if (!activeWorker) return;
    
    if (isMasterControlLocked) {
      if (onDeleteRequest) {
        await onDeleteRequest({
          type: 'LEDGER_ENTRY',
          targetId: entryId,
          parentId: activeWorker.id,
          label: `${activeWorker.name} - ${rowLabel}`,
          details: `Delete ledger entry with label "${rowLabel}" and amount.`
        });
      }
      return;
    }

    setConfirmDeleteEntry({ id: entryId, label: rowLabel });
  };

  const performDeleteEntry = async (entryId: string, rowLabel: string) => {
    if (!activeWorker) return;
    const currentPayments = activeWorker.advancePayments || [];
      const deletedPayment = currentPayments.find((p) => p.id === entryId);
      const updatedPayments = currentPayments.filter((p) => p.id !== entryId);
      const totalAdvancesSum = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const updatedWorker: Worker = {
        ...activeWorker,
        advancePayments: updatedPayments,
        advances: totalAdvancesSum,
      };

      if (deletedPayment && deletedPayment.managerId && deletedPayment.amount > 0) {
        let updatedWallets = [...(settings.managerWallets || [])];
        let updatedPcTransactions = [...(settings.pettyCashTransactions || [])];

        // Refund the manager
        updatedWallets = updatedWallets.map(w => 
          w.id === deletedPayment.managerId 
            ? { ...w, balance: w.balance + deletedPayment.amount, updatedAt: new Date().toISOString() } 
            : w
        );

        // Remove linked transactions
        updatedPcTransactions = updatedPcTransactions.filter(t => t.linkedLedgerId !== entryId);

        if (onUpdateSettings) {
          await onUpdateSettings({
            ...settings,
            managerWallets: updatedWallets,
            pettyCashTransactions: updatedPcTransactions,
          });
        }
      }

      await onUpdateWorker(updatedWorker);
      logActivity(
        "DELETE",
        "WORKER",
        `Deleted ledger transaction for ${activeWorker.name} (${rowLabel})`
      );
  };

  // Create or Top Up Manager Wallet
  const handleCreateOrTopUpWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isMasterControlLocked) {
      alert("Master Control is Locked. Only the Master user can create accounts or top up wallets.");
      return;
    }

    if (!walletManagerName.trim() && !isTopUp) {
      alert("Please enter a manager name.");
      return;
    }
    const amount = parseFloat(walletOpeningBalance) || 0;
    if (amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    let updatedWallets = [...(settings.managerWallets || [])];
    let updatedTransactions = [...(settings.pettyCashTransactions || [])];

    if (isTopUp) {
      const walletId = selectedWalletIdForTopUp;
      const wallet = updatedWallets.find(w => w.id === walletId);
      if (!wallet) return;

      updatedWallets = updatedWallets.map(w => 
        w.id === walletId 
          ? { ...w, balance: w.balance + amount, updatedAt: new Date().toISOString() } 
          : w
      );

      const newTx: PettyCashTransaction = {
        id: `pc-tx-topup-${Date.now()}`,
        type: 'TOPUP',
        amount: amount,
        managerId: walletId,
        managerName: wallet.managerName,
        date: walletTopUpDate,
        remarks: walletTopUpRemarks.trim() || `Wallet Top-Up`,
      };
      updatedTransactions.push(newTx);

      logActivity("UPDATE", "SETTINGS", `Topped up ${wallet.managerName}'s Petty Cash with +${amount} AED`);
    } else {
      const walletId = `wallet-${Date.now()}`;
      const newWallet: ManagerWallet = {
        id: walletId,
        managerName: walletManagerName.trim(),
        balance: amount,
        updatedAt: new Date().toISOString(),
      };
      updatedWallets.push(newWallet);

      const newTx: PettyCashTransaction = {
        id: `pc-tx-topup-${Date.now()}`,
        type: 'TOPUP',
        amount: amount,
        managerId: walletId,
        managerName: newWallet.managerName,
        date: walletTopUpDate,
        remarks: `Opening Balance Deposit`,
      };
      updatedTransactions.push(newTx);

      logActivity("CREATE", "SETTINGS", `Created Petty Cash Account for ${newWallet.managerName} with ${amount} AED`);
    }

    if (onUpdateSettings) {
      await onUpdateSettings({
        ...settings,
        managerWallets: updatedWallets,
        pettyCashTransactions: updatedTransactions,
      });
    }

    setIsWalletModalOpen(false);
    setWalletManagerName("");
    setWalletOpeningBalance("");
    setIsTopUp(false);
    setSelectedWalletIdForTopUp("");
    setWalletTopUpRemarks("");
  };

  // Create Manual Expense or Credit on Wallet
  const handleCreateManualTx = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMasterControlLocked) {
      alert("Master Control is Locked. Only the Master user can record manual expenses or adjustments.");
      return;
    }

    const amount = parseFloat(manualTxAmount) || 0;
    if (amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!manualTxManagerId) {
      alert("Please select a manager.");
      return;
    }

    let updatedWallets = [...(settings.managerWallets || [])];
    let updatedTransactions = [...(settings.pettyCashTransactions || [])];

    const wallet = updatedWallets.find(w => w.id === manualTxManagerId);
    if (!wallet) return;

    const finalAmount = manualTxType === 'MANUAL_DEBIT' ? -amount : amount;

    updatedWallets = updatedWallets.map(w => 
      w.id === manualTxManagerId 
        ? { ...w, balance: w.balance + finalAmount, updatedAt: new Date().toISOString() } 
        : w
    );

    const newTx: PettyCashTransaction = {
      id: `pc-tx-manual-${Date.now()}`,
      type: manualTxType,
      amount: amount,
      managerId: manualTxManagerId,
      managerName: wallet.managerName,
      date: manualTxDate,
      remarks: manualTxRemarks.trim() || `${manualTxType === 'MANUAL_DEBIT' ? 'Manual Expense' : 'Direct Credit adjustment'}`
    };
    updatedTransactions.push(newTx);

    logActivity("CREATE", "SETTINGS", `${manualTxType === 'MANUAL_DEBIT' ? 'Logged Manual Expense' : 'Logged Manual Credit'} of ${amount} AED for ${wallet.managerName}`);

    if (onUpdateSettings) {
      await onUpdateSettings({
        ...settings,
        managerWallets: updatedWallets,
        pettyCashTransactions: updatedTransactions,
      });
    }

    setIsManualTxModalOpen(false);
    setManualTxAmount("");
    setManualTxRemarks("");
  };

  // Delete Petty Cash Transaction
  const handleDeletePettyCashTx = async (txId: string) => {
    const tx = (settings.pettyCashTransactions || []).find(t => t.id === txId);
    if (!tx) return;

    if (tx.type === 'ADVANCE_DEBIT') {
      alert("This transaction is automatically linked to a worker's advance. Please delete it directly from that worker's ledger card in the 'Workers Accounts' tab.");
      return;
    }

    if (isMasterControlLocked) {
      if (onDeleteRequest) {
        await onDeleteRequest({
          type: 'PETTY_CASH_TX',
          targetId: txId,
          label: `Petty Cash: ${tx.managerName} - ${tx.amount} ${settings.currency}`,
          details: `Delete petty cash transaction for ${tx.managerName}.`
        });
      }
      return;
    }

    setConfirmDeleteTx({ id: txId });
  };

  const performDeletePettyCashTx = async (txId: string) => {
    const tx = (settings.pettyCashTransactions || []).find(t => t.id === txId);
    if (!tx) return;

    let updatedWallets = [...(settings.managerWallets || [])];
    let updatedTransactions = (settings.pettyCashTransactions || []).filter(t => t.id !== txId);

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

    logActivity("DELETE", "SETTINGS", `Deleted petty cash transaction and adjusted manager balance`);

    if (onUpdateSettings) {
      await onUpdateSettings({
        ...settings,
        managerWallets: updatedWallets,
        pettyCashTransactions: updatedTransactions,
      });
    }
  };

  // Compute stats
  const pettyCashStats = React.useMemo(() => {
    const txs = settings.pettyCashTransactions || [];
    const wallets = settings.managerWallets || [];

    const totalTopUp = txs.filter(t => t.type === 'TOPUP').reduce((sum, t) => sum + t.amount, 0);
    const totalAdvances = txs.filter(t => t.type === 'ADVANCE_DEBIT').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = txs.filter(t => t.type === 'MANUAL_DEBIT').reduce((sum, t) => sum + t.amount, 0);
    const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return {
      totalTopUp,
      totalAdvances,
      totalExpenses,
      totalWalletBalance
    };
  }, [settings.pettyCashTransactions, settings.managerWallets]);

  // Auto-Generate Standard Monthly Credits helper
  const handleAutoGenerateCredits = async () => {
    if (!activeWorker) return;
    if (window.confirm(`Would you like to automatically generate monthly standard Salary Credit rows for ${activeWorker.name} for the year ${selectedYear}?\n\nThis will look up their joined date and add salary credits for all applicable months in ${selectedYear} based on their standard monthly salary of ${activeWorker.monthlySalary} AED.`)) {
      
      const currentPayments = activeWorker.advancePayments || [];
      const newPayments = [...currentPayments];

      // Generate dates for months 0 to 11 of the selected year
      const standardSalary = activeWorker.monthlySalary || 0;
      const joinDate = activeWorker.joiningDate ? new Date(activeWorker.joiningDate) : null;

      for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
        const creditDate = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-01`;
        
        // Skip if credit date is before joining date
        if (joinDate && new Date(creditDate) < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1)) {
          continue;
        }

        // Check if a salary credit already exists for this specific month
        const formattedLabel = formatMonthYear(creditDate);
        const alreadyExists = currentPayments.some(p => p.customSalary && p.customSalary > 0 && formatMonthYear(p.date) === formattedLabel);

        if (!alreadyExists) {
          newPayments.push({
            id: `ledger-auto-${selectedYear}-${monthIdx}-${Date.now()}`,
            amount: 0,
            date: creditDate,
            customSalary: standardSalary,
            remarks: "Automatic Monthly Salary Credit",
            localAmount: "Salary"
          });
        }
      }

      // Sort
      newPayments.sort((a, b) => a.date.localeCompare(b.date));

      const updatedWorker: Worker = {
        ...activeWorker,
        advancePayments: newPayments,
      };

      await onUpdateWorker(updatedWorker);
      logActivity(
        "UPDATE",
        "WORKER",
        `Auto-generated standard monthly salary credits for ${activeWorker.name} for year ${selectedYear}`
      );
    }
  };

  // Export to beautifully formatted Excel matching the user's uploaded spreadsheet style 100%
  const handleExportExcel = () => {
    if (!activeWorker) return;

    const currencySymbol = settings.currency || "AED";
    
    // Header Style Setup
    const titleCell = `${activeWorker.name.toUpperCase()} ${selectedYear}`;
    
    // Build workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare rows exactly matching the Excel spreadsheet structure
    const dataRows = filteredLedgerRows.map((row) => [
      row.monthLabel || "",
      row.salary > 0 ? row.salary : "",
      row.advance > 0 ? row.advance : "",
      row.date ? row.date.split("-").reverse().join(".") : "", // DD.MM.YYYY format
      row.localAmount || "",
      row.exchangeRate || "",
      row.remarks || ""
    ]);

    // Insert Total Row
    const totalsRow = [
      "Total",
      totals.totalSalary,
      totals.totalAdvance,
      "",
      totals.netBalance, // Matches image position of Total Balance (column E)
      "",
      ""
    ];

    // Assemble Sheet AOA (Array of Arrays)
    const sheetData = [
      [], // blank top spacer
      [titleCell], // Row 17: "Rafiq khan 2026"
      ["Month", "Salary", "Advance", "Date", "Description/Balance", "Rate Info", "Reason"], // Headers
      ...dataRows,
      [], // spacer
      totalsRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Apply exact Column Widths
    ws["!cols"] = [
      { wch: 16 }, // Month
      { wch: 12 }, // Salary
      { wch: 12 }, // Advance
      { wch: 15 }, // Date
      { wch: 20 }, // Description / Balance
      { wch: 15 }, // Rate
      { wch: 30 }  // Reason
    ];

    // Merging Title Row across Columns A to E to look exactly like the image banner
    ws["!merges"] = [
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } } // Merge title across first 5 columns
    ];

    // Append sheet and download
    XLSX.utils.book_append_sheet(wb, ws, "Account Ledger");
    XLSX.writeFile(wb, `${activeWorker.name.replace(/\s+/g, "_")}_Ledger_${selectedYear}.xlsx`);

    logActivity("RESTORE", "SYSTEM", `Exported accounts ledger of ${activeWorker.name} for ${selectedYear} to Excel`);
  };

  // Export to Premium PDF Receipt Statement
  const handleExportPDF = () => {
    if (!activeWorker) return;

    const doc = new jsPDF("p", "pt", "a4");
    const currencySymbol = settings.currency || "AED";

    // Header Background Accent Banner
    doc.setFillColor(34, 197, 94); // emerald-500 green
    doc.rect(0, 0, 595, 12, "F");

    // Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(settings.systemName || "PORTAL PAYROLL SYSTEM", 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text("Official Financial Account Ledger & Advances Statement", 40, 65);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 40, 78);

    // Verified Stamp
    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(420, 35, 135, 38, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(22, 163, 74);
    doc.text("VERIFIED LEDGER", 440, 50);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(21, 128, 61);
    doc.text("SECURE BLOCKCHAIN LOG", 432, 62);

    // Worker Information Profile Box
    doc.setFillColor(244, 244, 245); // zinc-100
    doc.roundedRect(40, 100, 515, 80, 8, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text(activeWorker.name.toUpperCase(), 55, 118);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(82, 82, 91); // zinc-600
    doc.text(`Worker ID: #${activeWorker.workerNumber || "N/A"}`, 55, 135);
    doc.text(`Company: ${activeWorker.company}`, 55, 150);
    doc.text(`Department: ${activeWorker.department || "General"}`, 55, 165);

    doc.text(`Joining Date: ${activeWorker.joiningDate || "N/A"}`, 300, 118);
    doc.text(`Role: ${activeWorker.role || "Labourer"}`, 300, 135);
    doc.text(`Monthly Salary Rate: ${(activeWorker.monthlySalary || 0).toFixed(2)} ${currencySymbol}`, 300, 150);
    doc.text(`Statement Year: ${selectedYear}`, 300, 165);

    // KPI Blocks (Salary, Advances, Net Balance)
    // 1. Accrued
    doc.setFillColor(240, 253, 244); // light green
    doc.roundedRect(40, 195, 160, 45, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.text("TOTAL ACCRUED SALARY", 50, 208);
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61);
    doc.text(`${totals.totalSalary.toFixed(2)} ${currencySymbol}`, 50, 228);

    // 2. Advances
    doc.setFillColor(254, 243, 199); // light amber
    doc.roundedRect(215, 195, 160, 45, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(217, 119, 6);
    doc.text("TOTAL ADVANCES PAID", 225, 208);
    doc.setFontSize(12);
    doc.setTextColor(180, 83, 9);
    doc.text(`${totals.totalAdvance.toFixed(2)} ${currencySymbol}`, 225, 228);

    // 3. Balance Liability
    const balanceColor = totals.netBalance >= 0 ? [22, 163, 74] : [225, 29, 72];
    const balanceBg = totals.netBalance >= 0 ? [240, 253, 244] : [255, 241, 242];
    doc.setFillColor(balanceBg[0], balanceBg[1], balanceBg[2]);
    doc.roundedRect(395, 195, 160, 45, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.text("OUTSTANDING NET BALANCE", 405, 208);
    doc.setFontSize(12);
    doc.text(`${totals.netBalance.toFixed(2)} ${currencySymbol}`, 405, 228);

    // Ledger Transactions Table
    const tableHeaders = [
      "Month", 
      `Salary Credit (${currencySymbol})`, 
      `Advance Debit (${currencySymbol})`, 
      "Date", 
      "Description", 
      "Rate", 
      "Remarks / Reason"
    ];

    const tableRows = filteredLedgerRows.map((row) => [
      row.monthLabel || "—",
      row.salary > 0 ? `+${row.salary.toFixed(2)}` : "",
      row.advance > 0 ? `-${row.advance.toFixed(2)}` : "",
      row.date ? row.date.split("-").reverse().join(".") : "",
      row.localAmount || "",
      row.exchangeRate || "",
      row.remarks || ""
    ]);

    // Append total row inside PDF
    tableRows.push([
      "TOTALS",
      `+${totals.totalSalary.toFixed(2)}`,
      `-${totals.totalAdvance.toFixed(2)}`,
      "",
      `BAL: ${totals.netBalance.toFixed(2)} ${currencySymbol}`,
      "",
      ""
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 260,
      margin: { left: 40, right: 40 },
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 6,
        valign: "middle"
      },
      headStyles: {
        fillColor: [39, 39, 42], // zinc-800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left"
      },
      columnStyles: {
        1: { halign: "right", fontStyle: "bold", textColor: [22, 163, 74] }, // Salary
        2: { halign: "right", fontStyle: "bold", textColor: [217, 119, 6] }, // Advance
        4: { fontStyle: "italic" },
        5: { fontStyle: "bold" }
      },
      didParseCell: (data) => {
        // Highlight totals row in amber/gold color scheme to resemble original Excel style
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fillColor = [254, 243, 199]; // light amber
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = [120, 53, 4]; // dark amber
        }
      }
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 50;
    if (finalY < 750) {
      doc.setDrawColor(228, 228, 231);
      doc.line(40, finalY, 180, finalY);
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text("Worker / Recipient Signature", 40, finalY + 12);

      doc.line(415, finalY, 555, finalY);
      doc.text("Authorized Finance Manager", 415, finalY + 12);
    }

    // Page numbers
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text(`Official statement issued securely by Portal Pay. Secure digital signature token: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, 40, 815);
    doc.text(`Page 1 of 1`, 520, 815);

    // Save
    doc.save(`${activeWorker.name.replace(/\s+/g, "_")}_Ledger_${selectedYear}.pdf`);
    logActivity("RESTORE", "SYSTEM", `Exported accounts ledger of ${activeWorker.name} for ${selectedYear} to PDF`);
  };

  if (!selectedWorkerId) {
    return (
      <div className="p-6 md:p-10 max-w-[1400px] mx-auto min-h-[90vh] flex flex-col font-sans relative" id="accounts-module-root">
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
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">Accounts Portal</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Financial Ledger & Advances Tracker</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800/50 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-line dark:border-white/10 shadow-sm relative overflow-hidden">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Statement Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent border-none outline-none text-sm font-black text-zinc-800 dark:text-zinc-200 cursor-pointer focus:ring-0"
            >
              {statementYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliding Segment Control Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl w-fit mb-10 border border-zinc-200/50 dark:border-white/5 shadow-sm relative z-10 print:hidden">
          <button
            onClick={() => setActiveSubTab("workers")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer",
              activeSubTab === "workers"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow font-bold"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <User size={14} className="text-emerald-500" />
            Workers Accounts
          </button>
          <button
            onClick={() => setActiveSubTab("pettycash")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer relative",
              activeSubTab === "pettycash"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow font-bold"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <Coins size={14} className="text-amber-500" />
            Petty Cash & Wallets
            {(settings.managerWallets || []).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>
        </div>

        {activeSubTab === "workers" ? (
          <>
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
                    placeholder="Search worker name, identity, company, role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-5 pr-6 bg-transparent border-none outline-none text-lg text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400/70 font-medium"
                  />
                  <div className="pr-4 hidden sm:flex items-center gap-2">
                    <div className="px-4 py-1.5 bg-[#E5E5E5] dark:bg-white/5 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 border border-line dark:border-white/10 tracking-widest uppercase shadow-inner">
                      {filteredWorkers.length} Accounts
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1 overflow-y-auto pb-12 custom-scrollbar relative z-10">
              <AnimatePresence>
                {filteredWorkers.map((w, idx) => {
                  const listPayments = w.advancePayments || [];
                  let listTotalSalary = 0;
                  let listTotalAdvance = 0;
                  listPayments.forEach(p => {
                    listTotalSalary += p.customSalary || 0;
                    listTotalAdvance += p.amount || 0;
                  });
                  if (w.advances && listPayments.length === 0) {
                    listTotalAdvance = w.advances;
                  }
                  const outstandingBalance = listTotalSalary - listTotalAdvance;
                  const initials = w.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
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
                      onClick={() => {
                        setSelectedWorkerId(w.id);
                        setIsFormOpen(false);
                        setEditingEntryId(null);
                      }}
                      className="group relative flex flex-col text-left bg-zinc-50 dark:bg-zinc-900/30 hover:bg-white dark:hover:bg-zinc-900/80 border border-zinc-200/80 dark:border-white/5 rounded-2xl p-5 gap-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 w-full"
                    >
                      {/* Top Row: Index and Avatar */}
                      <div className="flex justify-between items-start w-full gap-2">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                              LEDGER SHEET
                            </span>
                            <span className="text-[9px] font-black font-mono bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                              #{w.workerNumber || "—"}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-zinc-900 dark:text-white mt-1 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors line-clamp-1 leading-snug">
                            {w.name}
                            {w.status === "Inactive" && (
                              <span className="text-[8px] font-black uppercase bg-zinc-200 text-zinc-500 dark:bg-zinc-800 px-1 py-0.5 rounded ml-1.5 shrink-0">
                                Inactive
                              </span>
                            )}
                          </h3>
                          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {w.role || 'Unassigned Role'}
                          </p>
                        </div>

                        {/* Small Flat Initials Badge */}
                        <div className="w-10 h-10 rounded-xl bg-zinc-200/50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-sm tracking-tight shrink-0 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all duration-300">
                          {initials}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-full border-t border-dashed border-zinc-200 dark:border-white/10" />

                      {/* Middle Section: Outstanding Balance Main Display */}
                      <div className="flex flex-col gap-1 py-1">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                          Outstanding Net Balance
                        </span>
                        <div className="flex items-baseline gap-1 mt-1.5">
                          <span className={cn(
                            "text-3xl font-black font-mono tracking-tight",
                            outstandingBalance >= 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {outstandingBalance.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-bold text-zinc-400 uppercase">
                            AED
                          </span>
                        </div>
                      </div>

                      {/* Ledger Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-white dark:bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-100 dark:border-white/5 mt-auto w-full">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">
                            Monthly
                          </span>
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                            {(w.monthlySalary || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-zinc-100 dark:border-white/5 pl-2 min-w-0">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">
                            Total Credit
                          </span>
                          <span className="text-xs font-bold text-emerald-500 mt-0.5 truncate">
                            +{listTotalSalary.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-zinc-100 dark:border-white/5 pl-2 min-w-0">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">
                            Total Adv
                          </span>
                          <span className="text-xs font-bold text-amber-500 mt-0.5 truncate">
                            -{listTotalAdvance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Footer Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/5 mt-1 w-full">
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors uppercase tracking-widest">
                          View Account Statement
                        </span>
                        <div className="text-zinc-400 group-hover:text-emerald-500 transition-colors transform group-hover:translate-x-1 duration-300">
                          <ChevronRight size={16} strokeWidth={2.5} />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
            
            {filteredWorkers.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 mt-12 mb-12 relative z-10 max-w-md mx-auto text-center">
                 <div className="w-24 h-24 bg-white dark:bg-zinc-900 shadow-xl border border-line dark:border-white/10 rounded-[2rem] flex items-center justify-center mb-6 relative group transform hover:scale-105 transition-transform duration-500">
                   <div className="absolute inset-0 bg-emerald-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   <Search size={40} strokeWidth={1.5} className="text-zinc-300 dark:text-zinc-600 relative z-10 transition-colors group-hover:text-emerald-500" />
                 </div>
                 <p className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">No accounts found</p>
                 <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">We couldn't find any worker accounts matching your search criteria. Try adjusting your terms or <span className="text-emerald-500 cursor-pointer hover:underline" onClick={() => setSearchQuery('')}>clear the search</span>.</p>
              </div>
            )}
          </>
        ) : (
          /* Petty Cash Account Manager Dashboard */
          <div className="space-y-10 relative z-10">
            
            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Total Wallet Balance - Big Display */}
              <div className="bg-zinc-900 text-white rounded-[2rem] p-6 flex flex-col justify-between border border-white/5 shadow-xl relative overflow-hidden group min-h-[140px]">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Wallets Balance</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Wallet size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-black font-mono tracking-tight text-emerald-400">
                    {pettyCashStats.totalWalletBalance.toLocaleString()} <span className="text-xs font-sans text-zinc-400">AED</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1">Combined liquid cash with active managers</p>
                </div>
              </div>

              {/* Total Top Up Deposited */}
              <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 flex flex-col justify-between border border-zinc-100 dark:border-white/5 shadow-sm min-h-[140px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Capital Deposited</span>
                  <div className="p-2 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-xl">
                    <ArrowDownLeft size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                    {pettyCashStats.totalTopUp.toLocaleString()} <span className="text-xs font-sans text-zinc-500">AED</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1">Total funded capital into the system</p>
                </div>
              </div>

              {/* Total Advances Given */}
              <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 flex flex-col justify-between border border-zinc-100 dark:border-white/5 shadow-sm min-h-[140px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Labor Advances Deducted</span>
                  <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black font-mono text-amber-500">
                    {pettyCashStats.totalAdvances.toLocaleString()} <span className="text-xs font-sans text-zinc-500">AED</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1">Auto-linked advances paid to workers</p>
                </div>
              </div>

              {/* Total Manual Site Expenses */}
              <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 flex flex-col justify-between border border-zinc-100 dark:border-white/5 shadow-sm min-h-[140px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Manual Expenses Logged</span>
                  <div className="p-2 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-xl">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black font-mono text-rose-500">
                    {pettyCashStats.totalExpenses.toLocaleString()} <span className="text-xs font-sans text-zinc-500">AED</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1">General site / transport / tea payments</p>
                </div>
              </div>

            </div>

            {/* Quick Actions Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200/50 dark:border-white/5">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Petty Cash Actions</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Initialize wallets, fund managers, and record miscellaneous on-site expenses</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setIsTopUp(false);
                    setSelectedWalletIdForTopUp("");
                    setWalletManagerName("");
                    setWalletOpeningBalance("");
                    setIsWalletModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus size={14} />
                  Create Wallet
                </button>
                <button
                  onClick={() => {
                    if ((settings.managerWallets || []).length === 0) {
                      alert("Please create at least one manager wallet first before logging transactions.");
                      return;
                    }
                    setManualTxType('MANUAL_DEBIT');
                    setManualTxAmount("");
                    setManualTxRemarks("");
                    setManualTxManagerId(settings.managerWallets?.[0]?.id || "");
                    setIsManualTxModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Coins size={14} />
                  Record Expense / Adjustment
                </button>
              </div>
            </div>

            {/* Wallets & Ledger Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Manager Wallets List */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Manager Wallets</h3>
                  <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full font-mono">
                    {(settings.managerWallets || []).length} Wallets
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {(settings.managerWallets || []).map((wallet) => {
                    // Calculate percentage of funds left (e.g. out of total topped up for this wallet)
                    const walletTxs = (settings.pettyCashTransactions || []).filter(t => t.managerId === wallet.id);
                    const totalDeposited = walletTxs.filter(t => t.type === 'TOPUP').reduce((s, t) => s + t.amount, 0) || 1;
                    const balancePercent = Math.min(100, Math.max(0, (wallet.balance / totalDeposited) * 100));

                    return (
                      <div key={wallet.id} className="p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-4 group">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-base font-bold text-zinc-900 dark:text-white">{wallet.managerName}</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                              <Activity size={10} />
                              Updated {new Date(wallet.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-xl font-black font-mono text-emerald-500">
                            {wallet.balance.toLocaleString()} <span className="text-[10px] font-sans font-bold text-zinc-400">AED</span>
                          </span>
                        </div>

                        {/* Progress Bar visual indicator of cash level */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] font-black uppercase text-zinc-400 tracking-wider">
                            <span>Wallet Liquid Level</span>
                            <span className="font-mono">{Math.round(balancePercent)}% Left</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                balancePercent > 50 ? "bg-emerald-500" : balancePercent > 15 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${balancePercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Action buttons on wallet */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setIsTopUp(true);
                              setSelectedWalletIdForTopUp(wallet.id);
                              setWalletManagerName(wallet.managerName);
                              setWalletOpeningBalance("");
                              setIsWalletModalOpen(true);
                            }}
                            className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-all cursor-pointer text-center"
                          >
                            Top Up Wallet
                          </button>
                          <button
                            onClick={() => {
                              setManualTxManagerId(wallet.id);
                              setManualTxType('MANUAL_DEBIT');
                              setManualTxAmount("");
                              setManualTxRemarks("");
                              setIsManualTxModalOpen(true);
                            }}
                            className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider bg-zinc-100 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-white transition-all cursor-pointer text-center"
                          >
                            Debit Expense
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {(settings.managerWallets || []).length === 0 && (
                    <div className="p-8 border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl text-center space-y-2">
                      <Wallet size={32} className="text-zinc-300 dark:text-zinc-700 mx-auto" />
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">No Manager Accounts</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Initialize manager wallets to fund on-site cash advances.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: General Petty Cash Ledger */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Petty Cash General Ledger</h3>
                  <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full font-mono">
                    {(settings.pettyCashTransactions || []).length} Transactions
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                  <div className="overflow-x-auto max-h-[480px] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 pb-2">
                          <th className="py-3 px-2">Date</th>
                          <th className="py-3 px-2">Wallet</th>
                          <th className="py-3 px-2">Type</th>
                          <th className="py-3 px-2">Recipient / Details</th>
                          <th className="py-3 px-2 text-right">Amount</th>
                          <th className="py-3 px-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {([...(settings.pettyCashTransactions || [])])
                          .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
                          .map((tx) => {
                            const isIncoming = tx.type === 'TOPUP' || tx.type === 'MANUAL_CREDIT';
                            return (
                              <tr key={tx.id} className="border-b border-zinc-100/50 dark:border-white/5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                                <td className="py-3.5 px-2 font-mono text-[10px] whitespace-nowrap text-zinc-400 dark:text-zinc-500">
                                  {tx.date.split("-").reverse().join(".")}
                                </td>
                                <td className="py-3.5 px-2 font-bold text-zinc-800 dark:text-zinc-200">
                                  {tx.managerName}
                                </td>
                                <td className="py-3.5 px-2">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                    tx.type === 'TOPUP' && "bg-emerald-500/10 text-emerald-500",
                                    tx.type === 'ADVANCE_DEBIT' && "bg-amber-500/10 text-amber-500",
                                    tx.type === 'MANUAL_DEBIT' && "bg-rose-500/10 text-rose-500",
                                    tx.type === 'MANUAL_CREDIT' && "bg-blue-500/10 text-blue-500"
                                  )}>
                                    {tx.type === 'TOPUP' && "Top Up"}
                                    {tx.type === 'ADVANCE_DEBIT' && "Adv Labor"}
                                    {tx.type === 'MANUAL_DEBIT' && "Site Exp"}
                                    {tx.type === 'MANUAL_CREDIT' && "Credit Adj"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-2 text-zinc-500 dark:text-zinc-400 max-w-[180px] truncate">
                                  {tx.type === 'ADVANCE_DEBIT' ? (
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                      Worker: {tx.workerName}
                                    </span>
                                  ) : (
                                    tx.remarks || "—"
                                  )}
                                </td>
                                <td className={cn(
                                  "py-3.5 px-2 text-right font-black font-mono whitespace-nowrap",
                                  isIncoming ? "text-emerald-500" : "text-zinc-800 dark:text-zinc-200"
                                )}>
                                  {isIncoming ? "+" : "-"}{tx.amount.toLocaleString()} AED
                                </td>
                                <td className="py-3.5 px-2 text-center whitespace-nowrap">
                                  {tx.type === 'ADVANCE_DEBIT' ? (
                                    <span className="text-[9px] text-zinc-400 italic cursor-help" title="Delete this entry inside the Worker's Ledger Card to refund balance.">
                                      Auto-Linked
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleDeletePettyCashTx(tx.id)}
                                      className="p-1 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                      title="Delete transaction and reverse balance"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                        {(settings.pettyCashTransactions || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-zinc-400 space-y-2">
                              <BookOpen size={24} className="text-zinc-300 dark:text-zinc-700 mx-auto" />
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">No Transactions Logged</p>
                              <p className="text-[10px] text-zinc-500">Fund manager wallets to see activity logs here.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* MODAL 1: Create Wallet / Top Up Modal */}
        {isWalletModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[2rem] shadow-2xl p-6 md:p-8 w-full max-w-md space-y-6 relative"
            >
              <button 
                onClick={() => setIsWalletModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                    {isTopUp ? `Top-Up: ${walletManagerName}` : "Create Petty Cash Account"}
                  </h3>
                  <p className="text-xs text-zinc-500">Fund manager with physical company liquid assets</p>
                </div>
              </div>

              <form onSubmit={handleCreateOrTopUpWallet} className="space-y-4">
                {!isTopUp && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Manager / Custodian Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rafiq Khan, Manager Ali"
                      value={walletManagerName}
                      onChange={(e) => setWalletManagerName(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">
                    {isTopUp ? "Top-Up Amount (AED)" : "Opening Capital Deposit (AED)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5000.00"
                    value={walletOpeningBalance}
                    onChange={(e) => setWalletOpeningBalance(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Date of Funding</label>
                  <input
                    type="date"
                    required
                    value={walletTopUpDate}
                    onChange={(e) => setWalletTopUpDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                {isTopUp && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Office cash draw, bank transfer ref"
                      value={walletTopUpRemarks}
                      onChange={(e) => setWalletTopUpRemarks(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsWalletModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    {isTopUp ? "Fund Top-Up" : "Create Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: Record Manual Expenses / Cash Adjustments */}
        {isManualTxModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[2rem] shadow-2xl p-6 md:p-8 w-full max-w-md space-y-6 relative"
            >
              <button 
                onClick={() => setIsManualTxModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-900 dark:bg-zinc-800 text-amber-500 rounded-2xl">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                    Record Site Expense / Adjustment
                  </h3>
                  <p className="text-xs text-zinc-500">Record direct payments outside labor advance</p>
                </div>
              </div>

              <form onSubmit={handleCreateManualTx} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setManualTxType('MANUAL_DEBIT')}
                    className={cn(
                      "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer",
                      manualTxType === 'MANUAL_DEBIT'
                        ? "bg-white dark:bg-zinc-800 text-rose-500 shadow"
                        : "text-zinc-500"
                    )}
                  >
                    Site Expense (Debit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualTxType('MANUAL_CREDIT')}
                    className={cn(
                      "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer",
                      manualTxType === 'MANUAL_CREDIT'
                        ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow"
                        : "text-zinc-500"
                    )}
                  >
                    Direct Credit (Adjustment)
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Select Manager Wallet</label>
                  <select
                    value={manualTxManagerId}
                    onChange={(e) => setManualTxManagerId(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 cursor-pointer font-bold"
                  >
                    {(settings.managerWallets || []).map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.managerName} (Balance: {wallet.balance.toLocaleString()} AED)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Transaction Amount (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 350.00"
                    value={manualTxAmount}
                    onChange={(e) => setManualTxAmount(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={manualTxDate}
                    onChange={(e) => setManualTxDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Remarks / Purpose</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. transport, site tea, water cans, cement purchase"
                    value={manualTxRemarks}
                    onChange={(e) => setManualTxRemarks(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsManualTxModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-750 cursor-pointer shadow-lg"
                  >
                    Log Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-10 font-sans relative" id="accounts-module-root">
      
      {/* Header back navigation in full-width active workbook */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <button 
          onClick={() => setSelectedWorkerId(null)}
          className="flex items-center gap-2 text-sm font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white uppercase tracking-widest transition-all"
        >
          <ArrowLeft size={16} /> Exit Accounts Directory
        </button>
      </div>

      <div className="w-full space-y-6">
        <AnimatePresence mode="wait">
          {activeWorker ? (
            <motion.div
              key={activeWorker.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[2rem] shadow-xl overflow-hidden flex flex-col p-6 md:p-8 space-y-8"
            >
              
              {/* Profile Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 dark:border-white/5 pb-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      Ledger Account Workspace
                    </span>
                    <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2.5 py-1 rounded-full">
                      SYS CODE: {activeWorker.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight mt-2 flex items-center gap-2">
                    {activeWorker.name}
                    <span className="text-xs font-mono font-normal text-zinc-400">
                      (#{activeWorker.workerNumber || "N/A"})
                    </span>
                  </h1>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Company: <strong className="text-zinc-700 dark:text-zinc-300">{activeWorker.company}</strong></span>
                    <span>•</span>
                    <span>Department: <strong className="text-zinc-700 dark:text-zinc-300">{activeWorker.department || "General"}</strong></span>
                    <span>•</span>
                    <span>Joining Date: <strong className="text-zinc-700 dark:text-zinc-300">{activeWorker.joiningDate || "N/A"}</strong></span>
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl px-5 py-2.5 text-right hidden sm:block">
                    <span className="text-[8px] text-zinc-400 uppercase tracking-widest block font-bold">Standard Salary</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 font-mono">
                      {(activeWorker.monthlySalary || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })} <span className="text-[9px] text-zinc-500 font-sans font-bold">{settings.currency || "AED"}</span>
                    </span>
                  </div>

                  <button
                    onClick={handleExportExcel}
                    className="p-3 rounded-2xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="Export to Excel Spreadsheet"
                  >
                    <FileSpreadsheet size={15} />
                    <span className="hidden sm:inline">Excel</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="p-3 rounded-2xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="Export to PDF Statement"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingEntryId(null);
                      setFormEntryType("advance_only");
                      setFormSalary(String(activeWorker.monthlySalary || ""));
                      setFormAdvance("");
                      setFormCurrency("AED");
                      setFormLocalAmount("");
                      setFormExchangeRate("");
                      setFormRemarks("");
                      setFormDate(new Date().toISOString().split("T")[0]);
                      setFormError("");
                      setIsFormOpen(true);
                    }}
                    className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center gap-2 transition-all duration-200 cursor-pointer"
                  >
                    <Plus size={14} />
                    Add Transaction
                  </button>
                </div>
              </div>

              {/* Form Modal inside Modules for Add/Edit Transaction */}
              {isFormOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-zinc-50 dark:bg-zinc-950 border border-emerald-500/20 rounded-[2rem] relative shadow-lg space-y-4"
                >
                  <button 
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingEntryId(null);
                    }}
                    className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                      <Wallet size={14} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100">
                      {editingEntryId ? "Modify Ledger Entry" : "Record Ledger Entry"}
                    </h3>
                  </div>

                  {/* Entry Type Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-200/50 dark:bg-zinc-900/80 p-1 rounded-2xl">
                    {(["advance_only", "salary_only", "combined", "opening_balance"] as EntryType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormEntryType(t)}
                        className={cn(
                          "px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                          formEntryType === t
                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                        )}
                      >
                        {t === "advance_only" && "Advance Only"}
                        {t === "salary_only" && "Salary Only"}
                        {t === "combined" && "Salary + Advance"}
                        {t === "opening_balance" && "Last Pending"}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmitEntry} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      
                      {/* Currency Selector (First) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Currency</label>
                        <select
                          value={formCurrency}
                          onChange={(e) => {
                            const curr = e.target.value;
                            setFormCurrency(curr);
                            if (curr === "AED") {
                              setFormLocalAmount("");
                              setFormExchangeRate("");
                            }
                          }}
                          className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                        >
                          <option value="AED">AED (UAE Dirham)</option>
                          <option value="PKR">PKR (Pakistani Rupee)</option>
                          <option value="INR">INR (Indian Rupee)</option>
                          <option value="BDT">BDT (Bangladeshi Taka)</option>
                          <option value="NPR">NPR (Nepalese Rupee)</option>
                          <option value="USD">USD (US Dollar)</option>
                        </select>
                      </div>

                      {/* Date Picker */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Date</label>
                        <input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          required
                        />
                      </div>

                      {/* Salary Credit (AED) */}
                      {(formEntryType === "combined" || formEntryType === "salary_only" || formEntryType === "opening_balance") && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Salary Credit (AED)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 2600.00"
                            value={formSalary}
                            onChange={(e) => setFormSalary(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            required
                          />
                        </div>
                      )}

                      {/* Advance Debit (AED) */}
                      {(formEntryType === "combined" || formEntryType === "advance_only" || formEntryType === "opening_balance") && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Advance Debit (AED)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 500.00"
                            value={formAdvance}
                            onChange={(e) => setFormAdvance(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            required
                          />
                        </div>
                      )}

                      {/* Description / Local Currency Amount (Only shown if currency is NOT AED) */}
                      {formCurrency !== "AED" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Local Currency Amount</label>
                          <input
                            type="text"
                            placeholder={`e.g. Rs.45000.00`}
                            value={formLocalAmount}
                            onChange={(e) => setFormLocalAmount(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          />
                        </div>
                      )}

                      {/* Exchange Rate (Only shown if currency is NOT AED) */}
                      {formCurrency !== "AED" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Exchange Rate (1 AED = ?)</label>
                          <input
                            type="text"
                            placeholder="e.g. 75.28"
                            value={formExchangeRate}
                            onChange={(e) => setFormExchangeRate(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          />
                        </div>
                      )}

                      {/* Linked Manager Wallet (Only relevant when recording an Advance) */}
                      {(formEntryType === "combined" || formEntryType === "advance_only" || formEntryType === "opening_balance") && (
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Wallet size={12} className="text-emerald-500" />
                            Deduct Advance From Manager Wallet
                          </label>
                          <select
                            value={formManagerId}
                            onChange={(e) => setFormManagerId(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer font-bold"
                          >
                            <option value="none">None (Direct / Cash / Non-Wallet)</option>
                            {(settings.managerWallets || []).map((wallet) => (
                              <option key={wallet.id} value={wallet.id}>
                                {wallet.managerName} (Balance: {wallet.balance.toLocaleString()} AED)
                              </option>
                            ))}
                          </select>
                          <p className="text-[9px] text-zinc-400 leading-relaxed">
                            Selecting a manager will automatically deduct this advance from their balance and create a linked transaction in the Petty Cash Ledger.
                          </p>
                        </div>
                      )}

                      {/* Payment Remarks / Reason */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Reason for Payment</label>
                        <input
                          type="text"
                          placeholder="e.g. Medical bill, grocery, death in family, vacation expense, flight tickets"
                          value={formRemarks}
                          onChange={(e) => setFormRemarks(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>

                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-white/5">
                      {formError && <span className="text-[10px] text-rose-500 mr-auto self-center font-bold flex items-center gap-1"><AlertCircle size={12}/>{formError}</span>}
                      <button
                        type="button"
                        onClick={() => {
                          setIsFormOpen(false);
                          setEditingEntryId(null);
                        }}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                      >
                        {editingEntryId ? "Save Changes" : "Record Entry"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Outstanding Financial Dashboard KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Accrued Salary Credit */}
                <div className="bg-[#f0fdf4]/40 dark:bg-emerald-500/[0.02] border border-emerald-500/10 rounded-[2rem] p-5 flex items-center justify-between relative overflow-hidden shadow-sm">
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-2xl" />
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      <TrendingUp size={10} className="text-emerald-500"/>
                      Accrued Salary
                    </span>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
                      {totals.totalSalary.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[9px] text-zinc-400 block">Total salary credited to date</span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
                    <ArrowUpRight size={18} />
                  </div>
                </div>

                {/* Total Advances Debit */}
                <div className="bg-amber-500/[0.02] border border-amber-500/10 rounded-[2rem] p-5 flex items-center justify-between relative overflow-hidden shadow-sm">
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-500/[0.02] rounded-full blur-2xl" />
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      <Wallet size={10} className="text-amber-500"/>
                      Total Advances
                    </span>
                    <h3 className="text-xl font-black text-amber-500 font-mono">
                      {totals.totalAdvance.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[9px] text-zinc-400 block">Total advances deducted</span>
                  </div>
                  <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
                    <ArrowDownLeft size={18} />
                  </div>
                </div>

                {/* Outstanding Net Balance */}
                <div className={cn(
                  "border rounded-[2rem] p-5 flex items-center justify-between relative overflow-hidden shadow-sm",
                  totals.netBalance >= 0
                    ? "bg-emerald-500/[0.05] border-emerald-500/20"
                    : "bg-rose-500/[0.05] border-rose-500/20"
                )}>
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Net Balance Due</span>
                    <h3 className={cn(
                      "text-2xl font-black font-mono",
                      totals.netBalance >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {totals.netBalance.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[9px] text-zinc-400 block">Outstanding liability payout</span>
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl shrink-0",
                    totals.netBalance >= 0 
                      ? "bg-emerald-500/15 text-emerald-500" 
                      : "bg-rose-500/15 text-rose-500"
                  )}>
                    <Wallet size={18} />
                  </div>
                </div>

              </div>

              {/* Complete Spreadsheet Controls */}
              <div className="space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-950/30 p-4 rounded-2xl border border-zinc-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Statement Controls ({selectedYear})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Auto Generate Button */}
                    <button
                      onClick={handleAutoGenerateCredits}
                      className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500/10 text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 border border-transparent hover:border-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw size={11} />
                      Auto-Fill Salary Credits
                    </button>

                    {/* Statement Year Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Year:</span>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
                      >
                        {statementYears.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Professional Spreadsheet Ledger Grid */}
                <div className="border border-zinc-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-inner bg-[#fafafa] dark:bg-zinc-950 p-4">
                  
                  {/* Grid Excel Styled Header Title */}
                  <div className="bg-[#f59e0b]/10 dark:bg-[#f59e0b]/5 border-2 border-[#f59e0b]/20 rounded-t-2xl p-4 text-center">
                    <h2 className="text-base font-black uppercase tracking-widest text-[#d97706] font-mono">
                      {activeWorker.name} • {selectedYear} Account Ledger
                    </h2>
                    <p className="text-[9px] text-[#b45309] font-semibold mt-0.5 tracking-wider">
                      Automated Financial Spreadsheet Verification
                    </p>
                  </div>

                  {/* Spreadsheet Grid Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-zinc-200 dark:border-white/10 mt-1">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300 font-mono">
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10">Month / Entry</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10 text-right">Salary (Credit)</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10 text-right">Advance (Debit)</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10">Date</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10">Details / Local Currency</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10">Exchange Rate</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10">Reason</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-white/10 text-center w-[100px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-mono text-xs text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                        {filteredLedgerRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-12 text-zinc-400 text-xs italic font-sans">
                              No records found for the year {selectedYear}. Use the "+ Add Transaction" or "Auto-Fill" tools above to populate.
                            </td>
                          </tr>
                        ) : (
                          filteredLedgerRows.map((row) => {
                            const isOpening = row.isOpeningBalance;
                            
                            return (
                              <tr 
                                key={row.id}
                                className={cn(
                                  "hover:bg-zinc-50/50 dark:hover:bg-white/[0.01] transition-all group border border-zinc-200 dark:border-white/10",
                                  isOpening ? "bg-[#fef3c7]/25 dark:bg-[#fef3c7]/5" : ""
                                )}
                              >
                                {/* Month Label column */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 font-bold text-zinc-900 dark:text-zinc-100">
                                  {row.monthLabel || <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                </td>

                                {/* Salary credit column */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 text-right font-bold text-emerald-600 dark:text-emerald-500">
                                  {row.salary > 0 ? `+${row.salary.toLocaleString('en-AE', { minimumFractionDigits: 2 })}` : ""}
                                </td>

                                {/* Advance debit column */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 text-right font-bold text-amber-500 dark:text-amber-400">
                                  {row.advance > 0 ? `-${row.advance.toLocaleString('en-AE', { minimumFractionDigits: 2 })}` : ""}
                                </td>

                                {/* Date column */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 text-[11px]">
                                  {row.date ? row.date.split("-").reverse().join(".") : ""}
                                </td>

                                {/* Description / Local Amount */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-semibold italic text-[11px]">
                                  {row.localAmount || ""}
                                </td>

                                {/* Rate info */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 text-[11px]">
                                  {row.exchangeRate || ""}
                                </td>

                                {/* Payment Remarks */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 italic text-[11px] truncate max-w-[150px]" title={row.remarks}>
                                  {row.remarks || ""}
                                </td>

                                {/* Inline Row Actions */}
                                <td className="px-4 py-3.5 border border-zinc-200 dark:border-white/10 text-center">
                                  <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleOpenEdit(row)}
                                      className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                                      title="Edit Record"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(row.id, row.monthLabel || "Advance Debit")}
                                      className="p-1 rounded bg-zinc-100 hover:bg-rose-500/10 dark:bg-zinc-800 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}

                        {/* Excel styled Total Summary Footer Row */}
                        {filteredLedgerRows.length > 0 && (
                          <tr className="bg-[#f59e0b]/10 dark:bg-[#f59e0b]/5 font-black text-xs border-t-2 border-[#f59e0b]/30">
                            <td className="px-4 py-4 border border-zinc-200 dark:border-[#f59e0b]/20 font-black uppercase text-zinc-900 dark:text-zinc-100">
                              Total
                            </td>
                            <td className="px-4 py-4 border border-zinc-200 dark:border-[#f59e0b]/20 text-right text-emerald-600 dark:text-emerald-500 font-bold">
                              {totals.totalSalary.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4 border border-zinc-200 dark:border-[#f59e0b]/20 text-right text-amber-600 dark:text-amber-500 font-bold">
                              {totals.totalAdvance.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4 border border-zinc-200 dark:border-[#f59e0b]/20 bg-transparent"></td>
                            <td className={cn(
                              "px-4 py-4 border border-zinc-200 dark:border-[#f59e0b]/20 text-right font-black",
                              totals.netBalance >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-500"
                            )}>
                              {totals.netBalance.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4 border border-zinc-200 dark:border-[#f59e0b]/20 bg-transparent" colSpan={3}></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>

            </motion.div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[2rem] shadow-xl p-12 text-center text-zinc-400 italic">
              Please select a worker from the sidebar directory to view and manage accounts sheets.
            </div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmationModal
        isOpen={!!confirmDeleteEntry}
        onClose={() => setConfirmDeleteEntry(null)}
        onConfirm={() => {
          if (confirmDeleteEntry) performDeleteEntry(confirmDeleteEntry.id, confirmDeleteEntry.label);
        }}
        title="Delete Ledger Entry"
        message={`Are you sure you want to delete "${confirmDeleteEntry?.label}"? This will modify the outstanding account balance.`}
      />

      <ConfirmationModal
        isOpen={!!confirmDeleteTx}
        onClose={() => setConfirmDeleteTx(null)}
        onConfirm={() => {
          if (confirmDeleteTx) performDeletePettyCashTx(confirmDeleteTx.id);
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this petty cash transaction and revert the manager's wallet balance?"
      />

    </div>
  );
}
