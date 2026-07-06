const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

content = content.replace(
  /\s*\{\(calculations\.length > 0 \|\| absentWorkers\.length > 0\) && \(\n\s*<div className="space-y-6">/,
  `
            {(calculations.length > 0 || absentWorkers.length > 0) && (
              <div className="space-y-6">
                {/* Site Comments Box */}
                <div className="bg-white dark:bg-[#141414] rounded-2xl border border-line dark:border-white/10 shadow-sm p-4 md:p-6 transition-all duration-300">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Site Remarks / Comments</h3>
                  <textarea
                    value={siteComments[selectedSite] || ""}
                    onChange={(e) => setSiteComments({ ...siteComments, [selectedSite]: e.target.value })}
                    placeholder="Enter notes or remarks for this site..."
                    className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-none rounded-xl p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-purple-500/50 resize-y min-h-[100px]"
                  />
                </div>`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
