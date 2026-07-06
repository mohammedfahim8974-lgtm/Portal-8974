const fs = require('fs');
let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

// Replace headers
content = content.replace(
  /"S\.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"/g,
  '"S.No", "Site Name", "Total Hours", "Total Payout", "Subtotal", "Margin", "VAT", "Total Revenue", "Net Profit"'
);

// We need to update the rows to include subtotal, margin, vat
content = content.replace(
  /s\.totals\.hours\.toFixed\(1\),\n\s*\(s\.totals\.totalPayout \|\| 0\)\.toFixed\(2\),\n\s*s\.totals\.amount\.toFixed\(2\),\n\s*s\.profit\.toFixed\(2\)/g,
  "s.totals.hours.toFixed(1),\n      (s.totals.totalPayout || 0).toFixed(2),\n      s.totals.subtotal.toFixed(2),\n      s.totals.margin.toFixed(2),\n      s.totals.vat.toFixed(2),\n      s.totals.amount.toFixed(2),\n      s.profit.toFixed(2)"
);

content = content.replace(
  /s\.totals\.hours\.toFixed\(1\) \+ 'h',\n\s*\(s\.totals\.totalPayout \|\| 0\)\.toFixed\(2\),\n\s*s\.totals\.amount\.toFixed\(2\),\n\s*s\.profit\.toFixed\(2\)/g,
  "s.totals.hours.toFixed(1) + 'h',\n      (s.totals.totalPayout || 0).toFixed(2),\n      s.totals.subtotal.toFixed(2),\n      s.totals.margin.toFixed(2),\n      s.totals.vat.toFixed(2),\n      s.totals.amount.toFixed(2),\n      s.profit.toFixed(2)"
);
content = content.replace(
  /s\.totals\.hours\.toFixed\(1\) \+ 'h',\n\s*\(s\.totals\.totalPayout \|\| 0\)\.toFixed\(2\),\n\s*s\.totals\.amount\.toFixed\(2\),\n\s*s\.profit\.toFixed\(2\)/g,
  "s.totals.hours.toFixed(1) + 'h',\n                  (s.totals.totalPayout || 0).toFixed(2),\n                  s.totals.subtotal.toFixed(2),\n                  s.totals.margin.toFixed(2),\n                  s.totals.vat.toFixed(2),\n                  s.totals.amount.toFixed(2),\n                  s.profit.toFixed(2)"
);

content = content.replace(
  /const grandProfit = siteSummaries.reduce\(\(sum, s\) => sum \+ s\.profit, 0\);/g,
  "const grandProfit = siteSummaries.reduce((sum, s) => sum + s.profit, 0);\n    const grandSubtotal = siteSummaries.reduce((sum, s) => sum + s.totals.subtotal, 0);\n    const grandMargin = siteSummaries.reduce((sum, s) => sum + s.totals.margin, 0);\n    const grandVat = siteSummaries.reduce((sum, s) => sum + (s.totals.vat || 0), 0);"
);

content = content.replace(
  /\["", "GRAND TOTAL", grandHours\.toFixed\(1\), grandPayout\.toFixed\(2\), grandRevenue\.toFixed\(2\), grandProfit\.toFixed\(2\)\]/g,
  '["", "GRAND TOTAL", grandHours.toFixed(1), grandPayout.toFixed(2), grandSubtotal.toFixed(2), grandMargin.toFixed(2), grandVat.toFixed(2), grandRevenue.toFixed(2), grandProfit.toFixed(2)]'
);

content = content.replace(
  /"GRAND TOTAL",\n\s*grandHours\.toFixed\(1\) \+ 'h',\n\s*grandPayout\.toFixed\(2\),\n\s*grandRevenue\.toFixed\(2\),\n\s*grandProfit\.toFixed\(2\)/g,
  '"GRAND TOTAL",\n      grandHours.toFixed(1) + \'h\',\n      grandPayout.toFixed(2),\n      grandSubtotal.toFixed(2),\n      grandMargin.toFixed(2),\n      grandVat.toFixed(2),\n      grandRevenue.toFixed(2),\n      grandProfit.toFixed(2)'
);
content = content.replace(
  /"GRAND TOTAL",\n\s*grandHours\.toFixed\(1\) \+ 'h',\n\s*grandPayout\.toFixed\(2\),\n\s*grandRevenue\.toFixed\(2\),\n\s*grandProfit\.toFixed\(2\)/g,
  '"GRAND TOTAL",\n                  grandHours.toFixed(1) + \'h\',\n                  grandPayout.toFixed(2),\n                  grandSubtotal.toFixed(2),\n                  grandMargin.toFixed(2),\n                  grandVat.toFixed(2),\n                  grandRevenue.toFixed(2),\n                  grandProfit.toFixed(2)'
);


fs.writeFileSync('src/components/WorkerReports.tsx', content);
