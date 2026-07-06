const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

content = content.replace(
  /totals\.amount\.toFixed\(2\),\n\s*\],\n\s*\]\n\s*\.map\(\(e\) => e\.join\(","\)\)\n\s*\.join\("\\n"\);/,
  `totals.amount.toFixed(2),\n      ],\n      ...(siteComments[selectedSite] ? [[], ["Remarks / Comments", \`"\${siteComments[selectedSite].replace(/"/g, '""')}"\`]] : [])\n    ]\n      .map((e) => e.join(","))\n      .join("\\n");`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
