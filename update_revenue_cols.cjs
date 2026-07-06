const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// Update generatePdfBlob
content = content.replace(
  /footStyles: \{\n\s*fillColor: \[240, 240, 240\],\n\s*textColor: \[0, 0, 0\],\n\s*fontStyle: "bold",\n\s*\},\n\s*\}\);/,
  `footStyles: {\n        fillColor: [240, 240, 240],\n        textColor: [0, 0, 0],\n        fontStyle: "bold",\n      },\n    });\n    if (siteComment) {\n      const finalY = (doc as any).lastAutoTable.finalY || 100;\n      doc.setFontSize(10);\n      doc.text("Remarks / Comments:", 14, finalY + 10);\n      doc.setFontSize(9);\n      doc.setTextColor(100);\n      const splitComment = doc.splitTextToSize(siteComment, doc.internal.pageSize.width - 28);\n      doc.text(splitComment, 14, finalY + 15);\n    }`
);

// Update handleDownloadPDF
content = content.replace(
  /footStyles: \{\n\s*fillColor: \[240, 240, 240\],\n\s*textColor: \[0, 0, 0\],\n\s*fontStyle: "bold",\n\s*\},\n\s*\}\);\n\s*doc\.save/,
  `footStyles: {\n        fillColor: [240, 240, 240],\n        textColor: [0, 0, 0],\n        fontStyle: "bold",\n      },\n    });\n    const comment = siteComments[selectedSite];\n    if (comment) {\n      const finalY = (doc as any).lastAutoTable.finalY || 100;\n      doc.setFontSize(10);\n      doc.text("Remarks / Comments:", 14, finalY + 10);\n      doc.setFontSize(9);\n      doc.setTextColor(100);\n      const splitComment = doc.splitTextToSize(comment, doc.internal.pageSize.width - 28);\n      doc.text(splitComment, 14, finalY + 15);\n    }\n    doc.save`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
