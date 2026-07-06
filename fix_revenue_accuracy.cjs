const fs = require('fs');
let fileNames = [
  'src/components/StaffInfo.tsx',
  'src/components/WorkerReports.tsx',
  'src/components/LabourCard.tsx',
];

for (const fileName of fileNames) {
  let content = fs.readFileSync(fileName, 'utf8');
  content = content.replace(/const standardHours = siteConfig\?\.workerStandardHours \|\| 9;/g, 'const standardHours = 9;');
  fs.writeFileSync(fileName, content);
  console.log(`Updated ${fileName}`);
}
