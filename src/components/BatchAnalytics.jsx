import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from "recharts";
import { Activity, BarChart2, Hash, AlertTriangle, CheckCircle, Package, Percent } from "lucide-react";

const CLASS_NAMES = [
  'Baton', 'Pliers', 'Hammer', 'Powerbank', 'Scissors',
  'Wrench', 'Gun', 'Bullet', 'Sprayer', 'HandCuffs', 'Knife', 'Lighter'
];

const CLASS_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
  "#84cc16", "#06b6d4",
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = "indigo", pulse = false }) {
  const colorMap = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", iconBg: "bg-indigo-100", dot: "bg-indigo-500" },
    green:  { bg: "bg-green-50",  text: "text-green-700",  iconBg: "bg-green-100",  dot: "bg-green-500"  },
    red:    { bg: "bg-red-50",    text: "text-red-700",    iconBg: "bg-red-100",    dot: "bg-red-500"    },
    amber:  { bg: "bg-amber-50",  text: "text-amber-700",  iconBg: "bg-amber-100",  dot: "bg-amber-500"  },
  };
  const c = colorMap[color] || colorMap.indigo;
  return (
    <motion.div
      variants={itemVariants}
      className={`${c.bg} rounded-2xl border border-white/60 shadow-md p-5 flex items-center gap-4`}
    >
      <div className={`${c.iconBg} p-3 rounded-xl shadow-sm`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate">{label}</p>
        <p className={`text-2xl font-extrabold ${c.text} leading-tight`}>{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
      </div>
      {pulse && <span className={`w-2.5 h-2.5 rounded-full ${c.dot} animate-pulse flex-shrink-0`} />}
    </motion.div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 backdrop-blur-md border border-zinc-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: <span className="font-extrabold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Mock fallback data ─────────────────────────────────────────────────────────
const MOCK_CLASS_FREQ = {
  Baton: 3, Pliers: 1, Hammer: 2, Powerbank: 4, Scissors: 6,
  Wrench: 1, Gun: 2, Bullet: 5, Sprayer: 1, HandCuffs: 0, Knife: 7, Lighter: 3,
};
const MOCK_CONF_DIST = {
  "0.45-0.5": 3, "0.5-0.6": 7, "0.6-0.7": 12, "0.7-0.8": 18, "0.8-0.9": 9, "0.9-1.0": 4,
};
const MOCK_SERIES = Array.from({ length: 10 }, (_, i) => ({
  index: i + 1,
  name: `img_${String(i + 1).padStart(2, "0")}.jpg`,
  count: Math.floor(Math.random() * 4),
}));

export default function BatchAnalytics({ batchResult }) {
  const isMock = !batchResult;

  // ── Resolve data ────────────────────────────────────────────────────────────
  const totalImages     = batchResult?.total_images     ?? 10;
  const flaggedImages   = batchResult?.flagged_images   ?? 6;
  const cleanImages     = batchResult?.clean_images     ?? 4;
  const totalDetections = batchResult?.total_detections ?? 35;
  const avgConfidence   = batchResult?.avg_confidence   ?? 0.71;
  const classFreq       = batchResult?.class_frequency  ?? MOCK_CLASS_FREQ;
  const confDist        = batchResult?.conf_distribution ?? MOCK_CONF_DIST;
  const series          = batchResult?.detections_series ?? MOCK_SERIES;

  // ── Class frequency: always show ALL 12 classes ────────────────────────────
  const classBarData = CLASS_NAMES.map((name, idx) => ({
    label: name,
    count: classFreq[name] ?? 0,
    fill: CLASS_COLORS[idx],
  }));

  // Top detected class for badge
  const topClass = [...classBarData].sort((a, b) => b.count - a.count)[0];

  // ── Confidence buckets for histogram ──────────────────────────────────────
  const confBarData = Object.entries(confDist).map(([range, count]) => ({ range, count }));

  // ── Pie data ───────────────────────────────────────────────────────────────
  const threatShare = flaggedImages / Math.max(totalImages, 1);
  const pieData = [
    { name: "Needs Check", value: flaggedImages },
    { name: "Clear",       value: cleanImages   },
  ];

  return (
    <div className="w-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-800 p-2.5 rounded-xl shadow-sm">
            <Activity className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Batch Scan Summary
            </h2>
            <p className="text-sm font-medium text-zinc-400">
              Easy summary across all scanned bags
              {isMock && <span className="ml-2 text-amber-400 font-bold">(sample data)</span>}
            </p>
          </div>
        </div>
        {!isMock && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Live Results</span>
          </div>
        )}
      </motion.div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package}       label="Total Bags"    value={totalImages}  color="indigo" />
        <StatCard icon={AlertTriangle} label="Needs Check"   value={flaggedImages} color="red" pulse />
        <StatCard icon={CheckCircle}   label="Clear"         value={cleanImages}   color="green" />
        <StatCard
          icon={Percent}
          label="Scan Certainty"
          value={`${(avgConfidence * 100).toFixed(1)}%`}
          subtext={`${totalDetections} items found`}
          color="amber"
        />
      </div>

      {/* ── Row 1: Full Class Frequency (wide, horizontal bar chart) ────────── */}
      <motion.div variants={itemVariants} className="bg-zinc-900/80 backdrop-blur-md shadow-lg rounded-2xl border border-zinc-700 p-6 mb-5 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-5 border-b border-zinc-700 pb-3">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-rose-400" /> Items Found by Type
          </h3>
          <div className="flex items-center gap-2">
            {topClass?.count > 0 && (
              <span className="text-xs font-bold bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md border border-red-500/30 uppercase tracking-widest">
                Top: {topClass.label} ({topClass.count})
              </span>
            )}
            <span className="text-xs font-bold bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-md border border-rose-500/30 uppercase tracking-widest">
              {totalDetections} items found
            </span>
          </div>
        </div>
        {/* Horizontal bar chart — enough height for 12 rows */}
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classBarData}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 10, bottom: 4 }}
              barSize={18}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={{ stroke: "#52525b" }}
                allowDecimals={false}
                domain={[0, "dataMax + 1"]}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: "#d4d4d8", fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={82}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Items" radius={[0, 6, 6, 0]}>
                {classBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.count > 0 ? entry.fill : "#3f3f46"} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: "#e4e4e7" }}
                  formatter={(val) => val > 0 ? val : ""}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Row 2: Threat Distribution pie + Detections per Image line ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Flagged vs Clean */}
        <motion.div variants={itemVariants} className="bg-zinc-900/80 backdrop-blur-md shadow-lg rounded-2xl border border-zinc-700 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-5 border-b border-zinc-700 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400" /> Scan Status
            </h3>
            <span className="text-xs font-bold bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md border border-red-500/30 uppercase tracking-widest">
              {(threatShare * 100).toFixed(0)}% risk
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 h-[220px]">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3 flex-1 w-full">
              <div className="flex items-center gap-3 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/30">
                <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Suspicious</p>
                  <p className="text-2xl font-extrabold text-red-400 leading-tight">{flaggedImages}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/30">
                <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Clear</p>
                  <p className="text-2xl font-extrabold text-emerald-400 leading-tight">{cleanImages}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Detections per Image */}
        <motion.div variants={itemVariants} className="bg-zinc-900/80 backdrop-blur-md shadow-lg rounded-2xl border border-zinc-700 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-5 border-b border-zinc-700 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" /> Items Found Per Bag
            </h3>
            <span className="text-xs font-bold bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-md border border-rose-500/30 uppercase tracking-widest">
              {totalImages} bags
            </span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 20, left: 0, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={{ stroke: "#52525b" }}
                  label={{ value: "Bag #", position: "insideBottom", offset: -8, style: { fontSize: 10, fill: "#71717a" } }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={{ stroke: "#52525b" }}
                  allowDecimals={false}
                  domain={[0, "dataMax + 1"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Items"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#f43f5e", stroke: "#18181b", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#f43f5e", stroke: "#18181b", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: Confidence Distribution histogram ──────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-zinc-900/80 backdrop-blur-md shadow-lg rounded-2xl border border-zinc-700 p-6 mb-5 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-5 border-b border-zinc-700 pb-3">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" /> Certainty Breakdown
          </h3>
          <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/30 uppercase tracking-widest">
            minimum certainty: {batchResult?.thresholds?.conf ?? 0.45}
          </span>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confBarData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={{ stroke: "#52525b" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={{ stroke: "#52525b" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Items" radius={[6, 6, 0, 0]}>
                {confBarData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${280 + i * 15}, 85%, ${55 - i * 2}%)`} />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 11, fontWeight: 700, fill: "#e4e4e7" }}
                  formatter={(val) => val > 0 ? val : ""}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Per-Image Results Table ────────────────────────────────────────────── */}
      {!isMock && batchResult.per_image && batchResult.per_image.length > 0 && (
        <motion.div variants={itemVariants} className="bg-zinc-900/80 backdrop-blur-md shadow-lg rounded-2xl border border-zinc-700 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-6 py-4 border-b border-zinc-700 bg-zinc-800/50 flex items-center gap-2">
            <Hash className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-bold text-white tracking-tight">Bag-by-Bag Results</h3>
            <span className="ml-auto text-xs font-bold text-zinc-500">
              {batchResult.per_image.length} bags scanned
            </span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-zinc-800/80 border-b border-zinc-700 z-10">
                <tr>
                  <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider">Bag/Image</th>
                  <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider text-center w-28">Items</th>
                  <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider text-center w-28">Status</th>
                  <th className="px-4 py-3 font-bold text-zinc-400 uppercase tracking-wider">What Was Found</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {batchResult.per_image.map((img) => (
                  <tr
                    key={img.index}
                    className={`transition-colors hover:bg-zinc-800/50 border-t border-zinc-800 ${img.has_threat ? "bg-red-950/20" : "bg-zinc-900/40"}`}
                  >
                    <td className="px-4 py-3 font-bold text-zinc-500">{img.index + 1}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300 truncate max-w-[220px]" title={img.filename}>
                      {img.filename}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-extrabold text-sm ${img.total_detections > 0 ? "text-red-400" : "text-zinc-500"}`}>
                        {img.total_detections}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {img.has_threat ? (
                        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-500/30">
                          ⚠ Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                          ✓ Safe
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {img.detections.length > 0
                        ? [...new Set(img.detections.map(d => d.label))].join(", ")
                        : <span className="text-zinc-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
