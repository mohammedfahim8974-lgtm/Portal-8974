const fs = require('fs');
let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

// Replace the Sunday logic
content = content.replace(
  /if \(isSunday\) \{\n\s*const isWorked = !isAbsent && \(dayNorm > 0 \|\| dayOT > 0\);\n\s*const hoursWorked = isWorked \? \(dayNorm \+ dayOT\) : 0;\n\s*const sundayPaidHours = isWorked \? Math\.max\(9, hoursWorked \* 1\.5\) : 9;\n\s*const sNorm = Math\.min\(9, sundayPaidHours\);\n\s*const sOT = Math\.max\(0, sundayPaidHours - 9\);\n\s*totalHours \+= sNorm;\n\s*totalOT \+= sOT;\n\s*if \(isWorked\) \{\n\s*presentDays\+\+;\n\s*\}\n\s*earned \+= sundayPaidHours \* hourlyRate;\n\s*\}/g,
  `if (isSunday) {
            const isWorked = !isAbsent && (dayNorm > 0 || dayOT > 0);
            const hoursWorked = isWorked ? (dayNorm + dayOT) : 0;
            const hasRecords = records.length > 0;
            
            if (isWorked) {
              const sundayPaidHours = hoursWorked * 1.5;
              const sNorm = Math.min(9, sundayPaidHours);
              const sOT = Math.max(0, sundayPaidHours - 9);
              totalHours += sNorm;
              totalOT += sOT;
              presentDays++;
              earned += sundayPaidHours * hourlyRate;
            } else if (hasRecords) {
              totalHours += 9;
              earned += 9 * hourlyRate;
            }
          }`
);

fs.writeFileSync('src/components/WorkerReports.tsx', content);
