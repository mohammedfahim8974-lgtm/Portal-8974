const fs = require('fs');
let fileNames = [
  'src/components/AttendanceSheet.tsx',
  'src/components/ConstructionCalculator.tsx',
  'src/components/StaffInfo.tsx',
  'src/components/WorkerReports.tsx',
  'src/components/LabourCard.tsx',
];

for (const fileName of fileNames) {
  let content = fs.readFileSync(fileName, 'utf8');
  content = content.replace(/const standardHours = 9;/g, 'const standardHours = siteConfig?.workerStandardHours || 9;');
  content = content.replace(/\{ \.\.\.settings, standardWorkingHours: 9 \}/g, '{ ...settings, standardWorkingHours: standardHours }');
  fs.writeFileSync(fileName, content);
  console.log(`Updated ${fileName}`);
}
