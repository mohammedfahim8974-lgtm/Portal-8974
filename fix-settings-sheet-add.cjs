const fs = require('fs');

let content = fs.readFileSync('src/components/LabourCard.tsx', 'utf8');

if (!content.includes('import { getSiteSettings }')) {
  content = content.replace(/import { getSiteRate } from "\.\.\/lib\/utils";/g, 'import { getSiteRate, getSiteSettings } from "../lib/utils";');
}

content = content.replace(/recordsForDay\.forEach\(record => \{\s*if \(record\.status !== 'absent'\) \{\s*isAbsent = false;\s*const h = Number\(record\.hours\) \|\| 0;\s*const ot = Number\(record\.otHours\) \|\| 0;\s*const calcOt = ot > 0 \|\| \(h <= standardHours\) \? ot : Math\.max\(0, h - standardHours\);\s*const calcNorm = h > 0 \? \(h > standardHours \? standardHours : h\) : 0;\s*dayNorm \+= calcNorm;\s*dayOT \+= calcOt;\s*\}\s*\}\);/g,
  `recordsForDay.forEach(record => {
          if (record.status !== 'absent') {
            isAbsent = false;
            const h = Number(record.hours) || 0;
            const ot = Number(record.otHours) || 0;
            const rSiteConfig = getSiteSettings(record.site || "", settings.siteSettings);
            const stdHours = rSiteConfig?.workerStandardHours || 9;
            const calcOt = ot > 0 || (h <= stdHours) ? ot : Math.max(0, h - stdHours);
            const calcNorm = h > 0 ? (h > stdHours ? stdHours : h) : 0;
            dayNorm += calcNorm;
            dayOT += calcOt;
          }
        });`);

fs.writeFileSync('src/components/LabourCard.tsx', content);
console.log("Done updating LabourCard.tsx");
