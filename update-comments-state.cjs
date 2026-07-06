const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

content = content.replace(
  /const pdfBlob = generatePdfBlob\(\n\s*siteName,\n\s*localSelectedMonth,\n\s*siteCalcs,\n\s*siteTotals,\n\s*daysInMonth,\n\s*settings,\n\s*\);/g,
  `const pdfBlob = generatePdfBlob(\n          siteName,\n          localSelectedMonth,\n          siteCalcs,\n          siteTotals,\n          daysInMonth,\n          settings,\n          siteComments[siteName],\n        );`
);

content = content.replace(
  /const docxBlob = await generateWordBlob\(\n\s*siteName,\n\s*localSelectedMonth,\n\s*siteCalcs,\n\s*siteTotals,\n\s*daysInMonth,\n\s*settings,\n\s*\);/g,
  `const docxBlob = await generateWordBlob(\n          siteName,\n          localSelectedMonth,\n          siteCalcs,\n          siteTotals,\n          daysInMonth,\n          settings,\n          siteComments[siteName],\n        );`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
