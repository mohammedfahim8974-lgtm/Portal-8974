const fs = require('fs');

function addImport(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/from '\.\.\/lib\/utils';/, ", getSiteSettings } from '../lib/utils';");
  fs.writeFileSync(file, content);
}

['src/components/LabourCard.tsx', 'src/components/StaffInfo.tsx', 'src/components/WorkerReports.tsx'].forEach(addImport);
console.log("Imports added");
