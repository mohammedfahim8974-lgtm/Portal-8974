const fs = require('fs');

let content = fs.readFileSync('src/components/AttendanceSheet.tsx', 'utf8');

content = content.replace(
  /const standardHours = siteConfig\?\.workerStandardHours \|\| 9;\s*const calc = calculateAttendance\(/g,
  `const rSiteConfig = getSiteSettings(record.site || "", settings.siteSettings);
    const standardHours = rSiteConfig?.workerStandardHours || 9;
    const calc = calculateAttendance(`
);

content = content.replace(
  /const siteConfig = getSiteSettings\(\s*record\.site \|\| "",\s*settings\.siteSettings,\s*\);\s*const minCharge/g,
  `const siteConfig = rSiteConfig;
    const minCharge`
);

fs.writeFileSync('src/components/AttendanceSheet.tsx', content);
