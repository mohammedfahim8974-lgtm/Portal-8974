const fs = require('fs');

let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

const pdfAdditions = `
    const finalYBeforeTotals = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text(\`Total Payout: \$\{totals.totalPayout.toFixed(2)} AED\`, 14, finalYBeforeTotals + 10);
    doc.setTextColor(16, 185, 129);
    doc.text(\`Net Profit: \$\{(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED\`, 14, finalYBeforeTotals + 16);
    doc.setTextColor(100);
    const finalY = finalYBeforeTotals + 20; // adjust for comments
`;

content = content.replace(
  /const finalY = \(doc as any\)\.lastAutoTable\.finalY \|\| 100;/g,
  pdfAdditions
);

const wordAdditions = `
          new Paragraph({ text: "" }), // Spacer
          new Paragraph({
            text: \`Total Payout: \$\{totals.totalPayout.toFixed(2)} AED\`,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            text: \`Net Profit: \$\{(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED\`,
            alignment: AlignmentType.RIGHT,
          }),
          ...(siteComment ? [
`;

content = content.replace(
  /\.\.\.\(siteComment \? \[/g,
  wordAdditions
);

const wordAdditionsInner = `
          new Paragraph({ text: "" }), // Spacer
          new Paragraph({
            text: \`Total Payout: \$\{totals.totalPayout.toFixed(2)} AED\`,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            text: \`Net Profit: \$\{(totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)} AED\`,
            alignment: AlignmentType.RIGHT,
          }),
          ...(comment ? [
`;

content = content.replace(
  /\.\.\.\(comment \? \[/g,
  wordAdditionsInner
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
console.log("Updated PDF and Word");
