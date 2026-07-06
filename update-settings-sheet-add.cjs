const fs = require('fs');

let content = fs.readFileSync('src/components/ConstructionCalculator.tsx', 'utf8');

const totalPayoutBlock = `
                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Total Payout
                        </p>
                        <p className="text-2xl font-black text-rose-500">
                          {calculations
                            .reduce((sum, c) => sum + (c.workerCost || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 text-zinc-500 dark:text-zinc-400">
                          Net Profit
                        </p>
                        <p className="text-2xl font-black text-emerald-500">
                          {calculations
                            .reduce((sum, c) => sum + c.subtotal + c.margin - (c.workerCost || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>
`;

content = content.replace(
  /<p className=\"text-2xl font-black text-amber-600 dark:text-amber-400\">\n\s*\{calculations\n\s*\.reduce\(\(sum, c\) => sum \+ c\.vat, 0\)\n\s*\.toFixed\(2\)\}\n\s*<\/p>\n\s*<\/div>\n\s*<\/div>/g,
  `<p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                          {calculations
                            .reduce((sum, c) => sum + c.vat, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      \${totalPayoutBlock}
                    </div>`
);

fs.writeFileSync('src/components/ConstructionCalculator.tsx', content);
console.log("Updated UI for payout and profit");
