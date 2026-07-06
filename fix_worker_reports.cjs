const fs = require('fs');
let lines = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8').split('\n');

const insertIdx = lines.findIndex(l => l.includes('}, [attendance, workers, selectedMonth, settings]);'));

const newStats = `
  const stats = React.useMemo(() => {
    const totalWage = reportData.reduce((sum, d) => sum + d.estimatedEarnings, 0);
    const avgAttendance = reportData.length > 0 ? reportData.reduce((sum, d) => sum + d.attendanceRatio, 0) / reportData.length : 0;
    const totalOTHours = reportData.reduce((sum, d) => sum + d.totalOT, 0);
    
    // Compute totalRevenue from siteSummaries
    const totalRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const netProfit = totalRevenue - totalWage;
    
    return { totalWage, avgAttendance, totalOTHours, totalRevenue, netProfit };
  }, [reportData, siteSummaries]);
`;

lines.splice(insertIdx + 1, 0, newStats);

fs.writeFileSync('src/components/WorkerReports.tsx', lines.join('\n'));
