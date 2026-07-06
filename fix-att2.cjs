const fs = require('fs');

let content = fs.readFileSync('src/components/AttendanceSelection.tsx', 'utf8');

// Inside confirmDelete, if type === "site", also remove from projectSites
content = content.replace(
  /dbSites\[monthKey\] = currentMonthSites;\s*newSettings\.hiddenSitesByMonth = dbSites;/g,
  `dbSites[monthKey] = currentMonthSites;
      newSettings.hiddenSitesByMonth = dbSites;
      // Also remove from projectSites globally so it doesn't appear in future months
      newSettings.projectSites = (newSettings.projectSites || []).filter(s => s !== value);
      if (newSettings.siteGroups) {
        Object.keys(newSettings.siteGroups).forEach(f => {
          newSettings.siteGroups[f] = newSettings.siteGroups[f].filter(s => s !== value);
        });
      }`
);

fs.writeFileSync('src/components/AttendanceSelection.tsx', content);
console.log("Updated AttendanceSelection.tsx");
