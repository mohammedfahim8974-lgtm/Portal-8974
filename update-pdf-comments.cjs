const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// Add siteComment argument to signatures
content = content.replace(
  /const generatePdfBlob = \(\n\s*siteName: string,\n\s*localSelectedMonth: Date,\n\s*calculations: WorkerCalculation\[\],\n\s*totals: any,\n\s*daysInMonth: \{ day: number; name: string \}\[\],\n\s*settings: SystemSettings,\n\): Blob => \{/g,
  `const generatePdfBlob = (\n  siteName: string,\n  localSelectedMonth: Date,\n  calculations: WorkerCalculation[],\n  totals: any,\n  daysInMonth: { day: number; name: string }[],\n  settings: SystemSettings,\n  siteComment: string = "",\n): Blob => {`
);

content = content.replace(
  /const generateWordBlob = async \(\n\s*siteName: string,\n\s*localSelectedMonth: Date,\n\s*calculations: WorkerCalculation\[\],\n\s*totals: any,\n\s*daysInMonth: \{ day: number; name: string \}\[\],\n\s*settings: SystemSettings,\n\): Promise<Blob> => \{/g,
  `const generateWordBlob = async (\n  siteName: string,\n  localSelectedMonth: Date,\n  calculations: WorkerCalculation[],\n  totals: any,\n  daysInMonth: { day: number; name: string }[],\n  settings: SystemSettings,\n  siteComment: string = "",\n): Promise<Blob> => {`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
