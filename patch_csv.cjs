const fs = require('fs');
let content = fs.readFileSync('patch_calculator.cjs.test', 'utf8');

// The input looks like this:
/*
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Hourly Rate (AED)
                  </label>
                  <div className="relative">
                    <Calculator
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={16}
                    />
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F7] dark:bg-[#0a0a0a] border border-line dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none dark:text-white"
                    />
                  </div>
                </div>
*/

const targetString = `                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Hourly Rate (AED)
                  </label>
                  <div className="relative">
                    <Calculator
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={16}
                    />
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F7] dark:bg-[#0a0a0a] border border-line dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none dark:text-white"
                    />
                  </div>
                </div>`;

content = content.replace(targetString, '');

// Also remove `const rate = parseFloat(hourlyRate) || 0;` inside the component
content = content.replace(/const rate = parseFloat\(hourlyRate\) \|\| 0;/g, '');

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
