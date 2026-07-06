const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsSheet.tsx', 'utf8');

// In startEditSite we need siteSettings?.workerStandardHours
content = content.replace(
  /const siteSettings = localSettings\.siteSettings\?\.\[value\];\s*setEditingSite\(\{\s*index,\s*value,\s*minChargeHours: siteSettings\?\.minChargeHours,\s*workerStandardHours: Number\(newSiteWorkerHours\) \|\| 0,/g,
  `const siteSettings = localSettings.siteSettings?.[value];
    setEditingSite({
      index,
      value,
      minChargeHours: siteSettings?.minChargeHours,
      workerStandardHours: siteSettings?.workerStandardHours,`
);

fs.writeFileSync('src/components/SettingsSheet.tsx', content);
