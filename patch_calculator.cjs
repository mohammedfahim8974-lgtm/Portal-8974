const fs = require('fs');

let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

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
            ...(siteComments[selectedSite] ? [
`;

content = content.replace(
  /\.\.\.\(siteComments\[selectedSite\] \? \[/g,
  wordAdditionsInner
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
console.log("Updated Word");
