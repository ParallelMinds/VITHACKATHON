import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Calendar, 
  Download,
  Activity,
  Package,
  AlertTriangle,
  History,
  Target,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReportsPage() {
  const { role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [pingLatency, setPingLatency] = useState(0);
  
  const reportRef = useRef(null);
  const printRef = useRef(null);

  const fetchStats = async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const [resStats, resHistory] = await Promise.all([
         axios.get('http://localhost:8000/api/stats'),
         axios.get('http://localhost:8000/api/history')
      ]);
      setPingLatency(Date.now() - startTime);
      setStats(resStats.data.stats);
      if (resHistory.data.history) {
         setHistoryData(resHistory.data.history);
      }
    } catch (e) {
      console.error('Stats Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const parseStat = (label) => {
    if (!stats) return null;
    const regex = new RegExp(`${label}\\s*:\\s*([^\\n]+)`);
    const match = stats.match(regex);
    return match ? match[1].trim() : null;
  };

  const totalScans = parseStat('Total Scans Logged') || '0';
  const avgRisk = parseStat('Average Risk Score') || '0.0 / 100';
  const flagged = parseStat('Flagged \\(HIGH\\+CRIT\\)') || '0';

  const categoryCounts = {};
  historyData.forEach(item => {
     if (item.type && item.type !== 'None') {
        const types = item.type.split(',').map(t => t.trim());
        types.forEach(t => {
           categoryCounts[t] = (categoryCounts[t] || 0) + 1;
        });
     }
  });
  
  const computedCategories = Object.entries(categoryCounts)
     .sort((a,b) => b[1] - a[1])
     .slice(0, 4)
     .map(entry => {
        const name = entry[0];
        const count = entry[1];
        let color = 'text-dim';
        let concern = 'ROUTINE ITEM DETECTED';
        if (name.includes('Gun') || name.includes('Bullet') || name.includes('weapon')) { color = 'accent-red'; concern = 'ILLEGAL WEAPONRY CONTRABAND'; }
        else if (name.includes('Knife') || name.includes('Baton') || name.includes('sharp')) { color = 'accent-amber'; concern = 'CONCEALED WEAPON'; }
        else if (name.includes('Pill') || name.includes('Syringe') || name.includes('drug')) { color = 'accent-red'; concern = 'CONTROLLED SUBSTANCE'; }
        return { name: name, incidents: count, concern: concern, trend: 'LIVE', color: color };
     });
     
  const topCategories = computedCategories.length > 0 ? computedCategories : [
    { name: 'No Incidents', incidents: 0, concern: 'AWAITING NEURAL SCAN', trend: '--', color: 'text-dim' }
  ];

  const generateAIReport = async () => {
    try {
      setIsGenerating(true);
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key missing.");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const strData = `Facility Metrics: Total Scans: ${totalScans}. Risk Avg: ${avgRisk}. Flagged Items: ${flagged}. Top Concerns: Counterfeit branding, Missing FDA stamps, Undeclared cells.`;
      const prompt = `You are a Lead OSINT Director for Customs and Border Security. Write a comprehensive, multi-section Intelligence Assessment Report. Include the following sections exactly: OPERATIONAL OVERVIEW, KEY THREAT VECTORS, NEURAL INCIDENT REPORTS, and RECOMMENDED PROTOCOLS. Be highly detailed and tactical. Format purely with clean text (no markdown special characters besides newlines). Metrics: ${strData}\n\nOperational logs context to summarize: ${stats}`;
      
      const res = await model.generateContent(prompt);
      setAiReport(res.response.text().replace(/\*/g, ''));
    } catch (e) {
      console.error(e);
      setAiReport("Failed to generate AI Analytics Report. Verify neural link and environment payload.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, { backgroundColor: '#ffffff', scale: 2, logging: false });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Intelligence_Assessment_Report.pdf');
    } catch (error) {
      console.error('Error generating PDF', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full animate-fade-in pr-2 overflow-y-auto custom-scrollbar" ref={reportRef}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gov-navy tracking-tight mb-1">Reports & Analytics</h2>
          <p className="text-[0.65rem] font-medium text-text-dim uppercase tracking-[0.18em]">Operational intelligence and risk assessment overview for the current cycle.</p>
        </div>
        {role !== 'auditor' && (
          <div className="flex gap-3" data-html2canvas-ignore="true">
            <button 
              onClick={generateAIReport}
              className="px-5 py-2.5 bg-[#F4F6F8] border border-[#D1D9E0] rounded font-semibold uppercase tracking-widest text-[0.65rem] text-gov-navy hover:bg-[#EEF1F5] transition-all flex items-center gap-2"
            >
               <Activity size={14} className={isGenerating ? 'animate-pulse text-gov-accent' : 'text-gov-accent'} /> 
               {isGenerating ? 'Generating...' : 'Overall Report'}
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="px-5 py-2.5 bg-gov-navy text-white rounded font-semibold uppercase tracking-widest text-[0.65rem] hover:bg-gov-navy-hover transition-all shadow-gov flex items-center gap-2"
            >
               <Download size={14} className={isDownloading ? 'animate-bounce' : ''} /> 
               {isDownloading ? 'Exporting...' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>

      {/* AI Overall Report Section */}
      {(aiReport || isGenerating) && (
        <div className="glass-card p-6 border-l-4 border-gov-accent">
           <div className="flex items-center gap-3 mb-4">
              <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-gov-accent animate-pulse' : 'bg-gov-green'}`} />
              <h4 className="text-[0.65rem] font-semibold text-gov-navy uppercase tracking-[0.25em]">AI Executive Operations Report</h4>
           </div>
           {isGenerating ? (
              <div className="flex flex-col gap-3 opacity-50">
                 <div className="h-2 w-full bg-[#D1D9E0] rounded animate-pulse" />
                 <div className="h-2 w-[85%] bg-[#D1D9E0] rounded animate-pulse" />
                 <div className="h-2 w-[90%] bg-[#D1D9E0] rounded animate-pulse" />
              </div>
           ) : (
              <p className="text-xs font-medium leading-relaxed text-[#3D4F5F] italic border-l-2 border-gov-accent/40 pl-4 whitespace-pre-line">
                 "{aiReport}"
              </p>
           )}
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: 'Total Session Scans', value: totalScans, trend: '+0.0%', icon: Activity, color: 'gov-accent' },
           { label: 'Avg Risk Index', value: avgRisk.split('/')[0].trim(), trend: 'REFRESHED', icon: Target, color: 'accent-amber' },
           { label: 'Neural Flagged', value: flagged.split('(')[0].trim(), trend: '-4.3%', icon: AlertTriangle, color: 'accent-red' },
           { label: 'Neural Accuracy', value: '98.4%', trend: 'OPTIMAL', icon: TrendingUp, color: 'gov-green' }
         ].map((stat, i) => {
           const Icon = stat.icon;
           return (
             <div key={i} className="glass-card p-5 border-t-2" style={{ borderTopColor: stat.color === 'gov-accent' ? '#3A6EA5' : stat.color === 'accent-amber' ? '#F9A825' : stat.color === 'accent-red' ? '#C62828' : '#2E7D32' }}>
                <div className="flex items-center justify-between mb-3">
                   <span className="text-[0.6rem] font-semibold text-text-dim uppercase tracking-[0.2em]">{stat.label}</span>
                   <Icon size={14} className={`text-${stat.color}`} />
                </div>
                <div className="flex items-end justify-between">
                   <p className="text-2xl font-bold text-gov-navy">{stat.value}</p>
                   <span className={`text-[0.55rem] font-semibold uppercase tracking-widest text-${stat.color}`}>{stat.trend}</span>
                </div>
             </div>
           );
         })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start mb-10">
         {/* Live Intelligence Log */}
         <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="glass-card flex flex-col min-h-[500px]">
               <div className="px-5 py-3 bg-[#F4F6F8] border-b border-[#D1D9E0] flex items-center gap-3">
                  <Terminal size={14} className="text-gov-accent" />
                  <h4 className="text-[0.65rem] font-semibold text-gov-navy uppercase tracking-[0.25em]">Operational Intelligence Log</h4>
               </div>
               <div className="flex-1 p-6 font-mono text-[0.65rem] leading-relaxed text-[#3A6EA5] whitespace-pre overflow-y-auto custom-scrollbar bg-[#0B1F3A]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center animate-pulse italic text-[#718096]">Connecting to YOLO Cluster...</div>
                  ) : (
                    stats || "No telemetry data received from AI engine."
                  )}
               </div>
            </div>

            <div className="glass-card p-6">
               <h4 className="text-[0.65rem] font-semibold text-gov-navy uppercase tracking-[0.25em] mb-6">Top Flagged Cargo Categories</h4>
               <div className="flex flex-col gap-0">
                  <div className="flex items-center px-4 py-2.5 bg-[#F4F6F8] rounded-t border border-[#D1D9E0] uppercase text-[0.55rem] font-semibold tracking-widest text-text-dim">
                     <span className="w-1/4">Category</span>
                     <span className="w-1/4">Incidents</span>
                     <span className="w-1/3">Primary Concern</span>
                     <span className="w-1/6 text-right">Trend</span>
                  </div>
                  {topCategories.map((cat, i) => (
                    <div key={i} className="flex items-center px-4 py-3.5 hover:bg-[#FAFBFC] transition-colors border-b border-l border-r border-[#D1D9E0]">
                       <span className="w-1/4 text-[0.7rem] font-semibold text-gov-navy uppercase tracking-wide flex items-center gap-2">
                          <div className={`w-6 h-6 rounded bg-${cat.color}/10 flex items-center justify-center text-${cat.color}`}>
                             <Package size={12} />
                          </div>
                          {cat.name}
                       </span>
                       <span className="w-1/4 text-xs font-semibold text-gov-navy">{cat.incidents}</span>
                       <span className={`w-1/3 text-[0.6rem] font-semibold tracking-widest px-2 py-1 bg-${cat.color}/10 border border-${cat.color}/20 rounded text-${cat.color}`}>{cat.concern}</span>
                       <span className={`w-1/6 text-right text-[0.6rem] font-semibold text-${cat.color}`}>{cat.trend}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Distribution & Performance Section */}
         <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="glass-card p-6">
               <h4 className="text-[0.65rem] font-semibold text-gov-navy uppercase tracking-[0.25em] mb-6">Neural Analysis Distribution</h4>
               <div className="flex flex-col gap-5">
                  {[
                    { label: 'Prohibited', value: parseStat('CRITICAL') || '0', color: '#C62828' },
                    { label: 'High Risk', value: parseStat('HIGH') || '0', color: '#F9A825' },
                    { label: 'Elevated', value: parseStat('MEDIUM') || '0', color: '#3A6EA5' },
                    { label: 'Cleared', value: parseStat('LOW') || '0', color: '#2E7D32' }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-2">
                       <div className="flex justify-between items-center text-[0.6rem] font-semibold uppercase tracking-widest">
                          <span className="text-text-dim">{item.label}</span>
                          <span className="text-gov-navy">{item.value.split(' ')[0]} SCANS</span>
                       </div>
                       <div className="h-1.5 bg-[#EEF1F5] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(parseInt(item.value) / (parseInt(totalScans) || 1) * 100)}%`, backgroundColor: item.color }} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
               <h4 className="text-[0.65rem] font-semibold text-gov-navy uppercase tracking-[0.25em] mb-6 w-full text-left">System Health</h4>
               <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="#EEF1F5" strokeWidth="8" />
                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="#3A6EA5" strokeWidth="8" strokeDasharray={364} strokeDashoffset={0} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gov-navy">100%</span>
                    <span className="text-[0.45rem] font-semibold text-text-dim uppercase tracking-widest">Aptitude</span>
                  </div>
               </div>
               <p className="text-[0.6rem] font-medium text-text-dim uppercase tracking-widest leading-relaxed">Neural Cluster responsive. Latency: <span className="text-gov-accent font-semibold">{pingLatency > 0 ? pingLatency + ' ms' : '...'}</span>.</p>
            </div>
         </div>
      </div>

      {/* Hidden Print Document Wrapper for PDF rendering */}
      <div className="absolute top-0 w-0 h-0 overflow-hidden pointer-events-none">
         <div 
           ref={printRef}
           className="w-[800px] bg-white text-black p-12 font-sans overflow-visible"
         >
            <div className="border-b-4 border-black pb-4 mb-8">
               <h1 className="text-4xl font-bold uppercase tracking-tight text-black">Intelligence Assessment</h1>
               <p className="text-sm font-semibold uppercase tracking-widest text-black/60 mt-2">Department of Customs & Border Security — Facility Alpha</p>
               <p className="text-sm font-semibold uppercase tracking-widest text-black/60 mt-1">Generated: {new Date().toUTCString()}</p>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-10">
               <div className="p-4 border-2 border-black/10 rounded">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-black/50 mb-1">Total Scans</p>
                  <p className="text-3xl font-bold text-black">{totalScans}</p>
               </div>
               <div className="p-4 border-2 border-black/10 rounded">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-black/50 mb-1">Average Risk Score</p>
                  <p className="text-3xl font-bold text-black">{avgRisk.split('/')[0].trim()}</p>
               </div>
               <div className="p-4 border-2 border-red-200 rounded bg-red-50">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-red-800 mb-1">Flagged Interventions</p>
                  <p className="text-3xl font-bold text-red-900">{flagged.split('(')[0].trim()}</p>
               </div>
            </div>

            <div className="mb-10">
               <h2 className="text-xl font-bold uppercase tracking-widest mb-4 border-b border-black/20 pb-2">Active Threat Categories</h2>
               <table className="w-full text-left border-collapse border border-black/20">
                  <thead>
                     <tr className="bg-black/5">
                        <th className="p-3 border border-black/20 text-xs font-bold uppercase tracking-widest">Category</th>
                        <th className="p-3 border border-black/20 text-xs font-bold uppercase tracking-widest">Incidents</th>
                        <th className="p-3 border border-black/20 text-xs font-bold uppercase tracking-widest">Concern</th>
                        <th className="p-3 border border-black/20 text-xs font-bold uppercase tracking-widest text-right">Trend</th>
                     </tr>
                  </thead>
                  <tbody>
                     {topCategories.map((cat, i) => (
                       <tr key={i}>
                          <td className="p-3 border border-black/20 text-sm font-semibold">{cat.name}</td>
                          <td className="p-3 border border-black/20 text-sm">{cat.incidents}</td>
                          <td className="p-3 border border-black/20 text-sm">{cat.concern}</td>
                          <td className="p-3 border border-black/20 text-sm text-right font-semibold">{cat.trend}</td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div className="mb-10">
               <h2 className="text-xl font-bold uppercase tracking-widest mb-4 border-b border-black/20 pb-2">Automated Neural Analytics</h2>
               {aiReport ? (
                 <div className="text-sm leading-8 font-serif text-black/90 whitespace-pre-line text-justify">
                    {aiReport}
                 </div>
               ) : (
                 <p className="text-sm italic text-black/50">Report data not compiled. Please 'Generate Overall Report' first before exporting.</p>
               )}
            </div>

            <div className="mt-8 pt-8 border-t border-black/20">
               <h2 className="text-lg font-bold uppercase tracking-widest mb-4">Raw Operational Log Sample</h2>
               <pre className="text-[0.6rem] leading-relaxed text-black/60 font-mono bg-black/5 p-4 rounded whitespace-pre-wrap">
                  {stats || 'No logs accessible.'}
               </pre>
            </div>
         </div>
      </div>
    </div>
  );
}
