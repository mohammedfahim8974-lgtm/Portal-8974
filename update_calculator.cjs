const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// For generateWordBlob
content = content.replace(
  /new Table\(\{([\s\S]*?)\]\,\n\s*\}\)\,(\n\s*\]\,\n\s*\}\,\n\s*\]\,\n\s*\}\)\;\n\s*return await Packer\.toBlob\(doc\)\;)/,
  `new Table({$1],\n          }),\n          ...(siteComment ? [\n            new Paragraph({ spacing: { before: 400 } }),\n            new Paragraph({\n              children: [\n                new TextRun({ text: "Remarks / Comments:", bold: true, size: 20 }),\n              ]\n            }),\n            new Paragraph({\n              children: [\n                new TextRun({ text: siteComment, size: 18 }),\n              ]\n            })\n          ] : []),\n        $2`
);

// For handleDownloadWord
content = content.replace(
  /new Table\(\{([\s\S]*?)\]\,\n\s*\}\)\,(\n\s*\]\,\n\s*\}\,\n\s*\]\,\n\s*\}\)\;\n\s*const blob = await Packer\.toBlob\(doc\)\;)/,
  `new Table({$1],\n            }),\n            ...(siteComments[selectedSite] ? [\n              new Paragraph({ spacing: { before: 400 } }),\n              new Paragraph({\n                children: [\n                  new TextRun({ text: "Remarks / Comments:", bold: true, size: 20 }),\n                ]\n              }),\n              new Paragraph({\n                children: [\n                  new TextRun({ text: siteComments[selectedSite], size: 18 }),\n                ]\n              })\n            ] : []),\n          $2`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
