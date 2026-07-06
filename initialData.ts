import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import { Worker, SystemSettings, AttendanceRecord, DeleteRequest } from '../types';
import { Edit2, Trash2, Search, Download, Upload, FileSpreadsheet, PlusCircle, FileText, Building2, RotateCcw, Folder, X, ArrowRight } from 'lucide-react';
import { cn, formatCurrency , getSiteSettings } from '../lib/utils';
import { SheetModal } from './SheetModal';
import { ConfirmationModal } from './ConfirmationModal';
import { motion, AnimatePresence } from 'motion/react';
import Fuse from 'fuse.js';

interface StaffRowProps {
  worker: Worker;
  index: number;
  settings: SystemSettings;
  isAdmin: boolean;
  selectedWorkers: string[];
  statusFilter: string;
  attendance: AttendanceRecord[];
  summary: { p: number, totalHours: number, totalOTHours: number, finalSalary: number, hasAttendanceOnNonSunday: boolean };
  toggleWorkerSelection: (id: string) => void;
  onViewWorkerDetail: (worker: Worker) => void;
  onEditWorker: (worker: Worker) => void;
  setWorkerToDelete: (id: string) => void;
  onTransferWorker: (worker: Worker) => void;
  onDeleteRequest?: (request: any) => Promise<void>;
  isMasterControlLocked?: boolean;
}

