const fs = require('fs');
let content = fs.readFileSync('src/components/AttendanceSheet.tsx', 'utf8');

// Fix the first one
content = content.replace(`  // Use strictly 9 for standard hours as required by the old logic.
  const standardHours = siteConfig?.workerStandardHours || 9;

  let normalHours = 0;
  let calculatedOtHours = 0;

  const siteConfig = getSiteSettings(siteName || "", settings.siteSettings);`, `  const siteConfig = getSiteSettings(siteName || "", settings.siteSettings);
  const standardHours = siteConfig?.workerStandardHours || 9;

  let normalHours = 0;
  let calculatedOtHours = 0;`);

fs.writeFileSync('src/components/AttendanceSheet.tsx', content);
