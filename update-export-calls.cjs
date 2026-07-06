const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

content = content.replace(
  /const \[endDay, setEndDay\] = React\.useState<number>\(settings\.totalWorkingDays\);/,
  `const [endDay, setEndDay] = React.useState<number>(settings.totalWorkingDays);\n  const [siteComments, setSiteComments] = React.useState<{ [siteName: string]: string }>({});`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
