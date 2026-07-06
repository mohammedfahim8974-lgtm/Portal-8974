const fs = require('fs');
let content = fs.readFileSync('src/components/AllSitesSummary.tsx', 'utf8');

content = content.replace(/\\\`/g, '`').replace(/\\\$/g, '$');

fs.writeFileSync('src/components/AllSitesSummary.tsx', content);
