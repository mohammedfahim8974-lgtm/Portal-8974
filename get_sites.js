const fs = require('fs');
let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

// Fix siteSummaries useMemo
const targetSiteSummaries = `const siteSummaries = React.useMemo(() => {
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
  }, [attendance, workers, selectedMonth, settings]);`;

const replSiteSummaries = `const siteSummaries = React.useMemo(() => {
    // Get all unique sites from settings and attendance
    const projectSites = Array.from(
      new Set([
        ...(settings.projectSites || []),
        ...attendance.map((a) => a.site).filter(Boolean)
      ])
    );
    
    const [y, m] = selectedMonth.split('-').map(Number);
    const localSelectedMonth = new Date(y, m - 1, 1);

    // We need daysInMonth
    const year = localSelectedMonth.getFullYear();
    const month = localSelectedMonth.getMonth();
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
        localSelectedMonth,
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
  }, [attendance, workers, selectedMonth, settings]);`;

content = content.replace(targetSiteSummaries, replSiteSummaries);

// Fix handleDownloadRevenue CSV, PDF, DOCX using localSelectedMonth
content = content.replace(
  /const handleDownloadRevenueCSV = \(\) => \{/g,
  `const handleDownloadRevenueCSV = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const localSelectedMonth = new Date(y, m - 1, 1);`
);
content = content.replace(
  /const handleDownloadRevenuePDF = \(\) => \{/g,
  `const handleDownloadRevenuePDF = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const localSelectedMonth = new Date(y, m - 1, 1);`
);
content = content.replace(
  /const handleDownloadRevenueWord = async \(\) => \{/g,
  `const handleDownloadRevenueWord = async () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const localSelectedMonth = new Date(y, m - 1, 1);`
);

content = content.replace(/selectedMonth\.toLocaleString/g, 'localSelectedMonth.toLocaleString');

fs.writeFileSync('src/components/WorkerReports.tsx', content);
