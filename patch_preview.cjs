const fs = require('fs');
let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

// Remove Hourly Rate block from UI totals
const targetStringHourlyRate = `                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Hourly Rate
                        </p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">
                          {parseFloat(hourlyRate || "0").toFixed(2)}
                        </p>
                      </div>`;

content = content.replace(targetStringHourlyRate, '');

// Rename "Total Payable Amount" to "Total Revenue"
content = content.replace(
  /Total Payable Amount/g,
  `Total Revenue (Billed)`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
