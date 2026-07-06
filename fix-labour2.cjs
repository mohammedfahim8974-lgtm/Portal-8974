const fs = require('fs');

const fixLogic = (fileName) => {
  let content = fs.readFileSync(fileName, 'utf8');
  content = content.replace(/dayRecords\.forEach\(r => \{\s*if \(r\.status !== 'absent'\) \{\s*isAbsent = false;\s*const h = Number\(r\.hours\) \|\| 0;\s*const ot = Number\(r\.otHours\) \|\| 0;\s*const calcOt = ot > 0 \|\| \(h <= standardHours\) \? ot : Math\.max\(0, h - standardHours\);\s*const calcNorm = h > 0 \? \(h > standardHours \? standardHours : h\) : 0;\s*dayNorm \+= calcNorm;\s*dayOT \+= calcOt;\s*\}\s*\}\);/g,
  `dayRecords.forEach(r => {
          if (r.status !== 'absent') {
            isAbsent = false;
            const h = Number(r.hours) || 0;
            const ot = Number(r.otHours) || 0;
            const rSiteConfig = getSiteSettings(r.site || "", settings.siteSettings);
            const stdHours = rSiteConfig?.workerStandardHours || 9;
            const calcOt = ot > 0 || (h <= stdHours) ? ot : Math.max(0, h - stdHours);
            const calcNorm = h > 0 ? (h > stdHours ? stdHours : h) : 0;
            
            dayNorm += calcNorm;
            dayOT += calcOt;
          }
        });`);
  fs.writeFileSync(fileName, content);
};

['src/components/StaffInfo.tsx', 'src/components/WorkerReports.tsx', 'src/components/LabourCard.tsx'].forEach(fixLogic);
console.log("Done updating dayRecords.forEach");
