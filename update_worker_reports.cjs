const fs = require('fs');
const content = fs.readFileSync('src/components/LabourCard.tsx', 'utf8');
const newContent = content.replace(
  /dailyGrid\[i\] = \{\s*h: sNorm,\s*ot: sOT,\s*status: 'P',\s*isFriday: isSunday\s*\};/,
  "dailyGrid[i] = { h: sNorm, ot: sOT, status: 'P', isFriday: isSunday, sitesCount };"
).replace(
  /dailyGrid\[i\] = \{\s*h: dayNorm,\s*ot: dayOT,\s*status: 'P',\s*isFriday: isSunday\s*\};/,
  "dailyGrid[i] = { h: dayNorm, ot: dayOT, status: 'P', isFriday: isSunday, sitesCount };"
);
fs.writeFileSync('src/components/LabourCard.tsx', newContent);
