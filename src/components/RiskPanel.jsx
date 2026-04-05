import { AlertTriangle, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";

function AnimatedNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);
  
  return <motion.span>{rounded}</motion.span>;
}

export default function RiskPanel({ data, isAlertActive, onAcknowledge, allowedMetrics }) {
  const {
    detection_confidence,
    anomaly_score,
    mismatch_score,
    risk_score,
    risk_level,
  } = data;

  const riskColors = {
    LOW: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", bar: "bg-emerald-500", dot: "bg-emerald-500" },
    MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", bar: "bg-amber-500", dot: "bg-amber-500" },
    HIGH: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30 animate-pulse", bar: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]", dot: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" },
  };

  const colors = riskColors[risk_level] || riskColors.MEDIUM;

  let metrics = [
    { key: "Detection Confidence", label: "How sure the scan is", value: detection_confidence },
    { key: "Anomaly Score", label: "Unusual activity level", value: anomaly_score },
    { key: "Mismatch Score", label: "Manifest mismatch level", value: mismatch_score },
    { key: "Overall Risk Score", label: "Overall danger level", value: risk_score },
  ];

  if (allowedMetrics) {
    metrics = metrics.filter((m) => allowedMetrics.includes(m.key) || allowedMetrics.includes(m.label));
  }

  return (
    <div className={`bg-zinc-900/80 backdrop-blur-md rounded-2xl border h-full flex flex-col transition-all duration-300 ${isAlertActive ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-zinc-700 shadow-md hover:shadow-xl'}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-700 flex items-center justify-between bg-zinc-800/80 rounded-t-2xl">
        <h3 className="text-sm font-bold text-white tracking-tight">Threat Analysis</h3>
        {isAlertActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-full shadow-sm animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Alert</span>
          </div>
        )}
      </div>

      {/* Risk Level Badge */}
      <div className="px-5 pt-5 pb-4">
        <div
          className={`${colors.bg} ${colors.border} border-2 rounded-2xl px-5 py-5 flex items-center justify-between relative overflow-hidden shadow-inner`}
        >
          {isAlertActive && (
            <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
          )}
          <div className="relative z-10">
            <p className="text-xs text-zinc-400 font-bold tracking-wider uppercase mb-1">Threat Level</p>
            <p className={`text-4xl font-extrabold ${colors.text} tracking-tight drop-shadow-sm`}>
              {risk_level}
            </p>
          </div>
          <motion.div 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`w-14 h-14 rounded-full ${colors.bg} border-[3px] ${colors.border} flex items-center justify-center relative z-10 shadow-sm`}
          >
            {isAlertActive && (
               <span className={`absolute w-full h-full rounded-full ${colors.dot} opacity-30 animate-ping`} />
            )}
            <span className={`w-5 h-5 rounded-full ${colors.dot} shadow-sm ${isAlertActive ? 'animate-pulse' : ''}`} />
          </motion.div>
        </div>
        
        {isAlertActive && (
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onAcknowledge}
            className="w-full mt-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
          >
            <BellOff className="w-4 h-4" />
            Acknowledge Alert
          </motion.button>
        )}
      </div>

      {/* Metrics */}
      <div className="px-5 pb-6 flex-1 flex flex-col justify-end space-y-4">
        {metrics.map((metric, idx) => (
          <MetricRow key={metric.label} metric={metric} delay={idx * 0.1} />
        ))}
      </div>
    </div>
  );
}

function MetricRow({ metric, delay }) {
  const pct = Math.round(metric.value * 100);

  const getBarColor = (value) => {
    if (value >= 0.75) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
    if (value >= 0.5) return "bg-amber-500 shadow-[0_0_10px_rgba(217,119,6,0.6)]";
    return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-white tracking-tight">{metric.label}</span>
        <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded leading-none border border-zinc-700 shadow-sm inline-flex items-center">
          <AnimatedNumber value={pct} />%
        </span>
      </div>
      <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700 shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay }}
          className={`h-full rounded-full shadow-sm relative overflow-hidden ${getBarColor(metric.value)}`}
        >
           {/* Shimmer effect inside the bar */}
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </motion.div>
      </div>
    </div>
  );
}
