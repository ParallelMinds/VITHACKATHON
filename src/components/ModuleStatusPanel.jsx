import { Activity, CheckCircle2, AlertOctagon, HelpCircle } from "lucide-react";

export default function ModuleStatusPanel({ modules }) {
  const statusConfig = {
    Active: {
      color: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
      label: "Active",
      icon: <Activity className="w-4 h-4 text-blue-600" />
    },
    Completed: {
      color: "text-green-700",
      border: "border-green-200",
      dot: "bg-green-500",
      label: "Completed",
      icon: <CheckCircle2 className="w-4 h-4 text-green-600" />
    },
    Flagged: {
      color: "text-red-700",
      border: "border-red-200",
      dot: "bg-red-500",
      label: "Flagged",
      icon: <AlertOctagon className="w-4 h-4 text-red-600" />
    },
    "Mismatch Detected": {
      color: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
      label: "Mismatch",
      icon: <HelpCircle className="w-4 h-4 text-amber-600" />
    },
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/40 shadow-md hover:shadow-xl transition-all duration-300">
      <div className="px-5 py-3.5 border-b border-navy-100 flex items-center justify-between bg-gradient-to-r from-navy-50/50 to-transparent rounded-t-2xl">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Subsystem Diagnostics
        </h3>
      </div>

      <div className="p-4 flex flex-wrap gap-3">
        {modules.map((mod) => {
          const config = statusConfig[mod.status] || statusConfig.Active;
          return (
            <div
              key={mod.id}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all duration-200 hover:shadow-md cursor-default bg-white/60 shadow-sm ${config.border}`}
            >
              <div className="flex-shrink-0">
                  {config.icon}
              </div>
              <span className="text-xs font-bold text-slate-800 leading-none">
                 {mod.title}
              </span>
              <div className="w-px h-3 bg-navy-200 mx-1 border-r border-white/50" />
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider uppercase ${config.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${config.dot} ${mod.status === 'Active' ? 'animate-pulse' : ''}`} />
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
