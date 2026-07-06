const fs = require('fs');

let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// 1. Add __revenue accumulation in computeSiteReport
content = content.replace(
  /workerDailyHours\[workerId\]\["__workerCost"\] = \(Number\(workerDailyHours\[workerId\]\["__workerCost"\]\) \|\| 0\) \+ dayWorkerCost;/,
  `workerDailyHours[workerId]["__workerCost"] = (Number(workerDailyHours[workerId]["__workerCost"]) || 0) + dayWorkerCost;\n          const recordRate = Number(record.rate) || 0;\n          workerDailyHours[workerId]["__revenue"] = (Number(workerDailyHours[workerId]["__revenue"]) || 0) + (payableHours * recordRate);`
);

// 2. Change subtotal logic in computeSiteReport
content = content.replace(
  /const subtotal = finalPayable \* rate;/,
  `let subtotal = (entry.dailyHours as any)["__revenue"] || 0;\n    if (finalPayable > actualPayable && actualPayable > 0) {\n      subtotal += (finalPayable - actualPayable) * (subtotal / actualPayable);\n    }`
);

// 3. Remove global rate variable in computeSiteReport
content = content.replace(
  /const rate =\s*parseFloat\(getSiteRate\(siteName, settings\.siteRates\)\.toString\(\)\) \|\| 0;/,
  ``
);

// 4. Change hourlyRate to be average rate in computeSiteReport
content = content.replace(
  /hourlyRate: rate,/,
  `hourlyRate: finalPayable > 0 ? (subtotal / finalPayable) : 0,`
);

// 5. Do the same for the component's internal useMemo calculations
// First, __revenue accumulation in the component's useMemo
content = content.replace(
  /workerDailyHours\[workerId\]\["__workerCost"\] = \(Number\(workerDailyHours\[workerId\]\["__workerCost"\]\) \|\| 0\) \+ dayWorkerCost;\s*workerOTHours\[workerId\] = \(workerOTHours\[workerId\] \|\| 0\) \+ calcOt;/g,
  `workerDailyHours[workerId]["__workerCost"] = (Number(workerDailyHours[workerId]["__workerCost"]) || 0) + dayWorkerCost;\n          const recordRate = Number(record.rate) || 0;\n          workerDailyHours[workerId]["__revenue"] = (Number(workerDailyHours[workerId]["__revenue"]) || 0) + (payableHours * recordRate);\n\n          workerOTHours[workerId] = (workerOTHours[workerId] || 0) + calcOt;`
);

// Next, subtotal logic in the component
content = content.replace(
  /const subtotal = finalPayable \* rate;/g,
  `let subtotal = (entry.dailyHours as any)["__revenue"] || 0;\n      if (finalPayable > actualPayable && actualPayable > 0) {\n        subtotal += (finalPayable - actualPayable) * (subtotal / actualPayable);\n      }`
);

// Change hourlyRate output in the component
content = content.replace(
  /hourlyRate: rate,/g,
  `hourlyRate: finalPayable > 0 ? (subtotal / finalPayable) : 0,`
);

// 6. Remove the hourlyRate input from the UI
content = content.replace(
  /<div>\s*<label className=\"block text-\[10px\] font-bold text-zinc-400 uppercase tracking-wider mb-1\">\s*Hourly Rate \(AED\)\s*<\/label>\s*<div className=\"relative\">\s*<Calculator\s*className=\"absolute left-3 top-1\/2 -translate-y-1\/2 text-zinc-400\"\s*size=\{16\}\s*\/>\s*<input\s*type=\"number\"\s*value=\{hourlyRate\}\s*onChange=\{\(e\) => setHourlyRate\(e\.target\.value\)\}\s*placeholder=\"e\.g\. 25\"\s*className=\"w-full pl-10 pr-4 py-2\.5 bg-\[\#F5F5F7\] dark:bg-\[\#0a0a0a\] border border-line dark:border-white\/5 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none dark:text-white\"\s*\/>\s*<\/div>\s*<\/div>/,
  ``
);

// Wait, the input might be different, let's check its exact HTML.
fs.writeFileSync('patch_calculator.cjs.test', content);
