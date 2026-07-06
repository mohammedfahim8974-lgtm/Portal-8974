const fs = require('fs');

let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// Inside computeSiteReport, inside record.workerIds.forEach
content = content.replace(
  /workerDailyHours\[workerId\]\[\"__payable\"\] =\n\s*\(Number\(workerDailyHours\[workerId\]\[\"__payable\"\]\) \|\| 0\) \+\n\s*payableHours;/g,
  `workerDailyHours[workerId]["__payable"] =
            (Number(workerDailyHours[workerId]["__payable"]) || 0) +
            payableHours;
            
          const workerObj = workers.find(w => w.id === workerId);
          let hourlyRate = 0;
          if (workerObj) {
            hourlyRate = (Number(workerObj.monthlySalary) || 0) / 270;
          }
          let dayWorkerCost = 0;
          if (dateObj.getDay() === 0) { // Sunday
            dayWorkerCost = h * 1.5 * hourlyRate;
          } else {
            // normal day
            const wNormal = Math.min(h, 9);
            const wOt = Math.max(0, h - 9);
            dayWorkerCost = (wNormal + wOt) * hourlyRate; // Since otRate = hourlyRate, it's just h * hourlyRate
          }
          workerDailyHours[workerId]["__workerCost"] = (Number(workerDailyHours[workerId]["__workerCost"]) || 0) + dayWorkerCost;`
);

content = content.replace(
  /const total = subtotal \+ margin \+ vat;\n\s*return \{/g,
  `const total = subtotal + margin + vat;
    const workerCost = (entry.dailyHours as any)["__workerCost"] || 0;
    return {`
);

content = content.replace(
  /total: number;\n\}/g,
  `total: number;
  workerCost: number;
}`
);

content = content.replace(
  /vat,\n\s*total,\n\s*\};/g,
  `vat,
      total,
      workerCost,
    };`
);

content = content.replace(
  /amount: calculations\.reduce\(\(sum, c\) => sum \+ c\.total, 0\),/g,
  `amount: calculations.reduce((sum, c) => sum + c.total, 0),
    totalPayout: calculations.reduce((sum, c) => sum + c.workerCost, 0),`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
console.log("updated cost");
