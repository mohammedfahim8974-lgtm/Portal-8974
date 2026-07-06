const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// I will split by `    const csvContent = [` and then find the closing `    const blob = new Blob([csvContent]` and replace that whole section.

const parts = content.split('    const csvContent = [');
const afterBlob = parts[1].split('    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });');

const newCsvContent = `
      [\`Site Report: \$\{selectedSite}\`],
      [
        \`Period: \$\{localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}\`,
      ],
      [],
      headers,
      ...rows,
      [],
      [
        "Total",
        "",
        "",
        "",
        ...daysInMonth.map((d) => totals.byDay[d.day]),
        totals.hours,
        totals.chargedHours.toFixed(2),
        totals.subtotal.toFixed(2),
        ...(marginPercentage > 0 ? [totals.margin.toFixed(2)] : []),
        totals.vat.toFixed(2),
        totals.amount.toFixed(2),
      ],
      [],
      ["Total Payout", totals.totalPayout.toFixed(2)],
      ["Net Profit", (totals.subtotal + totals.margin - totals.totalPayout).toFixed(2)],
      ...(siteComments[selectedSite] ? [[], ["Remarks / Comments", \`"\$\{siteComments[selectedSite].replace(/"/g, '""')}"\`]] : [])
    ]
      .map((e) => e.join(","))
      .join("\\n");

`;

content = parts[0] + '    const csvContent = [' + newCsvContent + '    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });' + afterBlob[1];

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
