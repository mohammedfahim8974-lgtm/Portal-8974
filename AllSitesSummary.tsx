const fs = require('fs');

let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

const newStatsMemo = `  const stats = React.useMemo(() => {
    const totalWage = reportData.reduce((sum, d) => sum + d.estimatedEarnings, 0);
    const avgAttendance = reportData.length > 0 ? reportData.reduce((sum, d) => sum + d.attendanceRatio, 0) / reportData.length : 0;
    const totalOTHours = reportData.reduce((sum, d) => sum + d.totalOT, 0);
    
    const [year, month] = selectedMonth.split('-').map(Number);
    let totalRevenue = 0;
    attendance.forEach(record => {
      if (record.date) {
        const [y, m] = record.date.split('-');
        if (parseInt(y, 10) === year && parseInt(m, 10) === month) {
          if (filterCompany === 'All' || record.companyName === filterCompany) {
            totalRevenue += record.total || 0;
          }
        }
      }
    });
    
    const netProfit = totalRevenue - totalWage;

    return { totalWage, avgAttendance, totalOTHours, totalRevenue, netProfit };
  }, [reportData, attendance, selectedMonth, filterCompany]);`;

content = content.replace(/  const stats = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[reportData\]\);/g, newStatsMemo);

const oldStatsCards = `      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard 
          label="Total Monthly Payroll" 
          value={\`\${stats.totalWage.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`}
          icon={<DollarSign className="text-emerald-500" />}
          trend={\`\${reportData.length} Workers Active\`}
        />
        <StatsCard 
          label="Avg. Attendance Rate" 
          value={\`\${stats.avgAttendance.toFixed(1)}%\`}
          icon={<TrendingUp className="text-blue-500" />}
          trend="Overall performance"
        />
        <StatsCard 
          label="Total Overtime" 
          value={\`\${stats.totalOTHours.toFixed(1)} hrs\`}
          icon={<Calendar className="text-amber-500" />}
          trend="Total extra hours"
        />
      </div>`;

const newStatsCards = `      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <StatsCard 
          label="Total Revenue" 
          value={\`\${stats.totalRevenue.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`}
          icon={<TrendingUp className="text-blue-500" />}
          trend="Total Billed"
        />
        <StatsCard 
          label="Total Monthly Payroll" 
          value={\`\${stats.totalWage.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`}
          icon={<DollarSign className="text-emerald-500" />}
          trend={\`\${reportData.length} Workers Active\`}
        />
        <StatsCard 
          label="Net Profit" 
          value={\`\${stats.netProfit.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`}
          icon={<DollarSign className="text-amber-500" />}
          trend="After Salaries"
        />
        <StatsCard 
          label="Avg. Attendance Rate" 
          value={\`\${stats.avgAttendance.toFixed(1)}%\`}
          icon={<BarChart3 className="text-blue-500" />}
          trend="Overall performance"
        />
        <StatsCard 
          label="Total Overtime" 
          value={\`\${stats.totalOTHours.toFixed(1)} hrs\`}
          icon={<Calendar className="text-amber-500" />}
          trend="Total extra hours"
        />
      </div>`;

content = content.replace(oldStatsCards, newStatsCards);

fs.writeFileSync('src/components/WorkerReports.tsx', content);
console.log("Updated WorkerReports.tsx");
