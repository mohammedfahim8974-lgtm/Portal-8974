const fs = require('fs');
let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

// 1. Move stats calculation to be after siteSummaries
const statsRegex = /const stats = React\.useMemo\(\(\) => \{[\s\S]*?return \{ totalWage, avgAttendance, totalOTHours, totalRevenue, netProfit \};\n  \}, \[reportData, attendance, selectedMonth, filterCompany\]\);/m;

const statsMatch = content.match(statsRegex);
if (statsMatch) {
  content = content.replace(statsRegex, ''); // remove it from current position

  const siteSummariesRegex = /const siteSummaries = React\.useMemo\(\(\) => \{[\s\S]*?return result;\n  \}, \[attendance, workers, selectedMonth, settings\]\);/m;
  const siteSummariesMatch = content.match(siteSummariesRegex);
  
  if (siteSummariesMatch) {
    const replacement = `${siteSummariesMatch[0]}

  const stats = React.useMemo(() => {
    const totalWage = reportData.reduce((sum, d) => sum + d.estimatedEarnings, 0);
    const avgAttendance = reportData.length > 0 ? reportData.reduce((sum, d) => sum + d.attendanceRatio, 0) / reportData.length : 0;
    const totalOTHours = reportData.reduce((sum, d) => sum + d.totalOT, 0);
    
    // Compute totalRevenue from siteSummaries
    const totalRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const netProfit = totalRevenue - totalWage;
    
    return { totalWage, avgAttendance, totalOTHours, totalRevenue, netProfit };
  }, [reportData, siteSummaries]);`;

    content = content.replace(siteSummariesRegex, replacement);
  }
}

fs.writeFileSync('src/components/WorkerReports.tsx', content);
