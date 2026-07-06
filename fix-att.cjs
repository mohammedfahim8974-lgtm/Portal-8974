const fs = require('fs');

const fixLogic = (fileName) => {
  let content = fs.readFileSync(fileName, 'utf8');
  content = content.replace(/const calcNorm = h > 0 \? \(h > stdHours \? stdHours : h\) : 0;/g,
  `const calcNorm = h > 0 ? (ot > 0 ? Math.min(Math.max(0, h - ot), stdHours) : Math.min(h, stdHours)) : 0;`);
  
  // also fix calcOt slightly to match ConstructionCalculator (optional but safer)
  content = content.replace(/const calcOt = ot > 0 \|\| \(h <= stdHours\) \? ot : Math\.max\(0, h - stdHours\);/g,
  `const calcOt = ot > 0 ? ot : Math.max(0, h - stdHours);`);
  fs.writeFileSync(fileName, content);
};

['src/components/StaffInfo.tsx', 'src/components/WorkerReports.tsx', 'src/components/LabourCard.tsx'].forEach(fixLogic);
console.log("Done fixing calcNorm and calcOt");
