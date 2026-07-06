const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsSheet.tsx', 'utf8');

// The original Field structure:
const originalField = `            <Field label="Add New Site">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSite()}
                  placeholder="Enter site name..."
                  className="flex-1 bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                />
                <input
                  type="number"
                  value={newSiteMinHours}
                  onChange={(e) =>
                    setNewSiteMinHours(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="Min Charge (h)"
                  className="w-32 bg-[#F5F5F7] dark:bg-zinc-800 border-line dark:border-zinc-700 rounded-lg text-sm focus:ring-zinc-900 dark:text-white"
                />
                <button
                  onClick={addSite}
                  className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </Field>`;

const newField = `            <div className="border border-line dark:border-zinc-700/50 rounded-xl p-4 bg-[#F5F5F7]/30 dark:bg-zinc-800/20 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Add New Site</h3>
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
              </div>`;

content = content.replace(originalField, newField);
fs.writeFileSync('src/components/SettingsSheet.tsx', content);
