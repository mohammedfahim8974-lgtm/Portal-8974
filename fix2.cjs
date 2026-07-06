const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsSheet.tsx', 'utf8');

content = content.replace(
  /workerStandardHours: Number\(newSiteWorkerHours\) \|\| 0,/g,
  (match, offset, string) => {
    // If it's inside startEditSite, replace with siteSettings?.workerStandardHours
    // If it's inside saveEditSite, replace with editingSite.workerStandardHours || 0
    if (string.substring(offset - 200, offset).includes('startEditSite')) {
      return 'workerStandardHours: siteSettings?.workerStandardHours,';
    }
    if (string.substring(offset - 200, offset).includes('minChargeHours: editingSite')) {
      return 'workerStandardHours: editingSite.workerStandardHours || 0,';
    }
    return match;
  }
);
fs.writeFileSync('src/components/SettingsSheet.tsx', content);