const StaffRow = memo(({
  worker,
  index,
  settings,
  isAdmin,
  selectedWorkers,
  statusFilter,
  attendance,
  summary,
  toggleWorkerSelection,
  onViewWorkerDetail,
  onEditWorker,
  setWorkerToDelete,
  onTransferWorker,
  onDeleteRequest,
  isMasterControlLocked = false
}: StaffRowProps) => {
  const isAbsent = !summary.hasAttendanceOnNonSunday && worker.status === 'Active';

  const handleDeleteClick = () => {
    if (isMasterControlLocked) {
      if (onDeleteRequest) {
        onDeleteRequest({
          type: 'WORKER',
          targetId: worker.id,
          label: `Worker: ${worker.name} (${worker.workerNumber})`,
          details: `Delete worker ${worker.name} and all related data.`
        });
      }
    } else {
      setWorkerToDelete(worker.id);
    }
  };

  return (
    <tr className={cn(
      "hover:bg-[#F5F5F7]/80 dark:hover:bg-zinc-800/50 transition-colors group",
      selectedWorkers.includes(worker.id) && "bg-teal-50/50 dark:bg-teal-900/20",
      isAbsent && (statusFilter === 'Absent' || statusFilter === 'Missing' || statusFilter === 'All') && "bg-red-50/80 dark:bg-red-900/20"
    )}>
      <td className="px-4 py-3">
        <input 
          type="checkbox" 
          checked={selectedWorkers.includes(worker.id)}
          onChange={() => toggleWorkerSelection(worker.id)}
          className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
        />
      </td>
      <td className="px-4 py-3 text-[10px] font-mono text-zinc-500">{index + 1}</td>
      <td className="px-4 py-3">
        <button 
          onClick={() => onViewWorkerDetail(worker)}
          className={cn(
            "text-sm font-semibold hover:text-emerald-500 transition-colors text-left",
            isAbsent && (statusFilter === 'Absent' || statusFilter === 'Missing' || statusFilter === 'All') ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"
          )}
        >
          {worker.name}
        </button>
      </td>
      <td className="px-4 py-3 text-[10px] font-mono text-zinc-500">{worker.workerNumber}</td>
      <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
        {formatCurrency(worker.monthlySalary, settings.currency)}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{summary.totalHours}h</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400">{summary.totalOTHours}h</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-zinc-700 dark:text-zinc-300">{worker.company}</div>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{worker.role}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {isAdmin && (
            <>
              <button 
                onClick={() => onTransferWorker(worker)}
                title="Transfer Company"
                className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
              >
                <Building2 size={14} />
              </button>
              <button 
                onClick={() => onEditWorker(worker)}
                title="Edit Worker"
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#E5E5E5] dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={handleDeleteClick}
                title="Delete Worker"
                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

StaffRow.displayName = 'StaffRow';

interface StaffInfoProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  settings: SystemSettings;
  isAdmin: boolean;
  onAddNewWorker: () => void;
  onEditWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onDeleteRequest?: (request: Omit<DeleteRequest, 'id' | 'requestDate' | 'status'>) => Promise<void>;
  onDeleteAllWorkers: () => void;
  onImportWorkers: (workers: Worker[]) => void;
  onViewWorkerDetail: (worker: Worker) => void;
  onManualCleanup: () => void;
  onUpdateWorkers?: (updatedWorkers: Worker[]) => Promise<void>;
  selectedMonth: Date;
  isMasterControlLocked?: boolean;
}

export const StaffInfo: React.FC<StaffInfoProps> = ({
  workers,
  attendance,
  settings,
  isAdmin,
  onAddNewWorker,
  onEditWorker,
  onDeleteWorker,
  onDeleteRequest,
  onDeleteAllWorkers,
  onImportWorkers,
  onViewWorkerDetail,
  onManualCleanup,
  onUpdateWorkers,
  selectedMonth,
  isMasterControlLocked = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'On Leave' | 'Suspended' | 'Terminated' | 'Absent' | 'Missing'>('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedSheet, setSelectedSheet] = useState<string>('Main Sheet');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [transferringWorker, setTransferringWorker] = useState<Worker | null>(null);

  const handleEditWorker = useCallback((worker: Worker) => {
    onEditWorker(worker);
  }, [onEditWorker]);
  const [alertMessage, setAlertMessage] = useState<{ title: string, message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sheets = useMemo(() => {
    const existingSheets = Array.from(new Set(workers.map(w => w.sheetName || 'Main Sheet')));
    if (!existingSheets.includes('Main Sheet')) existingSheets.unshift('Main Sheet');
    return existingSheets.sort();
  }, [workers]);

  const uniqueCompanies = useMemo(() => Array.from(new Set(workers.map(w => w.company).filter(Boolean))).sort(), [workers]);
  const uniqueDepartments = useMemo(() => Array.from(new Set(workers.map(w => w.department).filter(Boolean))).sort(), [workers]);
  const uniqueRoles = useMemo(() => Array.from(new Set(workers.map(w => w.role).filter(Boolean))).sort(), [workers]);

  const summariesMap = useMemo(() => {
    const map = new Map<string, { p: number, totalHours: number, totalOTHours: number, finalSalary: number, hasAttendanceOnNonSunday: boolean }>();
    const workersMap = new Map<string, Worker>();
    
    // Initialize maps
    workers.forEach(w => {
      workersMap.set(w.id, w);
      map.set(w.id, { p: 0, totalHours: 0, totalOTHours: 0, finalSalary: 0, hasAttendanceOnNonSunday: false });
    });

    const standardHours = 9;
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // PERFORMANCE: Filter attendance once before the inner loops using timezone-independent string split
    const currentMonthAttendance = attendance.filter(record => {
      if (!record.date) return false;
      const [y, m] = record.date.split('-');
      return parseInt(y, 10) === year && (parseInt(m, 10) - 1) === month;
    });

    const recordsByWorkerByDate = new Map<string, Map<string, typeof currentMonthAttendance>>();
    
    currentMonthAttendance.forEach(record => {
      record.workerIds?.forEach(workerId => {
        if (!recordsByWorkerByDate.has(workerId)) recordsByWorkerByDate.set(workerId, new Map());
        const workerDates = recordsByWorkerByDate.get(workerId)!;
        if (!workerDates.has(record.date)) workerDates.set(record.date, []);
        workerDates.get(record.date)!.push(record);
      });
    });

    workersMap.forEach((worker, workerId) => {
      const summary = map.get(workerId);
      if (!summary) return;
      
      const workerDates = recordsByWorkerByDate.get(workerId);

      let maxDayWithAttendance = 0;
      if (workerDates) {
        for (const dateStr of workerDates.keys()) {
          const [,, dayStr] = dateStr.split('-');
          const dNum = parseInt(dayStr, 10);
          if (dNum > maxDayWithAttendance) {
            maxDayWithAttendance = dNum;
          }
        }
      }

      const monthlySalary = Number(worker.monthlySalary) || 0;
      const hourlyRate = monthlySalary / (30 * standardHours);
      const otRate = hourlyRate;

      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const curDate = new Date(year, month, d);
        const isSunday = curDate.getDay() === 0;

        const dayRecords = workerDates ? (workerDates.get(dateStr) || []) : [];
        let dayNorm = 0;
        let dayOT = 0;
        let isAbsent = true;

        dayRecords.forEach(r => {
          if (r.status !== 'absent') {
            isAbsent = false;
            const h = Number(r.hours) || 0;
            const ot = Number(r.otHours) || 0;
            const rSiteConfig = getSiteSettings(r.site || "", settings.siteSettings);
            const stdHours = rSiteConfig?.workerStandardHours || 9;
            const calcOt = ot > 0 ? ot : Math.max(0, h - stdHours);
            const calcNorm = h > 0 ? (ot > 0 ? Math.min(Math.max(0, h - ot), stdHours) : Math.min(h, stdHours)) : 0;
            
            dayNorm += calcNorm;
            dayOT += calcOt;
          }
        });

        if (isSunday) {
          if (d > maxDayWithAttendance) {
            // Sunday in the future/unreached, do not include it
          } else {
            const isWorked = !isAbsent && (dayNorm > 0 || dayOT > 0);
            const hoursWorked = isWorked ? (dayNorm + dayOT) : 0;
            const sundayPaidHours = (hoursWorked * 1.5) + 9;

            const sNorm = Math.min(9, sundayPaidHours);
            const sOT = Math.max(0, sundayPaidHours - 9);

            summary.totalHours += sNorm;
            summary.totalOTHours += sOT;
            if (isWorked) {
              summary.p += 1;
            }
            summary.finalSalary += sundayPaidHours * hourlyRate;
          }
        } else {
          if (!isAbsent && (dayNorm > 0 || dayOT > 0)) {
            summary.p += 1;
            summary.totalHours += dayNorm;
            summary.totalOTHours += dayOT;
            summary.hasAttendanceOnNonSunday = true;
            summary.finalSalary += (dayNorm * hourlyRate) + (dayOT * otRate);
          }
        }
      }
    });

    return map;
  }, [workers, attendance, 9, selectedMonth]);

  const filteredWorkers = useMemo(() => {
    let baseWorkers = workers;
    
    if (searchTerm) {
      const fuse = new Fuse(workers, {
        keys: ['name', 'workerNumber', 'company', 'role'],
        threshold: 0.3,
        ignoreLocation: true,
      });
      baseWorkers = fuse.search(searchTerm).map(r => r.item);
    }

    return baseWorkers.filter(w => {
      let matchesStatus = false;
      if (statusFilter === 'All') {
        matchesStatus = true;
      } else if (statusFilter === 'Absent' || statusFilter === 'Missing') {
        const hasAttendance = attendance.some(a => a.workerIds?.includes(w.id));
        matchesStatus = !hasAttendance && w.status === 'Active';
      } else {
        matchesStatus = w.status === statusFilter;
      }
      
      const matchesCompany = companyFilter === 'All' || w.company === companyFilter;
      const matchesDepartment = departmentFilter === 'All' || w.department === departmentFilter;
      const matchesRole = roleFilter === 'All' || w.role === roleFilter;

      const matchesSheet = (w.sheetName || 'Main Sheet') === selectedSheet;
      
      return matchesStatus && matchesCompany && matchesDepartment && matchesRole && matchesSheet;
    });
  }, [workers, attendance, searchTerm, statusFilter, companyFilter, departmentFilter, roleFilter, selectedSheet]);

  const uniqueFilteredWorkers = useMemo(() => {
    const map = new Map<string, Worker>();
    filteredWorkers.forEach(w => {
      if (!map.has(w.id) || (w.name && !map.get(w.id)?.name)) {
        map.set(w.id, w);
      }
    });
    return Array.from(map.values());
  }, [filteredWorkers]);

  const toggleWorkerSelection = useCallback((id: string) => {
    setSelectedWorkers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const toggleAllSelection = useCallback(() => {
    if (selectedWorkers.length === filteredWorkers.length) {
      setSelectedWorkers([]);
    } else {
      setSelectedWorkers(filteredWorkers.map(w => w.id));
    }
  }, [selectedWorkers.length, filteredWorkers]);

  const handleBulkStatusUpdate = useCallback(async (status: 'Active' | 'Inactive') => {
    if (!onUpdateWorkers) return;
    const updatedWorkersList = workers.map(w => {
      if (selectedWorkers.includes(w.id)) {
        return { ...w, status: status };
      }
      return w;
    });

    try {
      await onUpdateWorkers(updatedWorkersList);
      setAlertMessage({
        title: 'Bulk Update',
        message: `Successfully updated ${selectedWorkers.length} workers to ${status}.`
      });
      setSelectedWorkers([]);
    } catch (err) {
      console.error(err);
    }
  }, [selectedWorkers, workers, onUpdateWorkers]);

  const handleBulkCompanyTransfer = useCallback(async (targetCompany: string) => {
    if (!onUpdateWorkers) return;
    const updatedWorkersList = workers.map(w => {
      if (selectedWorkers.includes(w.id)) {
        return { ...w, company: targetCompany };
      }
      return w;
    });

    try {
      await onUpdateWorkers(updatedWorkersList);
      setAlertMessage({
        title: 'Sector Transfer',
        message: `Successfully transferred ${selectedWorkers.length} selected workers to ${targetCompany}.`
      });
      setSelectedWorkers([]);
    } catch (err) {
      console.error(err);
    }
  }, [selectedWorkers, workers, onUpdateWorkers]);

  const handleImportCSV = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const newWorkers: Worker[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        
        const worker: any = {
          id: Math.random().toString(36).substr(2, 9),
          status: 'Active',
          joiningDate: new Date().toISOString().split('T')[0]
        };

        headers.forEach((header, index) => {
          const value = values[index];
          if (!value) return;

          if (header.includes('id') || header.includes('number')) worker.workerNumber = value;
          else if (header.includes('name')) worker.name = value;
          else if (header.includes('company') || header.includes('site')) worker.company = value;
          else if (header.includes('dept') || header.includes('department')) worker.department = value;
          else if (header.includes('role')) worker.role = value;
          else if (header.includes('rate') || header.includes('salary')) worker.monthlySalary = parseFloat(value) || 0;
          else if (header.includes('ot')) worker.otRatePerHour = parseFloat(value) || 0;
          else if (header.includes('sheet')) worker.sheetName = value;
          else if (header.includes('status')) worker.status = (value.toLowerCase() === 'active' || value.toLowerCase() === 'inactive') ? value : 'Active';
          else if (header.includes('date')) worker.joiningDate = value;
        });

        if (worker.name && worker.workerNumber) {
          newWorkers.push(worker as Worker);
        }
      }

      if (newWorkers.length > 0) {
        onImportWorkers(newWorkers);
        setAlertMessage({
          title: 'Import Successful',
          message: `Successfully imported ${newWorkers.length} workers from CSV.`
        });
      } else {
        setAlertMessage({
          title: 'Import Failed',
          message: 'No valid workers found in the CSV. Please ensure you have "Name" and "Worker ID" columns.'
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onImportWorkers]);

  const exportToCSV = useCallback(() => {
    const headers = ['Worker ID', 'Name', 'Company', 'Department', 'Role', 'Daily Rate', 'Total Present', 'Final Salary', 'Status'];
    const rows = filteredWorkers.map(worker => {
      const summary = summariesMap.get(worker.id) || { p: 0, totalHours: 0, totalOTHours: 0, finalSalary: 0, hasAttendanceOnNonSunday: false };
      return [
        worker.workerNumber,
        worker.name,
        worker.company,
        worker.department,
        worker.role,
        isMasterControlLocked ? "••••" : worker.monthlySalary,
        summary.p,
        isMasterControlLocked ? "••••" : summary.finalSalary,
        worker.status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      'Made by Mohammed Fahim Khan'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_dataset_${settings.payrollMonth}_${settings.payrollYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredWorkers, summariesMap, settings.payrollMonth, settings.payrollYear]);

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Master Personnel Report', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Sheet: ${selectedSheet} | Generated: ${new Date().toLocaleDateString()} | Made by Mohammed Fahim Khan`, 14, 28);

    const tableData = filteredWorkers.map((w, i) => {
      const summary = summariesMap.get(w.id) || { p: 0, totalHours: 0, totalOTHours: 0, finalSalary: 0, hasAttendanceOnNonSunday: false };
      return [
        i + 1,
        w.name,
        w.workerNumber || '-',
        w.company,
        w.role,
        summary.p,
        `${summary.finalSalary.toFixed(2)} ${settings.currency || 'AED'}`
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Name', 'Emp.No', 'Company', 'Role', 'Days', 'Salary']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });

    doc.save(`Staff_Report_${selectedSheet}.pdf`);
  };

  const exportToWord = async () => {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } = await import('docx');
    const { saveAs } = await import('file-saver');

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: "Master Personnel Report",
            heading: "Title",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Sheet: ${selectedSheet} | Made by Mohammed Fahim Khan`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  "#", "Name", "Emp.No", "Company", "Role", "Days", "Salary"
                ].map(text => new TableCell({
                  children: [new Paragraph({ text, alignment: AlignmentType.CENTER })],
                  shading: { fill: "f3f4f6" }
                }))
              }),
              ...filteredWorkers.map((w, i) => {
                const summary = summariesMap.get(w.id) || { p: 0, totalHours: 0, totalOTHours: 0, finalSalary: 0, hasAttendanceOnNonSunday: false };
                return new TableRow({
                  children: [
                    String(i + 1), w.name, w.workerNumber || '-', w.company, w.role, String(summary.p), String(summary.finalSalary.toFixed(2))
                  ].map(text => new TableCell({
                    children: [new Paragraph({ text, alignment: AlignmentType.CENTER })],
                  }))
                });
              })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Staff_Report_${selectedSheet}.docx`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-sans font-semibold text-zinc-900 dark:text-white tracking-tight leading-none mb-1">Staff Info</h2>
          <p className="text-zinc-500 text-xs font-medium">Manage permanent worker information and payroll rates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#E5E5E5] dark:bg-white/5 border border-line dark:border-white/10 rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
          >
            <Upload size={14} className="inline mr-1" /> Import
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportToPDF}
              className="px-3 py-2 bg-[#E5E5E5] dark:bg-zinc-800 border border-line dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5"
              title="Download PDF"
            >
              <FileText size={14} className="text-red-500" />
              PDF
            </button>
            <button
              onClick={exportToWord}
              className="px-3 py-2 bg-[#E5E5E5] dark:bg-zinc-800 border border-line dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5"
              title="Download Word"
            >
              <Download size={14} className="text-blue-500" />
              Word
            </button>
            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-[#E5E5E5] dark:bg-zinc-800 border border-line dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5"
              title="Download CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-500" />
              CSV
            </button>
          </div>
          <div className="h-4 w-px bg-line dark:bg-white/10 mx-1" />
          {isAdmin && (
            <button
              type="button"
              onClick={onAddNewWorker}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <PlusCircle size={14} className="inline mr-1" /> Add New
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onManualCleanup}
              className="btn-secondary flex items-center justify-center gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 !py-1.5 !px-3 text-xs"
              title="Clean up duplicate workers"
            >
              <RotateCcw size={14} />
              Cleanup
            </button>
          )}
          {isAdmin && workers.length > 0 && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg font-medium text-[10px] uppercase tracking-wider hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {sheets.map((sheet: string, index: number) => (
          <button
            key={`sheet-${sheet}-${index}`}
            onClick={() => setSelectedSheet(sheet)}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 border shadow-sm",
              selectedSheet === sheet
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-lg -translate-y-0.5"
                : "bg-white text-zinc-500 border-line hover:border-zinc-300 dark:bg-zinc-900 dark:border-white/10 dark:hover:border-white/20"
            )}
          >
            <div className={cn(
              "p-1 rounded-md transition-colors",
              selectedSheet === sheet 
                ? "bg-white/20 dark:bg-zinc-900/10" 
                : "bg-[#E5E5E5] dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
            )}>
              <Folder size={12} className={cn(
                selectedSheet === sheet ? "text-white dark:text-zinc-900" : "text-zinc-400"
              )} />
            </div>
            {sheet}
          </button>
        ))}
        <button
          onClick={() => setIsSheetModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:white hover:border-zinc-400 dark:hover:border-zinc-500"
        >
          <div className="p-1 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-md">
            <PlusCircle size={12} />
          </div>
          New Sheet
        </button>
      </div>

      <SheetModal 
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        existingSheets={sheets as string[]}
        onSave={(name) => setSelectedSheet(name)}
      />

      <ConfirmationModal 
        isOpen={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onConfirm={() => {
          if (workerToDelete) {
            onDeleteWorker(workerToDelete);
            setWorkerToDelete(null);
          }
        }}
        title="Delete Worker"
        message="Are you sure you want to delete this worker? This action will remove all their attendance and payroll data permanently."
        confirmLabel="Delete Worker"
      />

      <ConfirmationModal 
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={() => {
          onDeleteAllWorkers();
          setIsDeleteAllModalOpen(false);
        }}
        title="Delete All Workers"
        message="DANGER: Are you sure you want to delete ALL workers from the database? This action will remove all workers, attendance records, and payroll data permanently. This cannot be undone."
        confirmLabel="Delete All Workers"
      />

      <ConfirmationModal 
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        onConfirm={() => setAlertMessage(null)}
        title={alertMessage?.title || ''}
        message={alertMessage?.message || ''}
        confirmLabel="Got it"
        type="info"
      />

      {/* Transfer Worker Modal */}
      <AnimatePresence>
        {transferringWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferringWorker(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-card p-6 overflow-hidden bg-white dark:bg-zinc-900 border border-line dark:border-white/10 rounded-2xl shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Transfer Personnel</h3>
                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-0.5">Corporate Sector Allocation</p>
                  </div>
                </div>
                <button
                  onClick={() => setTransferringWorker(null)}
                  className="p-1 hover:bg-[#E5E5E5] dark:hover:bg-zinc-805 rounded-lg text-zinc-400 hover:text-zinc-650"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Worker Name:</span>
                    <span className="font-bold text-zinc-850 dark:text-zinc-100">{transferringWorker.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Trade/Role:</span>
                    <span className="text-zinc-650 dark:text-zinc-350">{transferringWorker.role || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium">ID Number:</span>
                    <span className="font-mono text-zinc-550 dark:text-zinc-405">{transferringWorker.workerNumber || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="flex-1 text-center p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">Current</p>
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 truncate">{transferringWorker.company || 'Unassigned'}</p>
                  </div>
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full shrink-0">
                    <ArrowRight size={14} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 text-center p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">Target</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">Select Below</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Select Target Company</label>
                  <select
                    id="single-transfer-company-select"
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold uppercase tracking-wide px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-zinc-800 dark:text-white cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select Company --</option>
                    {settings.companies
                      .filter(c => c !== transferringWorker.company)
                      .map(c => (
                        <option key={`transfer-option-${c}`} value={c}>{c}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-line dark:border-white/5">
                <button
                  onClick={() => setTransferringWorker(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const select = document.getElementById('single-transfer-company-select') as HTMLSelectElement;
                    const targetCompany = select?.value;
                    if (!targetCompany) return;
                    if (!onUpdateWorkers) return;

                    const updatedWorkersList = workers.map(w => {
                      if (w.id === transferringWorker.id) {
                        return { ...w, company: targetCompany };
                      }
                      return w;
                    });

                    try {
                      await onUpdateWorkers(updatedWorkersList);
                      setAlertMessage({
                        title: 'Transfer Complete',
                        message: `Successfully transferred ${transferringWorker.name} to ${targetCompany}`
                      });
                      setTransferringWorker(null);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Confirm Transfer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative glass-card rounded-xl overflow-hidden border-line dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-teal-500/20 dark:hover:border-teal-500/20 transition-all duration-300 group">
        {/* Modern teal flowing background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/3 dark:bg-teal-500/5 blur-[120px] -mr-56 -mt-56 rounded-full pointer-events-none group-hover:scale-110 transition-all duration-500 animate-pulse" />
        <div className="p-4 border-b border-line dark:border-white/10 bg-[#F5F5F7]/50 dark:bg-[#141414]/50 flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-2 flex-1 bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg border border-line dark:border-white/10 shadow-sm">
            <Search size={14} className="text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, ID, company, or role..."
              className="bg-transparent border-none focus:ring-0 text-xs font-medium w-full dark:text-white dark:placeholder-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Suggestions Bar */}
          {searchTerm.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {filteredWorkers.slice(0, 8).map((worker, index) => (
                <button
                  key={`suggestion-${worker.id}-${index}`}
                  onClick={() => {
                    setSearchTerm(worker.name);
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group"
                >
                  <div className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 group-hover:text-emerald-500">
                    {worker.name.charAt(0)}
                  </div>
                  <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white uppercase tracking-tighter">
                    {worker.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-lg text-[9px] font-black uppercase tracking-widest px-3 py-2 focus:ring-1 focus:ring-zinc-400 dark:text-white cursor-pointer"
                >
                  <option value="All">All Workers</option>
                  <option value="Active">Active Only</option>
                  <option value="Absent">Absent Workers</option>
                  <option value="Missing">Missing Records</option>
                  <option value="Inactive">Inactive Only</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              {uniqueCompanies.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Company:</span>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-lg text-[9px] font-black uppercase tracking-widest px-3 py-2 focus:ring-1 focus:ring-zinc-400 dark:text-white cursor-pointer"
                  >
                    <option value="All">All Companies</option>
                    {uniqueCompanies.map(c => <option key={`filter-company-${c}`} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {uniqueDepartments.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Department:</span>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-lg text-[9px] font-black uppercase tracking-widest px-3 py-2 focus:ring-1 focus:ring-zinc-400 dark:text-white cursor-pointer"
                  >
                    <option value="All">All Departments</option>
                    {uniqueDepartments.map(d => <option key={`filter-dept-${d}`} value={d}>{d}</option>)}
                  </select>
                </div>
              )}

              {uniqueRoles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Role:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-lg text-[9px] font-black uppercase tracking-widest px-3 py-2 focus:ring-1 focus:ring-zinc-400 dark:text-white cursor-pointer"
                  >
                    <option value="All">All Roles</option>
                    {uniqueRoles.map(r => <option key={`filter-role-${r}`} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              {selectedWorkers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pl-4 border-l border-line dark:border-white/5 animate-in fade-in slide-in-from-left-2">
                  <span className="text-[9px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">{selectedWorkers.length} selected</span>
                  <button 
                    onClick={() => handleBulkStatusUpdate('Active')}
                    className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/20"
                  >
                    Set Active
                  </button>
                  <button 
                    onClick={() => handleBulkStatusUpdate('Inactive')}
                    className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-700 text-white rounded-lg hover:opacity-90 transition-all shadow-sm shadow-zinc-900/20"
                  >
                    Set Inactive
                  </button>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-line dark:border-white/5">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Transfer To:</span>
                    <select
                      onChange={(e) => {
                        const targetComp = e.target.value;
                        if (targetComp) {
                          handleBulkCompanyTransfer(targetComp);
                          e.target.value = "";
                        }
                      }}
                      className="bg-[#E5E5E5] dark:bg-zinc-800 border-none rounded-lg text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 focus:ring-1 focus:ring-zinc-400 dark:text-white cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled hidden>Company</option>
                      {settings.companies.map(c => (
                        <option key={`bulk-transfer-${c}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F7]/80 dark:bg-zinc-900/80 border-b border-line dark:border-white/5">
                <th className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    checked={selectedWorkers.length === filteredWorkers.length && filteredWorkers.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                  />
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">S.No.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Emp.No.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Salary</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Hours</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">OT</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-white/5">
              {uniqueFilteredWorkers.map((worker, index) => (
                <StaffRow
                  key={`worker-${worker.id}-${index}`}
                  worker={worker}
                  index={index}
                  settings={settings}
                  isAdmin={isAdmin}
                  isMasterControlLocked={isMasterControlLocked}
                  selectedWorkers={selectedWorkers}
                  statusFilter={statusFilter}
                  attendance={attendance}
                  summary={summariesMap.get(worker.id) || { p: 0, totalHours: 0, totalOTHours: 0, finalSalary: 0, hasAttendanceOnNonSunday: false }}
                  toggleWorkerSelection={toggleWorkerSelection}
                  onViewWorkerDetail={onViewWorkerDetail}
                  onEditWorker={handleEditWorker}
                  setWorkerToDelete={setWorkerToDelete}
                  onTransferWorker={setTransferringWorker}
                  onDeleteRequest={onDeleteRequest}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
