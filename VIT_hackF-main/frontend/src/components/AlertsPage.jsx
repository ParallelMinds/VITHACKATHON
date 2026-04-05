import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ResultsDashboard from './ResultsDashboard';
import { 
  ShieldAlert, 
  Terminal, 
  CheckCircle,
  BarChart,
  X,
  Trash2,
  AlertTriangle,
  ShieldOff,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AlertsPage() {
  const { role } = useAuth();
  const [alertsData, setAlertsData] = useState([]);
  const [rawHistoryData, setRawHistoryData] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  const [removedMisIds, setRemovedMisIds] = useState(new Set());

  const [selectedScanId, setSelectedScanId] = useState(null);
  const [selectedScanData, setSelectedScanData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [showProtocolsModal, setShowProtocolsModal] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/history');
      if (res.data.history) {
        setRawHistoryData(res.data.history);
        const riskyData = res.data.history.filter(item => item.risk >= 35);
        const mapped = riskyData.map(item => {
          const isCritical = item.risk >= 80;
          return {
            id: item.id,
            type: isCritical ? 'CRITICAL SECURITY BREACH' : 'MIS-DECLARATION DETECTED',
            time: item.timestamp,
            location: 'Scanner XRAY_NODE_1',
            description: isCritical 
              ? `Automated assessment calculated CRITICAL risk score at ${item.risk}%. Immediate attention required for identified items: ${item.type}.`
              : `Potential mis-declaration detected with risk score at ${item.risk}%. Cargo scan identified items: ${item.type}. Verify against manifesto.`,
            status: isCritical ? 'CRITICAL' : 'WARNING',
            color: item.color,
            risk: item.risk,
            cargoType: item.type,
            value: item.value,
          };
        });
        setAlertsData(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
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
      const row = rawHistoryData.find(item => item.id === id);
      if (row) {
        setSelectedScanData({
          id: row.id,
          risk_summary: `Risk Score : ${row.risk}\nLegacy Archive Record.`,
          reasoning: `Legacy Archive. Full neural telemetry missing from disk. Detected item: ${row.type}. Status: ${row.status}.`,
          detected_image: null,
          heatmap_image: null,
        });
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedScanId(null);
    setSelectedScanData(null);
  };

  const handleDismiss = (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const handleAcknowledge = (id) => {
    setAcknowledgedIds(prev => new Set([...prev, id]));
  };

  const handleRemoveMisDeclaration = (id) => {
    setRemovedMisIds(prev => new Set([...prev, id]));
    // Also dismiss from main alerts list
    setDismissedIds(prev => new Set([...prev, id]));
    setConfirmRemoveId(null);
  };

  const activeAlerts = alertsData.filter(a => !dismissedIds.has(a.id));

  // MIS-DECLARATION DETECTED with risk > 50%, not yet removed
  const misDeclarationAlerts = alertsData.filter(
    a => a.type === 'MIS-DECLARATION DETECTED' && a.risk > 50 && !removedMisIds.has(a.id)
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full animate-fade-in">
      <div className="xl:col-span-8 flex flex-col gap-6">
        <div className="mb-2">
          <h2 className="text-3xl font-bold text-gov-navy tracking-tighter mb-2">Real-Time Alerts</h2>
          <p className="text-[0.65rem] font-bold text-text-dim uppercase tracking-[0.2em]">Live tactical monitoring of scanning protocols and security events.</p>
        </div>

        <div className="flex flex-col gap-4">
          {activeAlerts.length === 0 ? (
             <div className="glass-card p-12 flex flex-col items-center justify-center text-center opacity-60">
                <CheckCircle size={48} className="text-accent-cyan mb-4" />
                <h3 className="text-xl font-bold text-gov-navy uppercase tracking-widest italic">All Clear</h3>
                <p className="text-[0.65rem] font-bold text-text-dim uppercase tracking-[0.2em] mt-2">No active alerts requiring manual intervention.</p>
             </div>
          ) : activeAlerts.map((alert) => {
            const isAck = acknowledgedIds.has(alert.id);
            return (
            <div key={alert.id} className={`glass-card p-6 border-l-4 transition-all duration-300 ${isAck ? 'opacity-40 border-l-white/10' : `border-l-${alert.color}`}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 bg-${alert.color}/10 rounded-lg text-${alert.color}`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${isAck ? 'text-text-dim' : `text-${alert.color}`}`}>{alert.type}</h3>
                    <p className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest mt-0.5">
                      Alert Ref: {alert.id}
                      {isAck && <span className="ml-2 text-accent-cyan tracking-[0.3em]">✓ ACKNOWLEDGED</span>}
                    </p>
                  </div>
                </div>
                <span className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest">{alert.time}</span>
              </div>
              <p className="text-sm text-gov-navy/80 leading-relaxed mb-6">
                {alert.description} {alert.location && <span className={`text-${alert.color} font-bold tracking-tight`}>{alert.location}</span>}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleOpenDetail(alert.id)}
                  className={`px-6 py-2 bg-${alert.color}/20 text-${alert.color} border border-${alert.color}/30 rounded font-black uppercase tracking-widest text-[0.65rem] hover:bg-${alert.color} hover:text-white transition-all`}
                >
                  Investigate
                </button>
                {role !== 'auditor' && (
                  <>
                    {!isAck && (
                      <button 
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-6 py-2 bg-[#EEF1F5] text-text-dim border border-[#D1D9E0] rounded font-black uppercase tracking-widest text-[0.65rem] hover:text-gov-navy transition-all"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button 
                      onClick={() => handleDismiss(alert.id)}
                      className="px-6 py-2 text-text-dim font-black uppercase tracking-widest text-[0.65rem] hover:text-gov-navy ml-auto transition-colors"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>

      <div className="xl:col-span-4 flex flex-col gap-8">
        {/* Alert Summary Module */}
        <div className="glass-card p-6">
           <div className="flex items-center gap-3 mb-8">
              <BarChart size={18} className="text-accent-cyan" />
              <h4 className="text-[0.65rem] font-black text-gov-navy uppercase tracking-[0.3em]">Alert Summary</h4>
           </div>
            <div className="flex flex-col gap-8">
              {[
                { label: 'Critical', value: activeAlerts.filter(a => a.status === 'CRITICAL').length, trend: 'LIVE TASKS', color: 'accent-red' },
                { label: 'Warning', value: activeAlerts.filter(a => a.status === 'WARNING').length, trend: 'LIVE TASKS', color: 'accent-amber' },
                { label: 'System', value: '00', trend: 'STABLE', color: 'accent-cyan' }
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between group">
                   <div className="flex items-center gap-3">
                      <div className={`w-1 h-10 bg-${stat.color} rounded-full`} />
                      <div>
                        <p className="text-[0.55rem] font-bold text-text-dim uppercase tracking-widest">{stat.label}</p>
                        <p className="text-3xl font-black text-gov-navy">{stat.value}</p>
                      </div>
                   </div>
                   <span className={`text-[0.55rem] font-black uppercase px-2 py-1 rounded bg-${stat.color}/10 text-${stat.color}`}>{stat.trend}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Standard Protocol Module */}
        <div className="glass-card p-8 bg-accent-cyan/10 border-accent-cyan/30 text-center flex flex-col items-center">
            <CheckCircle size={32} className="text-accent-cyan mb-4" />
            <h4 className="text-base font-black text-gov-navy uppercase tracking-tight mb-2">Standard Protocol Active</h4>
            <p className="text-[0.7rem] text-accent-cyan/80 font-medium leading-relaxed mb-6">Level 2 scanning operational across all portals. Current throughput: 840 units/hr.</p>
            {role !== 'auditor' && (
              <button
                onClick={() => setShowProtocolsModal(true)}
                className="w-full py-3 bg-accent-cyan text-black rounded font-black uppercase tracking-widest text-[0.7rem] hover:bg-white transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <Settings size={14} /> Manage Protocols
              </button>
            )}
        </div>

        {/* Operator Module */}
        <div className="glass-card p-6 flex items-center gap-4">
           <div className="w-12 h-12 rounded bg-accent-cyan/20 flex items-center justify-center text-accent-cyan">
              <Terminal size={24} />
           </div>
           <div>
              <p className="text-sm font-black text-gov-navy tracking-widest uppercase">Senior Analyst 8829</p>
              <p className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest">Shift: 02:14:10 Remaining</p>
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
                <p className="text-[0.65rem] font-bold text-accent-cyan uppercase tracking-[0.3em]">Incident Escalation Record</p>
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
                  <p className="text-[0.65rem] font-bold text-text-dim uppercase tracking-[0.3em] animate-pulse">Retrieving Alert Payload...</p>
                </div>
              ) : selectedScanData ? (
                <div className="h-full overflow-y-auto">
                  <ResultsDashboard result={selectedScanData} analyzing={false} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <p className="text-sm font-bold text-accent-red uppercase tracking-widest">Error Loading Payload</p>
                  <p className="text-[0.65rem] text-text-dim uppercase tracking-[0.2em] max-w-xs text-center">Detailed image and reasoning data may not have been saved for this legacy alert ID, and core telemetry fallback failed.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Protocols Modal */}
      {showProtocolsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-obsidian border border-[#D1D9E0] w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#D1D9E0] bg-sidebar shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-amber/10 rounded-lg">
                  <ShieldOff size={20} className="text-accent-amber" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gov-navy uppercase tracking-widest">Mis-Declaration Review</h3>
                  <p className="text-[0.6rem] font-bold text-accent-amber uppercase tracking-[0.3em]">
                    Flagged items with risk score &gt; 50% — remove genuine declarations below
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowProtocolsModal(false); setConfirmRemoveId(null); }}
                className="w-10 h-10 rounded-full bg-[#EEF1F5] hover:bg-[#EEF1F5] flex items-center justify-center text-text-dim hover:text-gov-navy transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-6 px-6 py-3 bg-[#EEF1F5] border-b border-[#D1D9E0] shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-accent-amber" />
                <span className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest">
                  Total Flagged: <span className="text-gov-navy">{misDeclarationAlerts.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 size={12} className="text-accent-red" />
                <span className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest">
                  Cleared: <span className="text-gov-navy">{removedMisIds.size}</span>
                </span>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {misDeclarationAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-60">
                  <CheckCircle size={48} className="text-accent-cyan mb-4" />
                  <h4 className="text-base font-black text-gov-navy uppercase tracking-widest">No Active Mis-Declarations</h4>
                  <p className="text-[0.65rem] font-bold text-text-dim uppercase tracking-[0.2em] mt-2">
                    All mis-declaration records above 50% risk have been cleared.
                  </p>
                </div>
              ) : (
                misDeclarationAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border border-[#D1D9E0] rounded-lg p-5 bg-[#EEF1F5] hover:bg-[#EEF1F5] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-1.5 bg-accent-amber/10 rounded-md shrink-0 mt-0.5">
                          <AlertTriangle size={14} className="text-accent-amber" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <span className="text-[0.6rem] font-black text-accent-amber uppercase tracking-widest">
                              MIS-DECLARATION DETECTED
                            </span>
                            <span
                              className={`text-[0.55rem] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                alert.risk >= 80
                                  ? 'bg-accent-red/20 text-accent-red'
                                  : 'bg-accent-amber/20 text-accent-amber'
                              }`}
                            >
                              Risk: {alert.risk}%
                            </span>
                          </div>
                          <p className="text-[0.6rem] font-bold text-text-dim uppercase tracking-widest mb-2">
                            Ref: {alert.id} &nbsp;·&nbsp; {alert.time}
                          </p>
                          <p className="text-xs text-gov-navy/70 leading-relaxed">
                            Cargo type: <span className="text-gov-navy font-semibold">{alert.cargoType}</span> &nbsp;|&nbsp;
                            Declared: <span className="text-gov-navy font-semibold">{alert.value}</span> &nbsp;|&nbsp;
                            Scanner: <span className="text-accent-cyan font-semibold">{alert.location}</span>
                          </p>
                        </div>
                      </div>

                      {/* Remove / Confirm area */}
                      <div className="shrink-0">
                        {confirmRemoveId === alert.id ? (
                          <div className="flex flex-col items-end gap-2">
                            <p className="text-[0.55rem] font-bold text-accent-amber uppercase tracking-widest text-right">
                              Confirm removal?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="px-3 py-1.5 text-[0.55rem] font-black uppercase tracking-widest text-text-dim bg-[#EEF1F5] rounded border border-[#D1D9E0] hover:text-gov-navy transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleRemoveMisDeclaration(alert.id)}
                                className="px-3 py-1.5 text-[0.55rem] font-black uppercase tracking-widest text-white bg-accent-red/80 rounded border border-accent-red/50 hover:bg-accent-red transition-all"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemoveId(alert.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.55rem] font-black uppercase tracking-widest text-accent-red bg-accent-red/10 border border-accent-red/20 rounded hover:bg-accent-red/20 transition-all"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
