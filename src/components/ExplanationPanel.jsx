import { AlertTriangle, Info, ShieldAlert, FileText, Magnet, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ExplanationPanel({ explanations }) {
  const severityStyles = {
    high: {
      bg: "bg-red-50/50",
      border: "border-red-200",
      leftBorder: "border-l-4 border-red-400",
      text: "text-red-800",
      badge: "bg-red-100 text-red-700 border border-red-200",
      hover: "hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
      icon: <ShieldAlert className="w-5 h-5 text-red-600" />
    },
    medium: {
      bg: "bg-amber-50/50",
      border: "border-amber-200",
      leftBorder: "border-l-4 border-yellow-400",
      text: "text-amber-800",
      badge: "bg-amber-100 text-amber-700 border border-amber-200",
      hover: "hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />
    },
    info: {
      bg: "bg-navy-50/40",
      border: "border-navy-200",
      leftBorder: "border-l-blue-500",
      text: "text-slate-800",
      badge: "bg-blue-50 text-blue-700 border border-blue-200",
      hover: "hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
      icon: <Info className="w-5 h-5 text-blue-600" />
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/40 shadow-md hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-navy-100 flex items-center justify-between bg-gradient-to-r from-navy-50/50 to-transparent rounded-t-2xl">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Analysis Explanations
        </h3>
        <span className="text-xs font-bold bg-navy-100/80 text-slate-600 px-2.5 py-1 rounded-md border border-navy-200 shadow-inner">
          {explanations.length} Findings Output
        </span>
      </div>

      {/* Findings */}
      <div className="p-5 pt-4">
        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar scroll-smooth relative">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-2"
          >
            {explanations.map((item) => (
              <ExplanationCard 
                key={item.id} 
                item={item} 
                styles={severityStyles[item.severity] || severityStyles.info} 
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ExplanationCard({ item, styles }) {
  const [expanded, setExpanded] = useState(false);

  const getIcon = (emojiId, sStyles) => {
    switch (emojiId) {
      case "⚠️": return sStyles.icon;
      case "🔍": return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case "📋": return <FileText className="w-5 h-5 text-blue-600" />;
      case "🧲": return <Magnet className="w-5 h-5 text-red-600" />;
      case "📦": return <Info className="w-5 h-5 text-amber-600" />;
      case "💧": return <ShieldAlert className="w-5 h-5 text-blue-600" />;
      case "🚨": return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return sStyles.icon;
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      variants={itemVariants}
      onClick={() => setExpanded(!expanded)}
      className={`relative flex flex-col px-4 py-3.5 rounded-xl border-y border-r border-l-4 transition-all duration-300 cursor-pointer ${styles.bg} ${styles.border} ${styles.leftBorder} ${styles.hover}`}
    >
      <div className="flex items-start gap-3.5 relative z-10 w-full pr-6">
        <div className="mt-0.5 flex-shrink-0 bg-white p-1.5 rounded-lg shadow-sm border border-navy-100">
          {getIcon(item.icon, styles)}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${styles.text} leading-tight`}>
            {item.text}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md shadow-sm leading-none ${styles.badge}`}
          >
            {item.severity}
          </span>
        </div>
      </div>
      
      <ChevronDown 
        className={`absolute right-3.5 top-5 w-4 h-4 text-navy-400 transition-transform duration-300 ${expanded ? 'rotate-180 text-navy-700' : ''}`} 
      />

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-3 border-t border-navy-200/60">
              <p className="text-xs font-semibold text-navy-700 bg-white/60 p-2.5 rounded-lg border border-white shadow-inner">
                {item.detail}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
