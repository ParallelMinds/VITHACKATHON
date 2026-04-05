import { Droplets, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function MaterialAnalysis({ data }) {
  const { detected_items, overall } = data;
  const isWet = overall === "WET";

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -12 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-700 shadow-md hover:shadow-xl overflow-hidden flex flex-col h-full transition-all duration-300">
      {/* Header (Title) */}
      <div className="px-5 py-4 border-b border-zinc-700 flex items-center justify-between bg-zinc-800/80 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <Droplets className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">Material Analysis</h3>
        </div>
        <span
          className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${
            isWet
              ? "bg-red-500/10 text-red-400 border-red-500/30"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          }`}
        >
          {isWet ? "WET CARGO" : "DRY CARGO"}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Classification */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`rounded-xl px-4 py-4 flex items-center justify-between border-2 shadow-inner ${
            isWet
              ? "bg-red-500/10 border-red-500/30"
              : "bg-emerald-500/10 border-emerald-500/30"
          }`}
        >
          <div>
            <p className="text-xs text-zinc-400 font-bold tracking-wider uppercase mb-1">
              Cargo Classification
            </p>
            <p
              className={`text-xl sm:text-2xl font-extrabold tracking-tight drop-shadow-sm ${
                isWet ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {isWet ? "🔴 WET CARGO DETECTED" : "🟢 DRY CARGO"}
            </p>
          </div>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border-[3px] shadow-sm ml-4 ${
              isWet
                ? "bg-red-500/10 border-red-500/30"
                : "bg-emerald-500/10 border-emerald-500/30"
            }`}
          >
            {isWet ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </motion.div>
        </motion.div>

        {/* Detected Containers List */}
        {detected_items.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">
              Detected Containers
            </p>
            <div className="flex flex-col gap-3">
              {detected_items.map((item, idx) => {
                const itemIsWet = item.material === "WET";
                return (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-all duration-200 hover:shadow-md cursor-default ${
                      itemIsWet
                        ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                        : "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Droplets
                        className={`w-4 h-4 flex-shrink-0 ${
                          itemIsWet ? "text-red-400" : "text-emerald-400"
                        }`}
                      />
                      <span className="text-xs font-bold text-white">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-sm border ${
                          itemIsWet
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {item.material}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-sm border ${
                          item.risk === "HIGH"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {item.risk}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recommended Action */}
        <div
          className={`rounded-xl px-4 py-3 border-2 border-dashed flex items-center gap-3 ${
            isWet
              ? "border-red-500/30 bg-red-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isWet ? "bg-red-400 animate-pulse" : "bg-emerald-400"
            }`}
          />
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
              Recommended Action
            </p>
            <p
              className={`text-sm font-extrabold tracking-tight ${
                isWet ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {isWet ? "Manual Inspection Required" : "Cleared for Processing"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
