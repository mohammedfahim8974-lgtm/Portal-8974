const fs = require('fs');

let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

// 1. Add billedToClient logic in the worker map
content = content.replace(
  /const recordsByDate = new Map<string, typeof records>\(\);/g,
  `let billedToClient = 0;
        records.forEach(r => {
          const workersInRecord = Math.max(1, r.workerIds?.length || r.mp || 1);
          billedToClient += (r.total || 0) / workersInRecord;
        });

        const recordsByDate = new Map<string, typeof records>();`
);

// 2. Return billedToClient in the worker object
content = content.replace(
  /attendanceRatio: records\.length > 0 \? \(presentDays \/ records\.length\) \* 100 : 0\n\s*\};/g,
  `attendanceRatio: records.length > 0 ? (presentDays / records.length) * 100 : 0,
          billedToClient
        };`
);

// 3. Update stats computation
content = content.replace(
  /const \[year, month\] = selectedMonth\.split\('-\'\)\.map\(Number\);\n\s*let totalRevenue = 0;\n\s*attendance\.forEach\(record => \{[\s\S]*?\}\);\n\s*const netProfit = totalRevenue - totalWage;/g,
  `const totalRevenue = reportData.reduce((sum, d) => sum + d.billedToClient, 0);
    const netProfit = totalRevenue - totalWage;`
);

fs.writeFileSync('src/components/WorkerReports.tsx', content);
console.log("Updated WorkerReports.tsx for accurate revenue calculation");
