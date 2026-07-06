const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsSheet.tsx', 'utf8');

content = content.replace(/,, Plus/g, ", Plus");

fs.writeFileSync('src/components/SettingsSheet.tsx', content);
