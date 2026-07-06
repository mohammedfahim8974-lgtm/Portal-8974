const fs = require('fs');

let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

// Update PDF Export
content = content.replace(
  /doc\.text\(\`Generated on: \$\{new Date\(\)\.toLocaleDateString\(\)\}\`, 14, 37\);/,
  `doc.text(\`Generated on: \$\{new Date().toLocaleDateString()}\`, 14, 37);
    
    // Add Summary Stats
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(\`Total Revenue: \$\{stats.totalRevenue.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`, 14, 45);
    doc.text(\`Total Payroll: \$\{stats.totalWage.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`, 14, 51);
    doc.text(\`Net Profit: \$\{stats.netProfit.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\`, 14, 57);`
);

content = content.replace(
  /startY: 45,/,
  `startY: 65,`
);

// Update Word Export
content = content.replace(
  /new Paragraph\(\{ text: "" \}\), \/\/ Spacer/,
  `new Paragraph({ text: "" }), // Spacer
          new Paragraph({ text: \`Total Revenue: \$\{stats.totalRevenue.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\` }),
          new Paragraph({ text: \`Total Payroll: \$\{stats.totalWage.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\` }),
          new Paragraph({ text: \`Net Profit: \$\{stats.netProfit.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED\` }),
          new Paragraph({ text: "" }), // Spacer`
);

// Update CSV Export
content = content.replace(
  /const csvContent = \[headers, \.\.\.rows\]\.map\(e => e\.join\(\",\"\)\)\.join\(\"\\n\"\);/,
  `const summaryRows = [
      ['Total Revenue', \`\$\{stats.totalRevenue.toFixed(2)}\`],
      ['Total Payroll', \`\$\{stats.totalWage.toFixed(2)}\`],
      ['Net Profit', \`\$\{stats.netProfit.toFixed(2)}\`],
      [], // Empty row
    ];
    const csvContent = [...summaryRows, headers, ...rows].map(e => e.join(",")).join("\\n");`
);

fs.writeFileSync('src/components/WorkerReports.tsx', content);
console.log("Updated Exports in WorkerReports.tsx");
