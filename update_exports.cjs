const fs = require('fs');

let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// Import AllSitesSummary
content = content.replace(
  /import \{ motion, AnimatePresence \} from "motion\/react";/,
  `import { motion, AnimatePresence } from "motion/react";\nimport { AllSitesSummary } from "./AllSitesSummary";`
);

// Add ALL_SITES option
content = content.replace(
  /<option value=\"\" disabled>\n\s*Select a site\n\s*<\/option>/,
  `<option value="" disabled>Select a site</option>\n                      <option value="ALL_SITES">🌍 All Sites Summary</option>`
);

// Render AllSitesSummary if ALL_SITES is selected
content = content.replace(
  /\{selectedSite \?\s*\(\n\s*<>\n\s*<div className=\"grid/g,
  `{selectedSite === "ALL_SITES" ? (
          <AllSitesSummary
            projectSites={projectSites}
            localSelectedMonth={localSelectedMonth}
            attendance={attendance}
            workers={workers}
            settings={settings}
            daysInMonth={daysInMonth}
          />
        ) : selectedSite ? (
          <>
            <div className="grid`
);

// also set default to ALL_SITES if projectSites.length > 0 instead of projectSites[0] if it looks better, but we can just leave it as is or change default.
content = content.replace(
  /const \[selectedSite, setSelectedSite\] = React\.useState\(projectSites\[0\] \|\| \"\"\);/,
  `const [selectedSite, setSelectedSite] = React.useState("ALL_SITES");`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
console.log("Updated ConstructionCalculator");
