import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ResultsDashboard from './ResultsDashboard';
import { 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Package, 
  Zap, 
  FileText,
  Boxes,
  Database,
  Layers,
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

export default function HistoryPage() {
  const [historyData, setHistoryData] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [selectedScanData, setSelectedScanData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [filterMode, setFilterMode] = useState('ALL');

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/history');
      if (res.data.history) {
        const data = res.data.history.map(item => {
          let Icon = Boxes;
          if (item.type.includes('Gun') || item.type.includes('Bullet')) Icon = Zap;
          else if (item.type.includes('Knife') || item.type.includes('Baton')) Icon = FlaskConical;
          else if (item.type !== 'None') Icon = FileText;
          return { ...item, icon: Icon };
        });
        setHistoryData(data);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDetail = async (id) => {
    setSelectedScanId(id);
    setIsLoadingDetail(true);
    setSelectedScanData(null);
    try {
      const res = await axios.get(`http://localhost:8000/api/history/${id}`);
      setSelectedScanData(res.data);
    } catch (e) {
      console.error('Failed to fetch scan detail:', e);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedScanId(null);
    setSelectedScanData(null);
  };

  const filteredData = historyData.filter(row => {
    if (filterMode === 'FLAGGED' && !['FLAGGED', 'MANUAL CHECK'].includes(row.status)) return false;
    if (filterMode === 'CLEARED' && row.status !== 'CLEARED') return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 h-full w-full max-w-6xl mx-auto animate-fade-in pr-2">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold text-gov-navy tracking-tighter mb-2">Scan History</h2>
          <p className="text-[0.65rem] font-bold text-text-dim uppercase tracking-[0.2em]">Archive of all sentinel-level cargo inspections.</p>
        </div>
      </div>

      {/* Filter Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Total Cleared', value: historyData.filter(d => d.risk < 35).length, trend: 'Safe scans', icon: CheckCircle },
           { label: 'High Risk Flags', value: historyData.filter(d => d.risk >= 60).length, trend: 'Requires priority review', icon: AlertTriangle, status: 'danger' },
           { label: 'Total Scans', value: historyData.length, trend: 'All recorded scans', icon: Database }
         ].map((stat, i) => {
           const Icon = stat.icon || Layers;
           return (
             <div key={i} className="glass-card p-6 flex items-center justify-between group">
                <div>
                   <span className="text-[0.55rem] font-black text-accent-cyan uppercase tracking-[0.3em] mb-4 block">{stat.label}</span>
                   <p className="text-3xl font-bold text-gov-navy mb-2">{stat.value}</p>
                   <p className={`text-[0.55rem] font-bold ${stat.status === 'danger' ? 'text-accent-red' : 'text-text-dim'} uppercase tracking-widest`}>{stat.trend}</p>
                </div>
                <div className="p-4 bg-[#EEF1F5] rounded-2xl text-gov-navy/20 group-hover:text-accent-cyan transition-colors">
                   <Icon size={32} />
                </div>
             </div>
           );
         })}
      </div>

      {/* Filter Sidebar Toggle */}
      <div className="flex justify-end">
         <button 
           onClick={() => setFilterMode(prev => prev === 'ALL' ? 'FLAGGED' : prev === 'FLAGGED' ? 'CLEARED' : 'ALL')}
           className={`px-6 py-2 border rounded font-black uppercase tracking-widest text-[0.65rem] transition-colors ${filterMode !== 'ALL' ? 'bg-accent-cyan/10 border-accent-cyan/20 text-accent-cyan' : 'bg-[#EEF1F5] border-[#D1D9E0] text-text-dim hover:text-gov-navy'}`}
         >
            Filter Mode: {filterMode}
         </button>
      </div>

      {/* History Table */}
      <div className="glass-card flex-1 min-h-[600px] flex flex-col overflow-hidden">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-sidebar border-b border-[#D1D9E0] z-20">
              <tr>
                <th className="p-4 py-3 text-[0.55rem] font-black text-text-dim uppercase tracking-[0.3em]">Scan ID</th>
                <th className="p-4 py-3 text-[0.55rem] font-black text-text-dim uppercase tracking-[0.3em]">Timestamp</th>
                <th className="p-4 py-3 text-[0.55rem] font-black text-text-dim uppercase tracking-[0.3em]">Cargo Type</th>
                <th className="p-4 py-3 text-[0.55rem] font-black text-text-dim uppercase tracking-[0.3em]">Risk Score</th>
                <th className="p-4 py-3 text-[0.55rem] font-black text-text-dim uppercase tracking-[0.3em]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row) => {
                const Icon = row.icon;
                return (
                  <tr key={row.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gov-navy uppercase tracking-widest">{row.id}</span>
                        <span className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest mt-1 opacity-60 italic">{row.node}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[0.65rem] font-bold text-text-dim uppercase tracking-widest leading-loose">
                      {row.timestamp}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 bg-${row.color}/10 rounded-lg text-${row.color}`}>
                            <Icon size={14} />
                         </div>
                         <span className="text-[0.7rem] font-bold text-gov-navy uppercase tracking-widest">{row.type}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <div className="flex-1 h-1.5 bg-[#EEF1F5] rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-${row.color} shadow-[0_0_8px_${row.color === 'accent-cyan' ? '#00f5ff' : row.color === 'accent-amber' ? '#ff9f0a' : '#ff3b3b'}]`} 
                            style={{ width: `${row.risk}%` }}
                          />
                        </div>
                        <span className={`text-[0.7rem] font-black text-${row.color}`}>{row.risk}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                       <span className={`text-[0.55rem] font-black uppercase px-2 py-1 rounded-sm border border-${row.color}/20 bg-${row.color}/10 text-${row.color} tracking-widest`}>
                          {row.status}
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-[#D1D9E0] flex items-center justify-between bg-sidebar/50">
           <span className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest">Showing 1-{Math.min(10, filteredData.length)} of {filteredData.length} results</span>
           <div className="flex items-center gap-1">
              <button className="p-2 bg-[#EEF1F5] rounded hover:bg-[#EEF1F5] text-gov-navy transition-all"><ChevronLeft size={16} /></button>
              <button className="p-2 bg-[#EEF1F5] rounded hover:bg-[#EEF1F5] text-gov-navy transition-all"><ChevronRight size={16} /></button>
           </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedScanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-obsidian border border-[#D1D9E0] w-full max-w-5xl h-[85vh] flex flex-col rounded-xl overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between p-6 border-b border-[#D1D9E0] bg-sidebar shrink-0">
              <div>
                <h3 className="text-xl font-black text-gov-navy uppercase tracking-widest italic">{selectedScanId}</h3>
                <p className="text-[0.65rem] font-bold text-accent-cyan uppercase tracking-[0.3em]">Historical Scan Record</p>
              </div>
              <button 
                onClick={closeModal}
                className="w-10 h-10 rounded-full bg-[#EEF1F5] hover:bg-[#EEF1F5] flex items-center justify-center text-text-dim hover:text-gov-navy transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 min-h-0 relative p-6 bg-obsidian overflow-hidden">
              {isLoadingDetail ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
                  <p className="text-[0.65rem] font-bold text-text-dim uppercase tracking-[0.3em] animate-pulse">Retrieving Scan Data...</p>
                </div>
              ) : selectedScanData ? (
                <div className="h-full overflow-y-auto">
                  <ResultsDashboard result={selectedScanData} analyzing={false} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <p className="text-sm font-bold text-accent-red uppercase tracking-widest">Error Loading Scan Record</p>
                  <p className="text-[0.65rem] text-text-dim uppercase tracking-[0.2em] max-w-xs text-center">Detailed image and reasoning data may not have been saved for this historical scan. Only new scans will store full visual payloads.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
