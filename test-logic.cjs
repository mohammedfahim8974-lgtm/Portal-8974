const fs = require('fs');
let content = fs.readFileSync('src/components/SitePrintPreview.tsx', 'utf8');

content = content.replace(
  /amount: number;\n\s*byDay: \{ \[day: number\]: number \};/,
  `amount: number;\n    totalPayout: number;\n    byDay: { [day: number]: number };`
);

fs.writeFileSync('src/components/SitePrintPreview.tsx', content);
