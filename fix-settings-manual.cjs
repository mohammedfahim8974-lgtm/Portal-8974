const fs = require('fs');

function fixImport(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\} , getSiteSettings \} from '\.\.\/lib\/utils';/g, ", getSiteSettings } from '../lib/utils';");
  content = content.replace(/\} , getSiteSettings \}/g, ", getSiteSettings }");
  fs.writeFileSync(file, content);
}

['src/components/LabourCard.tsx', 'src/components/StaffInfo.tsx', 'src/components/WorkerReports.tsx'].forEach(fixImport);
console.log("Imports fixed");
