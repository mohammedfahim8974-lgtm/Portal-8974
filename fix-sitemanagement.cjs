const fs = require('fs');

let content = fs.readFileSync('src/components/SiteManagement.tsx', 'utf8');

// Add imports
content = content.replace(
  /import \{ cn, isSameSite \} from "\.\.\/lib\/utils";/g,
  `import { cn, isSameSite } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";`
);

// Add the modal before the final closing div
const modalCode = `
      <AnimatePresence>
        {siteToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          >
            <div
              onClick={() => setSiteToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-zinc-950 p-10 overflow-hidden group text-zinc-100 border border-zinc-800 rounded-3xl"
            >
              <div className="relative flex flex-col items-center space-y-6">
                <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <AlertCircle size={36} />
                </div>

                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold text-white">
                    Delete Project Site
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-[320px] mx-auto leading-relaxed">
                    Why are you deleting{" "}
                    <span className="text-emerald-400 font-bold">
                      {siteToDelete}
                    </span>
                    ?
                  </p>
                </div>

                <div className="w-full space-y-3">
                  {[
                    { id: "done", label: "Done / Job finished" },
                    { id: "not_continued", label: "This site is not continued" },
                    { id: "duplicate", label: "Duplicate / error entry" },
                    { id: "other", label: "Other reason" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setDeleteReason(option.id)}
                      className={cn(
                        "w-full p-4 flex items-center justify-between rounded-2xl border transition-all duration-200",
                        deleteReason === option.id
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200",
                      )}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                          deleteReason === option.id
                            ? "border-emerald-500"
                            : "border-zinc-600",
                        )}
                      >
                        {deleteReason === option.id && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </div>
                    </button>
                  ))}

                  <AnimatePresence>
                    {deleteReason === "other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <input
                          type="text"
                          value={otherReasonText}
                          onChange={(e) => setOtherReasonText(e.target.value)}
                          placeholder="Please specify..."
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mt-2"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-full space-y-3 pt-4">
                  <button
                    onClick={confirmRemoveSite}
                    disabled={deleteReason === "other" && !otherReasonText.trim()}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-lg active:scale-95"
                  >
                    Confirm Site Deletion
                  </button>
                  <button
                    onClick={() => setSiteToDelete(null)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/5 active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};`;

content = content.replace(/    <\/div>\n  \);\n};\n?$/g, modalCode);

fs.writeFileSync('src/components/SiteManagement.tsx', content);
console.log("Added modal to SiteManagement.tsx");
