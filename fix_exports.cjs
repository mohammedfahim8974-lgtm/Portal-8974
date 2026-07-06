const fs = require('fs');
let content = fs.readFileSync('src/components/WorkerReports.tsx', 'utf8');

const funcs = `
  const handleDownloadRevenueCSV = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const localSelectedMonth = new Date(y, m - 1, 1);
    setShowRevenueMenu(false);
    const headers = ["S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"];
    const rows = siteSummaries.map((s, index) => [
      (index + 1).toString(),
      s.siteName,
      s.totals.hours.toFixed(1),
      (s.totals.totalPayout || 0).toFixed(2),
      s.totals.amount.toFixed(2),
      s.profit.toFixed(2)
    ]);

    const grandRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const grandPayout = siteSummaries.reduce((sum, s) => sum + (s.totals.totalPayout || 0), 0);
    const grandProfit = siteSummaries.reduce((sum, s) => sum + s.profit, 0);
    const grandHours = siteSummaries.reduce((sum, s) => sum + s.totals.hours, 0);

    const csvContent = [
      ["All Sites Revenue Breakdown"],
      [\`Period: \$\{localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}\`],
      [],
      headers,
      ...rows,
      [],
      ["", "GRAND TOTAL", grandHours.toFixed(1), grandPayout.toFixed(2), grandRevenue.toFixed(2), grandProfit.toFixed(2)]
    ].map(e => e.join(",")).join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, \`Revenue_Breakdown_\$\{localSelectedMonth.toLocaleString("default", { month: "short", year: "numeric" })\}.csv\`);
  };

  const handleDownloadRevenuePDF = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const localSelectedMonth = new Date(y, m - 1, 1);
    setShowRevenueMenu(false);
    const doc = new jsPDF("p", "mm", "a4");
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.text("All Sites Revenue Breakdown", 14, 22);
    doc.setFontSize(12);
    doc.text(\`Period: \$\{localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}\`, 14, 32);
    doc.text(\`Generated: \$\{date}\`, 14, 38);

    const grandRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const grandPayout = siteSummaries.reduce((sum, s) => sum + (s.totals.totalPayout || 0), 0);
    const grandProfit = siteSummaries.reduce((sum, s) => sum + s.profit, 0);
    const grandHours = siteSummaries.reduce((sum, s) => sum + s.totals.hours, 0);

    const tableData = siteSummaries.map((s, index) => [
      (index + 1).toString(),
      s.siteName,
      s.totals.hours.toFixed(1) + 'h',
      (s.totals.totalPayout || 0).toFixed(2),
      s.totals.amount.toFixed(2),
      s.profit.toFixed(2)
    ]);

    tableData.push([
      "",
      "GRAND TOTAL",
      grandHours.toFixed(1) + 'h',
      grandPayout.toFixed(2),
      grandRevenue.toFixed(2),
      grandProfit.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129] },
      footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
      willDrawCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          doc.setFont("helvetica", "bold");
          if (data.column.index === 0) {
            doc.setFillColor(240, 240, 240);
          }
        }
      }
    });

    doc.save(\`Revenue_Breakdown_\$\{localSelectedMonth.toLocaleString("default", { month: "short", year: "numeric" })\}.pdf\`);
  };

  const handleDownloadRevenueWord = async () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const localSelectedMonth = new Date(y, m - 1, 1);
    setShowRevenueMenu(false);
    
    const grandRevenue = siteSummaries.reduce((sum, s) => sum + s.totals.amount, 0);
    const grandPayout = siteSummaries.reduce((sum, s) => sum + (s.totals.totalPayout || 0), 0);
    const grandProfit = siteSummaries.reduce((sum, s) => sum + s.profit, 0);
    const grandHours = siteSummaries.reduce((sum, s) => sum + s.totals.hours, 0);

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "All Sites Revenue Breakdown",
            heading: "Heading1",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: \`Period: \$\{localSelectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}\`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  "S.No", "Site Name", "Total Hours", "Total Payout", "Total Revenue", "Net Profit"
                ].map(text => new TableCell({
                  children: [new Paragraph({ text: text, alignment: AlignmentType.CENTER })],
                  shading: { fill: "f3f4f6" }
                }))
              }),
              ...siteSummaries.map((s, index) => new TableRow({
                children: [
                  (index + 1).toString(),
                  s.siteName,
                  s.totals.hours.toFixed(1) + 'h',
                  (s.totals.totalPayout || 0).toFixed(2),
                  s.totals.amount.toFixed(2),
                  s.profit.toFixed(2)
                ].map(text => new TableCell({
                  children: [new Paragraph({ text: text, alignment: AlignmentType.CENTER })]
                }))
              })),
              new TableRow({
                children: [
                  "",
                  "GRAND TOTAL",
                  grandHours.toFixed(1) + 'h',
                  grandPayout.toFixed(2),
                  grandRevenue.toFixed(2),
                  grandProfit.toFixed(2)
                ].map(text => new TableCell({
                  children: [new Paragraph({ text: text, alignment: AlignmentType.CENTER })],
                  shading: { fill: "f3f4f6" }
                }))
              })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, \`Revenue_Breakdown_\$\{localSelectedMonth.toLocaleString("default", { month: "short", year: "numeric" })\}.docx\`);
  };

  const handleDownloadPDF = async () => {`;

content = content.replace(/const handleDownloadPDF = async \(\) => \{/, funcs);

fs.writeFileSync('src/components/WorkerReports.tsx', content);
