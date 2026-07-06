import React from 'react';
import ReactDOM from 'react-dom';
import { Printer, X, Eye, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { getLocalDateString } from '../lib/utils';
import { SystemSettings } from '../types';

interface WorkerCalculation {
  workerId: string;
  workerName: string;
  workerRole: string;
  sites: { siteName: string; hours: number; chargedHours: number; otHours: number }[];
  dailyHours: { [day: number]: number | 'A' };
  totalHours: number;
  totalChargedHours: number;
  totalOTHours: number;
  hourlyRate: number;
  subtotal: number;
  margin: number;
  vat?: number;
  total: number;
}

interface SitePrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  calculations: WorkerCalculation[];
  selectedSite: string;
  localSelectedMonth: Date;
  daysInMonth: { day: number; name: string }[];
  totals: {
    hours: number;
    otHours: number;
    chargedHours: number;
    subtotal: number;
    margin: number;
    vat?: number;
    amount: number;
    totalPayout: number;
    byDay: { [day: number]: number };
  };
  settings: SystemSettings;
}

export const SitePrintPreview: React.FC<SitePrintPreviewProps> = ({
  isOpen,
  onClose,
  calculations,
  selectedSite,
  localSelectedMonth,
  daysInMonth,
  totals,
  settings,
}) => {
  // Inject custom print stylesheet to hide parent components and render ONLY our portal on media-print
  React.useEffect(() => {
    if (!isOpen) return;

    const style = document.createElement('style');
    style.id = 'print-preview-media-style';
    style.innerHTML = `
      @media print {
        /* Hide all standard React app components */
        #root {
          display: none !important;
        }
        body > div:not(#site-print-preview-portal-id) {
          display: none !important;
        }
        /* Style ONLY our print portal to compile full width */
        #site-print-preview-portal-id {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
          background: white !important;
          color: black !important;
          margin: 0 !important;
          padding: 10mm !important;
          box-shadow: none !important;
          border: none !important;
        }
        /* Force background-colors and page bounds in browser printing */
        body {
          background: white !important;
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print\\:hidden {
          display: none !important;
        }
        .print\\:text-[8px] {
          font-size: 8px !important;
        }
        .print\\:p-1 {
          padding: 4px !important;
        }
        .print\\:border-zinc-300 {
          border-color: #d4d4d8 !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Lock body scrolling when modal is open on screen
    document.body.style.overflow = 'hidden';

    return () => {
      const el = document.getElementById('print-preview-media-style');
      if (el) el.remove();
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const marginPercentage = settings.marginPercentage ?? 0;
  const vatPercentage = settings.vatPercentage !== undefined ? settings.vatPercentage : 5;

  return ReactDOM.createPortal(
    <div
      id="site-print-preview-portal-id"
      className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[99999] flex flex-col items-center justify-start p-0 md:p-6 overflow-y-auto"
    >
      {/* Floating control header - hidden on print */}
      <div className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl print:hidden sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Browser Print & View Mode</h3>
            <p className="text-[11px] text-zinc-400">Review, copy tabular data, or send directly to printer without any downloads.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <X size={15} />
            Close Preview
          </button>
        </div>
      </div>

      {/* Printable Sheet Area */}
      <div className="w-full max-w-6xl bg-white text-zinc-900 rounded-3xl p-6 md:p-12 shadow-2xl relative border border-zinc-200 print:border-none print:shadow-none print:p-0 print:rounded-none print:my-0 flex flex-col justify-between min-h-[80vh]">
        
        {/* Document Header */}
        <div>
          <div className="flex flex-col md:flex-row md:items-start justify-between border-b pb-8 border-zinc-200">
            <div className="mb-6 md:mb-0 space-y-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-zinc-950 font-sans">
                FAHIM KHAN CONSTRUCTION PORTAL
              </h1>
              <div className="w-32 h-1.5 bg-emerald-500" />
              <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest leading-none">
                Official Business Payment & Log Record
              </p>
            </div>
            
            <div className="text-right space-y-1">
              <div className="inline-block py-1 px-3 bg-zinc-100 text-zinc-800 rounded text-[9px] font-black uppercase tracking-wider mb-2 print:border print:border-zinc-300">
                Site statement
              </div>
              <h2 className="text-lg font-black text-zinc-900">{selectedSite.toUpperCase()}</h2>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Period: {localSelectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
              </p>
              <p className="text-[10px] font-mono text-zinc-400">
                Created on: {getLocalDateString()}
              </p>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-b border-zinc-100 my-6">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Staff</p>
              <p className="text-lg font-black text-zinc-950">{calculations.length} Personnel</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Calculated Man-Hours</p>
              <p className="text-lg font-black text-zinc-950">{totals.hours.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Billable Charged Hours</p>
              <p className="text-lg font-black text-emerald-600 font-mono">{totals.chargedHours.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Cumulative Payable (Incl. VAT)</p>
              <p className="text-lg font-black text-zinc-950 font-mono">{totals.amount.toFixed(2)} AED</p>
            </div>
          </div>

          {/* Data Sheet Table */}
          <div className="overflow-x-auto -mx-6 md:-mx-12 px-6 md:px-12 print:-mx-0 print:px-0">
            <table className="w-full text-left border-collapse border border-zinc-200 print:text-[8px] print:border-zinc-300">
              <thead>
                <tr className="bg-zinc-55 bg-zinc-50 text-zinc-700 font-mono text-[9px] uppercase tracking-wider border-b border-zinc-200 print:bg-zinc-100">
                  <th className="p-3 font-black border-r border-zinc-200 print:p-1.5">Worker Name</th>
                  <th className="p-3 font-black border-r border-zinc-200 print:p-1.5">Trade</th>
                  <th className="p-3 font-black border-r border-zinc-200 text-right print:p-1.5">Rate</th>
                  {daysInMonth.map(d => (
                    <th key={d.day} className="p-1.5 font-bold text-center border-r border-zinc-200 min-w-[24px] text-[8px] print:p-0.5">
                      {d.day}
                    </th>
                  ))}
                  <th className="p-3 font-black border-r border-zinc-200 text-right print:p-1.5">Worked</th>
                  <th className="p-3 font-black border-r border-zinc-200 text-right print:p-1.5">Charged</th>
                  <th className="p-3 font-black border-r border-zinc-200 text-right print:p-1.5">Subtotal</th>
                  {marginPercentage > 0 && (
                    <th className="p-3 font-black border-r border-zinc-200 text-right print:p-1.5">Margin</th>
                  )}
                  <th className="p-3 font-black border-r border-zinc-200 text-right print:p-1.5">VAT ({vatPercentage}%)</th>
                  <th className="p-3 font-black text-right print:p-1.5">Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs">
                {calculations.map((calc) => (
                  <tr key={calc.workerId} className="hover:bg-zinc-50/50 transition-colors odd:bg-zinc-50/20">
                    <td className="p-3 font-bold text-zinc-950 border-r border-zinc-200 truncate max-w-[150px] print:p-1.5 print:max-w-none">
                      {calc.workerName}
                    </td>
                    <td className="p-3 text-zinc-500 border-r border-zinc-200 truncate max-w-[100px] print:p-1.5">
                      {calc.workerRole}
                    </td>
                    <td className="p-3 text-right font-mono border-r border-zinc-200 print:p-1.5">
                      {calc.hourlyRate.toFixed(2)}
                    </td>
                    
                    {/* Day list */}
                    {daysInMonth.map(d => {
                      const val = calc.dailyHours[d.day];
                      const isSunday = daysInMonth[d.day - 1]?.name === 'Sun';
                      return (
                        <td
                          key={d.day}
                          className={`p-1.5 text-center font-mono border-r border-zinc-200 text-[10px] print:p-0.5 print:text-[7px] ${
                            val === 'A' ? 'text-red-500 font-bold bg-red-50/30' : val ? 'text-zinc-900' : 'text-zinc-300'
                          } ${isSunday ? 'bg-zinc-50 border-l border-r border-dashed' : ''}`}
                        >
                          {val === 'A' ? 'A' : val || '-'}
                        </td>
                      );
                    })}

                    <td className="p-3 text-right font-mono text-zinc-600 border-r border-zinc-200 print:p-1.5">
                      {calc.totalHours}h
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-600 font-bold border-r border-zinc-200 print:p-1.5">
                      {calc.totalChargedHours.toFixed(1)}h
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-700 border-r border-zinc-200 print:p-1.5">
                      {calc.subtotal.toFixed(2)}
                    </td>
                    {marginPercentage > 0 && (
                      <td className="p-3 text-right font-mono text-zinc-500 border-r border-zinc-200 print:p-1.5">
                        {calc.margin.toFixed(2)}
                      </td>
                    )}
                    <td className="p-3 text-right font-mono text-zinc-500 border-r border-zinc-200 print:p-1.5">
                      {(calc.vat ?? 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-zinc-950 print:p-1.5">
                      {calc.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100/80 font-mono font-bold text-[10px] border-t-2 border-zinc-300 text-zinc-950">
                  <td colSpan={3} className="p-3 text-left uppercase tracking-wider border-r border-zinc-200 print:p-1.5">
                    Cumulative Total
                  </td>
                  {daysInMonth.map(d => (
                    <td key={d.day} className="p-1.5 text-center text-[8px] font-bold border-r border-zinc-200 print:p-0.5">
                      {totals.byDay[d.day] || '-'}
                    </td>
                  ))}
                  <td className="p-3 text-right border-r border-zinc-200 print:p-1.5">
                    {totals.hours.toFixed(1)}h
                  </td>
                  <td className="p-3 text-right text-emerald-700 border-r border-zinc-200 print:p-1.5">
                    {totals.chargedHours.toFixed(1)}h
                  </td>
                  <td className="p-3 text-right text-zinc-800 border-r border-zinc-200 print:p-1.5">
                    {totals.subtotal.toFixed(2)}
                  </td>
                  {marginPercentage > 0 && (
                    <td className="p-3 text-right text-zinc-800 border-r border-zinc-200 print:p-1.5">
                      {totals.margin.toFixed(2)}
                    </td>
                  )}
                  <td className="p-3 text-right text-zinc-800 border-r border-zinc-200 print:p-1.5">
                    {(totals.vat ?? 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-black text-zinc-950 bg-emerald-50 print:p-1.5 print:bg-zinc-200">
                    {totals.amount.toFixed(2)} AED
                  </td>
                </tr>
              
              </tfoot>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 print:bg-transparent print:border-none print:p-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Payable</p>
              <p className="text-xl font-black text-zinc-900">{totals.amount.toFixed(2)} AED</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 print:bg-transparent print:border-none print:p-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Payout</p>
              <p className="text-xl font-black text-rose-600">{totals.totalPayout?.toFixed(2) || "0.00"} AED</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 print:bg-transparent print:border-none print:p-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Net Profit</p>
              <p className="text-xl font-black text-emerald-600">{(totals.subtotal + (totals.margin || 0) - (totals.totalPayout || 0)).toFixed(2)} AED</p>
            </div>
          </div>

        </div>

        {/* Corporate Signatures & Disclaimer */}
        <div className="mt-12 pt-8 border-t border-zinc-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs pb-6">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Verification Authority</p>
              <div className="space-y-1">
                <p className="font-bold text-zinc-900 border-b border-zinc-300 pb-1 inline-block min-w-[200px]">
                  Mohammed Fahim Khan
                </p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Payroll Manager & System Administrator</p>
              </div>
            </div>
            <div className="space-y-4 md:text-right">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider md:text-right">Authorized Endorsement</p>
              <div className="space-y-1 inline-block md:text-right">
                <div className="h-4 border-b border-zinc-300 min-w-[200px] inline-block" />
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">Representative Signature & Date</p>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-50 border border-zinc-200/50 p-4 rounded-xl text-[9px] text-zinc-400 leading-relaxed font-sans print:bg-zinc-100 print:p-2">
            <strong>SYSTEM DISCLAIMER:</strong> This report is securely compiled in-browser directly from the database of the 
            Fahim Khan Construction Portal. It is provided "as-is" without secondary file dependencies or manual downloads. 
            All standard daily calculations are bounded by the standard 9-hour limit and applicable Sunday premium multipliers.
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
