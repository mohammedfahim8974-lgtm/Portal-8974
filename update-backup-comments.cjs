const fs = require('fs');

let content = fs.readFileSync('src/components/SitePrintPreview.tsx', 'utf8');

const printFooter = `
              </tfoot>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 print:bg-transparent print:border-none print:p-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Payable</p>
              <p className="text-xl font-black text-zinc-900">{totals.amount.toFixed(2)} AED</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 print:bg-transparent print:border-none print:p-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Payout</p>
              <p className="text-xl font-black text-rose-600">{totals.totalPayout?.toFixed(2) || "0.00"} AED</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 print:bg-transparent print:border-none print:p-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Net Profit</p>
              <p className="text-xl font-black text-emerald-600">{(totals.subtotal + (totals.margin || 0) - (totals.totalPayout || 0)).toFixed(2)} AED</p>
            </div>
          </div>
`;

content = content.replace(
  /<\/tfoot>\n\s*<\/table>\n\s*<\/div>/g,
  printFooter
);

fs.writeFileSync('src/components/SitePrintPreview.tsx', content);
console.log("Updated SitePrintPreview.tsx");
