import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileSpreadsheet, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { read, utils } from 'xlsx';
import { AttendanceRecord, Worker, SystemSettings } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: Worker[];
  settings: SystemSettings;
  onImportAttendance: (records: AttendanceRecord[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  workers,
  settings,
  onImportAttendance
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<AttendanceRecord[]>([]);
  const [missingNames, setMissingNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setParsedRecords([]);
    setMissingNames([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rows = utils.sheet_to_json(worksheet, { header: 1 });

      const records: AttendanceRecord[] = [];

      const unmatchedNames = new Set<string>();
      let successCount = 0;

      // Find Date column index & other columns to detect standard vs "PDF Output" format
      let dateIdx = -1, hoursIdx = -1, mpIdx = -1, companyIdx = -1, siteIdx = -1, rateIdx = -1, nameIdx = -1, idIdx = -1;
      let headerRow = -1;
      let workerStartIdx = -1;
      let isStandardFormat = false;

      for (let i = 0; i < Math.min(100, rows.length); i++) {
          let row = rows[i] as any[];
          const lRow = row.map(v => String(v||'').toLowerCase().trim());
          if (lRow.includes('date') && (lRow.includes('hours') || lRow.includes('normal hours'))) {
              headerRow = i;
              dateIdx = lRow.indexOf('date');
              hoursIdx = Math.max(lRow.indexOf('hours'), lRow.indexOf('normal hours'));
              mpIdx = lRow.indexOf('mp');
              rateIdx = Math.max(lRow.indexOf('rate'), lRow.indexOf('normal rate'));
              siteIdx = lRow.findIndex(c => c === 'site' || c === 'project site');
              companyIdx = lRow.findIndex(c => c === 'company' || c === 'company name');
              nameIdx = lRow.findIndex(c => c === 'name' || c === 'worker name' || c === 'worker');
              idIdx = lRow.findIndex(c => c === 'id' || c === 'id no' || c === 'worker number' || c === 'worker id');
              
              if (nameIdx !== -1 || idIdx !== -1) {
                  isStandardFormat = true;
              } else {
                  // Assuming horizontal format: worker names start after the last known column
                  workerStartIdx = Math.max(dateIdx, hoursIdx, mpIdx, rateIdx, siteIdx, companyIdx) + 1;
              }
              break;
          }
      }

      const aliases: Record<string, string> = {
          'akhas': 'akash', 'munawr': 'munavvar', 'najir': 'najir', 'nazir': 'najir', 'nazeer': 'najir',
          'nazim': 'najim', 'natiq': 'natiq', 'jahid': 'jahid', 'zahid': 'jahid', 'aajad': 'azad',
          'sadam': 'saddam', 'gulam': 'golam', 'jan gul': 'jan gul', 'mohammad': 'muhammad',
          'muhamad': 'muhammad', 'md': 'muhammad', 'shaikh': 'sheikh', 'shekh': 'sheikh',
          'abdulla': 'abdullah', 'abdulah': 'abdullah', 'raja': 'raja', 'babu': 'babu',
          'ali': 'ali', 'khan': 'khan', 'ahmed': 'ahmed', 'ahmad': 'ahmed', 'hussain': 'hussain',
          'husain': 'hussain', 'alaud in': 'ala uddin', 'najbud in': 'najbuddin', 'raju ind': 'raju',
          'raju varma': 'raju verma', 'rahu bangali': 'raju bengali', 'ram bechen': 'ram bechan',
          'j.khan': 'jahid', 'a.ali': 'asif', 'dinesh paswan': 'dinesh', 'tabrej azad': 'taveraj',
          'jan mohd': 'jan gul', 'jitendar': 'jitendra', 'ramzan': 'ramjan', 'lalchand': 'lal chand',
          'vinid': 'vinod', 'noushad': 'nousad', 'alauddin': 'ala uddin', 'jamil': 'jameel',
          'satwinder': 'satwindar', 'srikant': 'shrikant', 'rafique': 'rafiq', 'aslam': 'aslam',
          'rakesh': 'rakesh', 'ravi': 'rizvi'
      };

      const normalizeName = (name: string) => {
          let lower = name.toLowerCase().replace(/\s+/g, ' ').trim();
          if (aliases[lower]) return aliases[lower];
          return lower.split(' ').map(w => aliases[w] || w).join(' ');
      };

      const parseExcelDate = (dateRaw: any): string => {
          if (!dateRaw) return '';
          if (typeof dateRaw === 'number') {
              const d = new Date(Math.round((dateRaw - 25569) * 864e5));
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          const str = String(dateRaw).trim();
          
          // Pattern: 07 May 2026 or 7-May-26
          const textMatch = str.match(/(\d{1,2})[\s\-]+([A-Za-z]+)[\s\-]+(\d{2,4})/);
          if (textMatch) {
              const months: Record<string, number> = { 'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12 };
              const monthNum = months[textMatch[2].substring(0,3).toLowerCase()];
              let year = parseInt(textMatch[3]);
              if (year < 100) year += 2000;
              if (monthNum) {
                  return `${year}-${String(monthNum).padStart(2, '0')}-${String(parseInt(textMatch[1])).padStart(2, '0')}`;
              }
          }

          // Pattern: DD/MM/YYYY or DD-MM-YYYY
          const numMatch = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
          if (numMatch) {
              let day = parseInt(numMatch[1]);
              let month = parseInt(numMatch[2]);
              let year = parseInt(numMatch[3]);
              if (year < 100) year += 2000;
              // Validate to avoid mixing up MM/DD vs DD/MM.
              // We assume DD/MM/YYYY format as it is standard in UAE
              return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }

          const d = new Date(str);
          if (!isNaN(d.getTime())) {
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          return '';
      };

      if (headerRow !== -1 && !isStandardFormat) {
          for (let i = headerRow + 1; i < rows.length; i++) {
              let row = rows[i] as any[];
              if (!row || row.length === 0) continue;
              let dateRaw = row[dateIdx];
              let parsedDate = parseExcelDate(dateRaw);

              if (!parsedDate || parsedDate.includes('NaN')) continue;

              const h = parseFloat(row[hoursIdx] || 0) || 0;
              const mp = mpIdx !== -1 ? parseInt(row[mpIdx] || 0) || 0 : 1;
              const rate = rateIdx !== -1 ? parseFloat(row[rateIdx] || settings.siteRates?.[row[siteIdx]] || 16.5) || 16.5 : 16.5;
              let company = companyIdx !== -1 ? (row[companyIdx] || 'Acclaim') : 'Acclaim';
              let site = siteIdx !== -1 ? String(row[siteIdx] || '').trim() : '';
              if (site.toUpperCase() === 'ABC') site = '';
              
              if (String(company).toLowerCase() === 'aclaim') company = 'Acclaim';

              const matchedWorkerIds: string[] = [];
              if (workerStartIdx !== -1 && workerStartIdx < row.length) {
                  for (let w = workerStartIdx; w < row.length; w++) {
                      const wNameRaw = String(row[w] || '').trim();
                      if (!wNameRaw) continue;
                      
                      const wName = normalizeName(wNameRaw);
                      if (wName) {
                          let matchedWorker = workers.find(wk => normalizeName(wk.name) === wName);
                          if (!matchedWorker) {
                              matchedWorker = workers.find(wk => normalizeName(wk.name).includes(wName) || wName.includes(normalizeName(wk.name)));
                          }
                          if (!matchedWorker) {
                              // Aggressively match the first word
                              const singleName = wName.split(' ')[0];
                              if (singleName.length > 2) {
                                  matchedWorker = workers.find(wk => normalizeName(wk.name).startsWith(singleName)) || 
                                                  workers.find(wk => normalizeName(wk.name).includes(singleName));
                              }
                          }

                          if (matchedWorker) {
                              matchedWorkerIds.push(matchedWorker.id);
                          } else {
                              unmatchedNames.add(wNameRaw);
                          }
                      }
                  }
              }
              
              const isWow = (site || '').toUpperCase().includes('WOW') || (company || '').toUpperCase().includes('WOW');
              if (h >= 0 && (matchedWorkerIds.length > 0 || isWow)) {
                 const oHours = h > 9 ? h - 9 : 0;
                 const isSunday = new Date(parsedDate).getDay() === 0;
                 const effectiveRate = isSunday ? (rate * 1.5) : rate;
                 const total = (Math.min(h, 9) * rate + oHours * effectiveRate) * (mp > 0 ? mp : 1);
                 
                  records.push({
                      id: `import-${Math.random().toString(36).substr(2, 9)}`,
                      date: parsedDate,
                      hours: h,
                      otHours: oHours,
                      mp: mp,
                      companyName: company === 'Aclaim' ? 'Acclaim' : company,
                      site: site,
                      rate: rate,
                      total: total,
                                            workerIds: Array.from(new Set(matchedWorkerIds))
                  });
                  successCount++;
              }
          }
      } else {
          // Fallback basic parse
          const rangeOpt = headerRow !== -1 ? { range: headerRow } : {};
          const objectRows = utils.sheet_to_json(worksheet, rangeOpt);
          
          for (const row of objectRows as any[]) {
            const dateRaw = row['Date'] || row['date'] || null;
            let parsedDate = parseExcelDate(dateRaw);

            if (!parsedDate) continue;

            const workerNameRaw = row['Name'] || row['name'] || row['Worker Name'] || row['Worker'];
            const workerNumberRaw = row['ID'] || row['ID No'] || row['Worker Number'] || row['Worker ID'];

            let matchedWorker = null;
            if (workerNumberRaw) {
                matchedWorker = workers.find(w => w.workerNumber.toString() === workerNumberRaw.toString());
            }
            if (!matchedWorker && workerNameRaw) {
                const wName = normalizeName(workerNameRaw.toString());
                if (wName) {
                    matchedWorker = workers.find(w => normalizeName(w.name) === wName) || null;
                    if (!matchedWorker) {
                        matchedWorker = workers.find(wk => normalizeName(wk.name).includes(wName) || wName.includes(normalizeName(wk.name))) || null;
                    }
                    if (!matchedWorker) {
                        const singleName = wName.split(' ')[0];
                        if (singleName.length > 2) {
                            matchedWorker = workers.find(wk => normalizeName(wk.name).startsWith(singleName)) || 
                                            workers.find(wk => normalizeName(wk.name).includes(singleName)) || null;
                        }
                    }
                }
                if (!matchedWorker) {
                    unmatchedNames.add(workerNameRaw.toString().trim());
                }
            }

            let site = String(row['Site'] || row['Project Site'] || '').trim();
            if (site.toUpperCase() === 'ABC') site = '';
            
            const company = matchedWorker ? matchedWorker.company : (row['Company'] || 'Default');
            
            const h = parseFloat(row['Hours'] || row['Normal Hours'] || row['hours'] || 0) || 0;
            const ot = parseFloat(row['OT'] || row['OT Hours'] || row['Overtime'] || 0) || 0;

            const isWow = (site || '').toUpperCase().includes('WOW') || (company || '').toUpperCase().includes('WOW');
            if ((h > 0 || ot > 0) && (matchedWorker ? true : isWow)) {
                records.push({
                    id: `import-${Math.random().toString(36).substr(2, 9)}`,
                    date: parsedDate,
                    hours: h,
                    otHours: ot,
                    mp: 1,
                    companyName: company,
                    site: site,
                    rate: 0, 
                    total: 0,
                                        workerIds: matchedWorker ? [matchedWorker.id] : []
                });
                successCount++;
            }
          }
      }

      setParsedRecords(records);
      setMissingNames(Array.from(unmatchedNames));
      if (successCount === 0) {
          setError("No valid attendance records found in this file. Please ensure columns match the required format.");
      }
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    onImportAttendance(parsedRecords);
    setSuccess(true);
    setTimeout(() => {
        onClose();
        setSuccess(false);
        setFile(null);
        setParsedRecords([]);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 overflow-hidden border border-zinc-200 dark:border-zinc-800"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
              <FileSpreadsheet size={32} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
              Excel Data Import
            </h2>
            <p className="text-sm text-zinc-500 mt-2 font-medium">
              Upload an .xlsx or .csv file to bulk import attendance records.
            </p>
          </div>

          {!file && (
            <div className="flex flex-col gap-4">
              <div
                onClick={() => { fileInputRef.current?.click(); }}
                className="border-2 border-dashed border-blue-500/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
              >
                <Upload size={28} className="text-blue-400 group-hover:text-blue-500 mb-3 transition-colors" />
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Upload Excel</p>
                <p className="text-xs text-zinc-400 mt-1 text-center">Click to select file</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-zinc-500 mb-2">Processing document...</p>
            </div>
          )}

          {error && !isProcessing && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex gap-3 text-sm font-medium">
              <AlertTriangle size={20} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {parsedRecords.length > 0 && !isProcessing && !success && (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-emerald-700 dark:text-emerald-400 font-bold">Successfully Parsed</h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">{parsedRecords.length} records ready to import</p>
                </div>
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Check size={16} /> Import Now
                </button>
              </div>

              {missingNames.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold mb-2">
                    <AlertTriangle size={16} />
                    <h4>Unmapped Workers ({missingNames.length})</h4>
                  </div>
                  <p className="text-xs text-orange-600/80 mb-2">
                    The following names were found in the file but do not exist in your worker database. They will not be assigned to the imported records.
                  </p>
                  <div className="text-xs text-orange-700 dark:text-orange-300 bg-orange-500/5 p-3 rounded-lg max-h-32 overflow-y-auto font-mono">
                    {missingNames.join(', ')}
                  </div>
                  <p className="text-xs text-orange-600/80 mt-2 font-medium">Tip: Close this modal, add these workers in the Staff section, then try importing again.</p>
                </div>
              )}

              <button onClick={() => { setFile(null); setParsedRecords([]); setMissingNames([]); setError(null); }} className="text-xs text-zinc-400 hover:text-zinc-600 uppercase tracking-widest font-bold w-full text-center">
                  Upload a different file
              </button>
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center justify-center py-10 text-emerald-500">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <Check size={32} className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white uppercase tracking-widest">Import Complete</h3>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

