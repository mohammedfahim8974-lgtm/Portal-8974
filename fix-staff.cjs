const fs = require('fs');

let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// CSV update
content = content.replace(
  /totals\.amount\.toFixed\(2\),\n\s*\],\n\s*\.\.\.\(siteComments\[selectedSite\]/g,
  `totals.amount.toFixed(2),
      ],
      [],
      ["Total Payout", totals.totalPayout.toFixed(2)],
      ["Net Profit", (totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)],
      ...(siteComments[selectedSite]`
);

// PDF update inside the component
content = content.replace(
  /doc\.text\(\`VAT: \$\{totals\.vat\.toFixed\(2\)\}\`, 14, 45\);\n\s*doc\.setFontSize\(12\);\n\s*doc\.text\(\`Total Amount: \$\{totals\.amount\.toFixed\(2\)\} AED\`, 14, 52\);/g,
  `doc.text(\`VAT: \$\{totals.vat.toFixed(2)}\`, 14, 45);
      doc.setFontSize(12);
      doc.text(\`Total Amount: \$\{totals.amount.toFixed(2)} AED\`, 14, 52);
      
      doc.setFontSize(11);
      doc.setTextColor(220, 38, 38);
      doc.text(\`Total Payout: \$\{totals.totalPayout.toFixed(2)} AED\`, 14, 58);
      doc.setTextColor(16, 185, 129);
      doc.text(\`Net Profit: \$\{(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED\`, 14, 64);
      doc.setTextColor(100);`
);

// Word update inside the component
content = content.replace(
  /new Paragraph\(\{\n\s*text: \`VAT: \$\{totals\.vat\.toFixed\(2\)\}\`,\n\s*\}\),\n\s*new Paragraph\(\{\n\s*text: \`Total Amount: \$\{totals\.amount\.toFixed\(2\)\} AED\`,\n\s*\}\),/g,
  `new Paragraph({
              text: \`VAT: \$\{totals.vat.toFixed(2)}\`,
            }),
            new Paragraph({
              text: \`Total Amount: \$\{totals.amount.toFixed(2)} AED\`,
            }),
            new Paragraph({
              text: \`Total Payout: \$\{totals.totalPayout.toFixed(2)} AED\`,
            }),
            new Paragraph({
              text: \`Net Profit: \$\{(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED\`,
            }),`
);

// Also update the helpers generatePdfBlob and generateWordBlob at the top of the file
content = content.replace(
  /doc\.text\(\`VAT: \$\{totals\.vat\.toFixed\(2\)\}\`, 14, 45\);\n\s*doc\.setFontSize\(12\);\n\s*doc\.text\(\`Total Amount: \$\{totals\.amount\.toFixed\(2\)\} AED\`, 14, 52\);/g,
  `doc.text(\`VAT: \$\{totals.vat.toFixed(2)}\`, 14, 45);
      doc.setFontSize(12);
      doc.text(\`Total Amount: \$\{totals.amount.toFixed(2)} AED\`, 14, 52);
      
      doc.setFontSize(11);
      doc.setTextColor(220, 38, 38);
      doc.text(\`Total Payout: \$\{totals.totalPayout.toFixed(2)} AED\`, 14, 58);
      doc.setTextColor(16, 185, 129);
      doc.text(\`Net Profit: \$\{(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED\`, 14, 64);
      doc.setTextColor(100);`
);

content = content.replace(
  /new Paragraph\(\{\n\s*text: \`VAT: \$\{totals\.vat\.toFixed\(2\)\}\`,\n\s*\}\),\n\s*new Paragraph\(\{\n\s*text: \`Total Amount: \$\{totals\.amount\.toFixed\(2\)\} AED\`,\n\s*\}\),/g,
  `new Paragraph({
              text: \`VAT: \$\{totals.vat.toFixed(2)}\`,
            }),
            new Paragraph({
              text: \`Total Amount: \$\{totals.amount.toFixed(2)} AED\`,
            }),
            new Paragraph({
              text: \`Total Payout: \$\{totals.totalPayout.toFixed(2)} AED\`,
            }),
            new Paragraph({
              text: \`Net Profit: \$\{(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED\`,
            }),`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
console.log("Updated exports in ConstructionCalculator.tsx");
