const fs = require('fs');
let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  /import \{ Worker, AttendanceRecord, SystemSettings \} from '\.\.\/types';/,
  `import { Worker, AttendanceRecord, SystemSettings } from '../types';\nimport { computeSiteReport } from './ConstructionCalculator';\nimport jsPDF from "jspdf";\nimport autoTable from "jspdf-autotable";\nimport { Document, Packer, Paragraph, Table, TableRow, TableCell, AlignmentType, WidthType, TextRun } from "docx";\nimport { saveAs } from "file-saver";`
);

// 2. Add showRevenueMenu state
content = content.replace(
  /const \[searchTerm, setSearchTerm\] = React\.useState\(''\);/,
  `const [searchTerm, setSearchTerm] = React.useState('');\n  const [showRevenueMenu, setShowRevenueMenu] = React.useState(false);`
);

// 3. We need to define siteSummaries inside the component
content = content.replace(
  /const departmentChartData = React\.useMemo\(\(\) => \{/,
  `const siteSummaries = React.useMemo(() => {
    // Get all unique sites from settings and attendance
    const projectSites = Array.from(
      new Set([
        ...(settings.projectSites || []),
        ...attendance.map((a) => a.site).filter(Boolean)
      ])
    );
    
    // We need daysInMonth
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const daysInMonth = Array.from({ length: days }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return {
        day: i + 1,
        name: d.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });

    return projectSites.map(siteName => {
      const { totals } = computeSiteReport(
        siteName,
        selectedMonth,
        attendance,
        workers,
        settings,
        daysInMonth
      );
      const profit = totals.subtotal + totals.margin - (totals.totalPayout || 0);

      return {
        siteName,
        totals,
        profit
      };
    }).filter(s => s.totals.amount > 0 || s.totals.totalPayout > 0);
  }, [attendance, workers, selectedMonth, settings]);

  const departmentChartData = React.useMemo(() => {`
);

// 4. Add the download functions
content = content.replace(
  /const handleDownloadPDF = \(\) => \{/,
  `const handleDownloadRevenueCSV = () => {
    setShowRevenueMenu(false);
    const headers = ["S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"];
    const rows = siteSummaries.map((s, index) => [
      (index + 1).toString(),
      s.siteName,
      s.totals.hours.toFixed(1),
      (s.totals.totalPayout || 0).toFixed(2),
      s.totals.amount.toFixed(2),
      s.profit.toFixed(2)
    ]);

    const grandRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const grandPayout = siteSummaries.reduce((sum, s) => sum + (s.totals.totalPayout || 0), 0);
    const grandProfit = siteSummaries.reduce((sum, s) => sum + s.profit, 0);
    const grandHours = siteSummaries.reduce((sum, s) => sum + s.totals.hours, 0);

    const csvContent = [
      ["All Sites Revenue Breakdown"],
      [\`Period: \$\{selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}\`],
      [],
      headers,
      ...rows,
      [],
      ["", "GRAND TOTAL", grandHours.toFixed(1), grandPayout.toFixed(2), grandRevenue.toFixed(2), grandProfit.toFixed(2)]
    ].map(e => e.join(",")).join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, \`Revenue_Breakdown_\$\{selectedMonth.toLocaleString("default", { month: "short", year: "numeric" })\}.csv\`);
  };

  const handleDownloadRevenuePDF = () => {
    setShowRevenueMenu(false);
    const doc = new jsPDF("p", "mm", "a4");
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.text("All Sites Revenue Breakdown", 14, 22);
    doc.setFontSize(12);
    doc.text(\`Period: \$\{selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}\`, 14, 32);
    doc.text(\`Generated: \$\{date}\`, 14, 38);

    const grandRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const grandPayout = siteSummaries.reduce((sum, s) => sum + (s.totals.totalPayout || 0), 0);
    const grandProfit = siteSummaries.reduce((sum, s) => sum + s.profit, 0);
    const grandHours = siteSummaries.reduce((sum, s) => sum + s.totals.hours, 0);

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
      grandHours.toFixed(1) + 'h',
      grandPayout.toFixed(2),
      grandRevenue.toFixed(2),
      grandProfit.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129] },
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

    doc.save(\`Revenue_Breakdown_\$\{selectedMonth.toLocaleString("default", { month: "short", year: "numeric" })\}.pdf\`);
  };

  const handleDownloadRevenueWord = async () => {
    setShowRevenueMenu(false);
    
    const grandRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const grandPayout = siteSummaries.reduce((sum, s) => sum + (s.totals.totalPayout || 0), 0);
    const grandProfit = siteSummaries.reduce((sum, s) => sum + s.profit, 0);
    const grandHours = siteSummaries.reduce((sum, s) => sum + s.totals.hours, 0);

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "All Sites Revenue Breakdown",
            heading: "Heading1",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: \`Period: \$\{selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}\`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  "S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"
                ].map(text => new TableCell({
                  children: [new Paragraph({ text: text, alignment: AlignmentType.CENTER })],
                  shading: { fill: "f3f4f6" }
                }))
              }),
              ...siteSummaries.map((s, index) => new TableRow({
                children: [
                  (index + 1).toString(),
                  s.siteName,
                  s.totals.hours.toFixed(1) + 'h',
                  (s.totals.totalPayout || 0).toFixed(2),
                  s.totals.amount.toFixed(2),
                  s.profit.toFixed(2)
                ].map(text => new TableCell({
                  children: [new Paragraph({ text: text, alignment: AlignmentType.CENTER })]
                }))
              })),
              new TableRow({
                children: [
                  "",
                  "GRAND TOTAL",
                  grandHours.toFixed(1) + 'h',
                  grandPayout.toFixed(2),
                  grandRevenue.toFixed(2),
                  grandProfit.toFixed(2)
                ].map(text => new TableCell({
                  children: [new Paragraph({ text: text, alignment: AlignmentType.CENTER })],
                  shading: { fill: "f3f4f6" }
                }))
              })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, \`Revenue_Breakdown_\$\{selectedMonth.toLocaleString("default", { month: "short", year: "numeric" })\}.docx\`);
  };

  const handleDownloadPDF = () => {`
);

// 5. Update StatsCard props to accept onClick
content = content.replace(
  /const StatsCard = \(\{ label, value, icon, trend \}: \{ label: string; value: string; icon: React\.ReactNode, trend: string \}\) => \{/,
  `const StatsCard = ({ label, value, icon, trend, onClick }: { label: string; value: string; icon: React.ReactNode, trend: string, onClick?: () => void }) => {`
);
content = content.replace(
  /<div className=\{cn\(\n\s*"relative bg-white dark:bg-\[\#141414\] p-6 rounded-2xl border border-line dark:border-white\/10 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden",/,
  `<div \n      onClick={onClick}\n      className={cn(\n        "relative bg-white dark:bg-[#141414] p-6 rounded-2xl border border-line dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden",\n        onClick ? "cursor-pointer active:scale-95" : "",`
);

// 6. Provide onClick to the Total Revenue StatsCard
content = content.replace(
  /<StatsCard \n\s*label=\"Total Revenue\" \n\s*value=\{`\$\{stats.totalRevenue.toLocaleString\('en-AE', \{ minimumFractionDigits: 2 \}\)\} AED`\}\n\s*icon=\{<TrendingUp className=\"text-blue-500\" \/>\}\n\s*trend=\"Total Billed\"\n\s*\/>/,
  `<div className="relative">
          <StatsCard 
            label="Total Revenue" 
            value={\`\$\{stats.totalRevenue.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`}
            icon={<TrendingUp className="text-blue-500" />}
            trend="Total Billed"
            onClick={() => setShowRevenueMenu(!showRevenueMenu)}
          />
          <AnimatePresence>
            {showRevenueMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-2 w-full right-0 bg-white dark:bg-[#1A1A1A] rounded-xl shadow-2xl border border-line dark:border-white/10 overflow-hidden z-50 flex flex-col p-2"
              >
                <div className="px-3 py-2 border-b border-line dark:border-white/5 mb-1">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Download Breakdown</p>
                </div>
                <button
                  onClick={handleDownloadRevenuePDF}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3 text-zinc-700 dark:text-zinc-300"
                >
                  <FileText className="text-rose-500" size={16} />
                  PDF Document
                </button>
                <button
                  onClick={handleDownloadRevenueWord}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3 text-zinc-700 dark:text-zinc-300"
                >
                  <FileText className="text-blue-500" size={16} />
                  Word Document
                </button>
                <button
                  onClick={handleDownloadRevenueCSV}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3 text-zinc-700 dark:text-zinc-300"
                >
                  <FileText className="text-emerald-500" size={16} />
                  CSV Excel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>`
);

fs.writeFileSync('src/components/WorkerReports.tsx', content);
