const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsSheet.tsx', 'utf8');

const regex = /<SettingsCard icon=\{<Globe size=\{20\} \/>\} title="Site Management">([\s\S]*?)<div className="space-y-2 max-h-\[300px\] overflow-y-auto pr-2 custom-scrollbar">/;

const replacement = `<SettingsCard icon={<Globe size={20} />} title="Site Management">
          <div className="space-y-6">
            <div className="border border-line dark:border-zinc-700/50 rounded-xl p-4 bg-[#F5F5F7]/30 dark:bg-zinc-800/20 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Add New Site</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSite()}
                    placeholder="Enter site name..."
                    className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 dark:text-white outline-none"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Min Charge (h)</label>
                  <input
                    type="number"
                    value={newSiteMinHours}
                    onChange={(e) =>
                      setNewSiteMinHours(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="e.g. 4"
                    className="w-full bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 dark:text-white outline-none"
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-line/40 dark:border-zinc-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      VAT Option
                    </label>
                    <p className="text-[9px] text-zinc-400">Apply or exempt UAE VAT</p>
                  </div>
                  <div className="flex bg-[#E5E5EA] dark:bg-zinc-850 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewSiteVatOption("with");
                        if (newSiteVat === 0) setNewSiteVat("");
                      }}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all duration-200",
                        newSiteVatOption === "with"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
                      )}
                    >
                      With VAT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSiteVatOption("without");
                        setNewSiteVat(0);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all duration-200",
                        newSiteVatOption === "without"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300",
                      )}
                    >
                      No VAT
                    </button>
                  </div>
                </div>
                
                {newSiteVatOption === "with" && (
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-line/40 dark:border-zinc-700/30">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      Custom VAT (%) <span className="opacity-50">(Optional)</span>
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={newSiteVat}
                      onChange={(e) =>
                        setNewSiteVat(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder={\`Default (\${settings.vatPercentage !== undefined ? settings.vatPercentage : 5}%)\`}
                      className="w-28 bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold focus:ring-1 focus:ring-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={addSite}
                disabled={!newSite.trim()}
                className="w-full mt-2 px-4 py-3 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Site
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/SettingsSheet.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Regex did not match");
}
