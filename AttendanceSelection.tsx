import React from 'react';
import { SystemSettings, AttendanceRecord, Worker } from '../types';
import { getSiteSettings, getSiteRate, isSameSite, cn, getLocalDateString } from '../lib/utils';
import { Printer, Download, DollarSign, Users, Clock, Building } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeSiteReport } from './ConstructionCalculator';

interface AllSitesSummaryProps {
  projectSites: string[];
  localSelectedMonth: Date;
  attendance: AttendanceRecord[];
  workers: Worker[];
  settings: SystemSettings;
  daysInMonth: { day: number; name: string }[];
  onSiteClick?: (siteName: string) => void;
}

export const AllSitesSummary: React.FC<AllSitesSummaryProps> = ({
  projectSites,
  localSelectedMonth,
  attendance,
  workers,
  settings,
  daysInMonth,
  onSiteClick
}) => {
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);

  const siteSummaries = React.useMemo(() => {
    return projectSites.map(siteName => {
      const { totals } = computeSiteReport(
        siteName,
        localSelectedMonth,
        attendance,
        workers,
        settings,
        daysInMonth
      );
      const marginPercentage = settings.marginPercentage ?? 0;
      const profit = totals.subtotal + totals.margin - (totals.totalPayout || 0);

      return {
        siteName,
        totals,
        profit
      };
    }).filter(s => s.totals.amount > 0 || s.totals.totalPayout > 0);
  }, [projectSites, localSelectedMonth, attendance, workers, settings, daysInMonth]);

  const grandTotals = React.useMemo(() => {
    return siteSummaries.reduce((acc, curr) => {
      acc.revenue += curr.totals.amount;
      acc.payout += curr.totals.totalPayout || 0;
      acc.profit += curr.profit;
      acc.hours += curr.totals.hours;
      return acc;
    }, { revenue: 0, payout: 0, profit: 0, hours: 0 });
  }, [siteSummaries]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.text("All Sites Summary Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Period: $\{localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`, 14, 32);
    doc.text(`Generated: $\{date}`, 14, 38);

    const tableData = siteSummaries.map((s, index) => [
      (index + 1).toString(),
      s.siteName,
      s.totals.hours.toFixed(1) + 'h',
      (s.totals.totalPayout || 0).toFixed(2),
      s.totals.amount.toFixed(2),
      s.profit.toFixed(2)
    ]);

    tableData.push([
      "",
      "GRAND TOTAL",
      grandTotals.hours.toFixed(1) + 'h',
      grandTotals.payout.toFixed(2),
      grandTotals.revenue.toFixed(2),
      grandTotals.profit.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [139, 92, 246] }, // purple-500
      footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
      willDrawCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          doc.setFont("helvetica", "bold");
          if (data.column.index === 0) {
            doc.setFillColor(240, 240, 240);
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Payout: $\{grandTotals.payout.toFixed(2)} AED`, 14, finalY + 10);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Net Profit: $\{grandTotals.profit.toFixed(2)} AED`, 14, finalY + 16);
    doc.setTextColor(100);

    doc.save(`All_Sites_Summary_$\{getLocalDateString()}.pdf`);
  };

  const handleDownloadCSV = () => {
    const headers = ["S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"];
    const rows = siteSummaries.map((s, index) => [
      (index + 1).toString(),
      s.siteName,
      s.totals.hours.toFixed(1),
      (s.totals.totalPayout || 0).toFixed(2),
      s.totals.amount.toFixed(2),
      s.profit.toFixed(2)
    ]);

    const csvContent = [
      ["All Sites Summary Report"],
      [`Period: $\{localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`],
      [],
      headers,
      ...rows,
      [],
      ["", "GRAND TOTAL", grandTotals.hours.toFixed(1), grandTotals.payout.toFixed(2), grandTotals.revenue.toFixed(2), grandTotals.profit.toFixed(2)]
    ].map(e => e.join(",")).join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `All_Sites_Summary_$\{getLocalDateString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (showPrintPreview) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto print:bg-white print:p-0">
        <div className="max-w-5xl mx-auto p-8 print:p-0">
          <div className="flex items-center justify-between mb-8 print:hidden">
            <h2 className="text-2xl font-bold">Print Preview</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
              >
                <Printer size={16} />
                Print Document
              </button>
            </div>
          </div>

          {/* Print Content */}
          <div className="bg-white">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-zinc-900 mb-2">All Sites Summary Report</h1>
              <p className="text-zinc-500">
                Period: {localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </p>
            </div>

            <table className="w-full text-left border-collapse mb-8">
              <thead>
                <tr className="border-b-2 border-zinc-900">
                  <th className="py-3 px-4 font-bold text-sm text-zinc-900">Site Name</th>
                  <th className="py-3 px-4 font-bold text-sm text-zinc-900 text-right">Total Hours</th>
                  <th className="py-3 px-4 font-bold text-sm text-zinc-900 text-right">Total Payout</th>
                  <th className="py-3 px-4 font-bold text-sm text-zinc-900 text-right">Total Revenue</th>
                  <th className="py-3 px-4 font-bold text-sm text-zinc-900 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {siteSummaries.map((s) => (
                  <tr key={s.siteName}>
                    <td className="py-3 px-4 text-sm text-zinc-900">{s.siteName}</td>
                    <td className="py-3 px-4 text-sm text-zinc-600 text-right">{s.totals.hours.toFixed(1)}h</td>
                    <td className="py-3 px-4 text-sm text-rose-600 text-right">{s.totals.totalPayout.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-zinc-900 text-right">{s.totals.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-emerald-600 font-medium text-right">{s.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-900 font-bold">
                  <td className="py-4 px-4 text-sm text-zinc-900 uppercase">Grand Total</td>
                  <td className="py-4 px-4 text-sm text-zinc-900 text-right">{grandTotals.hours.toFixed(1)}h</td>
                  <td className="py-4 px-4 text-sm text-rose-600 text-right">{grandTotals.payout.toFixed(2)}</td>
                  <td className="py-4 px-4 text-sm text-zinc-900 text-right">{grandTotals.revenue.toFixed(2)}</td>
                  <td className="py-4 px-4 text-sm text-emerald-600 text-right">{grandTotals.profit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-colors" />
          <div className="relative z-10">
            <Building className="text-purple-500 mb-4" size={24} />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Active Sites</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white">{siteSummaries.length}</p>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-rose-500/20 transition-colors" />
          <div className="relative z-10">
            <DollarSign className="text-rose-500 mb-4" size={24} />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Payout</p>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {grandTotals.payout.toFixed(2)} <span className="text-sm">AED</span>
            </p>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors" />
          <div className="relative z-10">
            <DollarSign className="text-blue-500 mb-4" size={24} />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Revenue</p>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {grandTotals.revenue.toFixed(2)} <span className="text-sm">AED</span>
            </p>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors" />
          <div className="relative z-10">
            <DollarSign className="text-emerald-500 mb-4" size={24} />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Net Profit</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {grandTotals.profit.toFixed(2)} <span className="text-sm">AED</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">All Sites Performance</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-[#F5F5F7] dark:bg-[#2A2A2A] hover:bg-[#E5E5E5] dark:hover:bg-[#3A3A3A] text-zinc-900 dark:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Download size={14} /> PDF
            </button>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F7]/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Site Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Total Hours</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Total Payout</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Total Revenue</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {siteSummaries.map((s) => (
                <tr 
                  key={s.siteName} 
                  onClick={() => onSiteClick?.(s.siteName)}
                  className="hover:bg-zinc-100 dark:hover:bg-white/[0.03] transition-all cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-purple-600 dark:text-purple-400 group-hover:underline">{s.siteName}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-zinc-600 dark:text-zinc-400">{s.totals.hours.toFixed(1)}h</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      {s.totals.totalPayout.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono font-medium text-zinc-900 dark:text-white">
                      {s.totals.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {s.profit.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
              {siteSummaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No active sites found for this period
                  </td>
                </tr>
              )}
            </tbody>
            {siteSummaries.length > 0 && (
              <tfoot className="bg-zinc-50 dark:bg-[#0a0a0a] border-t-2 border-zinc-200 dark:border-white/10">
                <tr>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Grand Total
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-white">
                    {grandTotals.hours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                    {grandTotals.payout.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                    {grandTotals.revenue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {grandTotals.profit.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
