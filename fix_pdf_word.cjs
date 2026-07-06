const fs = require('fs');

let content = fs.readFileSync('src/components/SiteManagement.tsx', 'utf8');

// 1. Add state variables
content = content.replace(
  /const \[expandedFolders, setExpandedFolders\] = useState<Set<string>>\(\s*new Set\(\["Uncategorized"\]\),\s*\);/g,
  `const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["Uncategorized"]),
  );
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("done");
  const [otherReasonText, setOtherReasonText] = useState<string>("");`
);

// 2. Change removeSite to just open the modal
content = content.replace(
  /const removeSite = \(site: string\) => \{\s*if \(window\.confirm\(`Are you sure you want to remove \$\{site\}\?`\)\) \{\s*const updatedSites = sites\.filter\(\(s\) => s !== site\);\s*const nextGroups = \{ \.\.\.\(settings\.siteGroups \|\| \{\}\) \};\s*Object\.keys\(nextGroups\)\.forEach\(\(f\) => \{\s*nextGroups\[f\] = nextGroups\[f\]\.filter\(\(s\) => s !== site\);\s*\}\);\s*onUpdateSettings\(\{\s*\.\.\.settings,\s*projectSites: updatedSites,\s*siteGroups: nextGroups,\s*\}\);\s*\}\s*\};/g,
  `const removeSite = (site: string) => {
    setSiteToDelete(site);
    setDeleteReason("done");
    setOtherReasonText("");
  };

  const confirmRemoveSite = () => {
    if (!siteToDelete) return;
    
    let fullReason = "";
    if (deleteReason === "done") {
      fullReason = "Done / Job finished";
    } else if (deleteReason === "not_continued") {
      fullReason = "This site is not continued";
    } else if (deleteReason === "duplicate") {
      fullReason = "Duplicate / error entry";
    } else {
      fullReason = otherReasonText.trim() || "Other reason";
    }

    const updatedSites = sites.filter((s) => s !== siteToDelete);
    const nextGroups = { ...(settings.siteGroups || {}) };
    Object.keys(nextGroups).forEach((f) => {
      nextGroups[f] = nextGroups[f].filter((s) => s !== siteToDelete);
    });

    onUpdateSettings({
      ...settings,
      projectSites: updatedSites,
      siteGroups: nextGroups,
    });
    setSiteToDelete(null);
  };`
);

fs.writeFileSync('src/components/SiteManagement.tsx', content);
console.log("Updated SiteManagement.tsx logic");
