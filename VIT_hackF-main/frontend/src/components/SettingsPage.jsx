import React from 'react';
import { 
  Settings2, 
  Cpu, 
  ShieldCheck, 
  Database, 
  Zap, 
  Terminal, 
  Activity,
  Layers,
  FlaskConical,
  Gauge,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 h-full animate-fade-in pr-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gov-navy tracking-tight mb-1">Configuration Console</h2>
          <p className="text-[0.65rem] font-medium text-text-dim uppercase tracking-[0.18em]">System parameter adjustment and hardware diagnostic interface.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
         {/* System Configuration Column */}
         <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="glass-card p-8">
               <div className="flex items-center gap-3 pb-5 mb-8 border-b border-[#EEF1F5]">
                  <Settings2 size={18} className="text-gov-accent" />
                  <h4 className="text-[0.7rem] font-semibold text-gov-navy uppercase tracking-[0.25em]">System Parameters</h4>
               </div>

               <div className="flex flex-col gap-10">
                  <div className="flex items-center justify-between py-4 border-b border-[#EEF1F5]">
                     <div>
                        <h5 className="text-sm font-semibold text-gov-navy mb-1.5 tracking-tight">Automatic Flagging</h5>
                        <p className="text-[0.6rem] font-medium text-text-dim uppercase tracking-widest">Automatically isolate cargo matching high-risk heuristics.</p>
                     </div>
                     <div className="w-11 h-6 bg-gov-accent rounded-full p-1 relative cursor-pointer flex-shrink-0">
                        <div className="w-4 h-4 bg-white rounded-full absolute right-1 shadow-sm" />
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 py-4 border-b border-[#EEF1F5]">
                     <div className="flex justify-between items-end">
                        <div>
                           <h5 className="text-sm font-semibold text-gov-navy mb-1.5 tracking-tight">Server Sync Interval</h5>
                           <p className="text-[0.6rem] font-medium text-text-dim uppercase tracking-widest">Frequency of global telemetry baseline updates.</p>
                        </div>
                        <span className="text-[0.6rem] font-semibold text-gov-accent uppercase tracking-widest flex-shrink-0 ml-4">15 SEC</span>
                     </div>
                     <div className="w-full bg-[#F4F6F8] border border-[#D1D9E0] rounded p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#EEF1F5] transition-colors">
                        <span className="text-[0.7rem] font-semibold text-gov-navy uppercase tracking-widest">15 Seconds</span>
                        <Settings2 size={14} className="text-text-dim" />
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-2">
                     <div className="flex justify-between items-end">
                        <div>
                           <h5 className="text-sm font-semibold text-gov-navy mb-1.5 tracking-tight">Log Retention Period</h5>
                           <p className="text-[0.6rem] font-medium text-text-dim uppercase tracking-widest">Archive longevity for sentinel-level audit trails.</p>
                        </div>
                        <span className="text-[0.6rem] font-semibold text-gov-accent uppercase tracking-widest flex-shrink-0 ml-4">90 DAYS</span>
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                        {['30 Days', '90 Days', '1 Year'].map((p) => (
                           <button 
                             key={p} 
                             className={`py-2.5 rounded text-[0.65rem] font-semibold uppercase tracking-widest transition-all border ${p === '90 Days' ? 'bg-gov-accent text-white border-gov-accent' : 'bg-[#F4F6F8] border-[#D1D9E0] text-text-dim hover:text-gov-navy hover:border-gov-navy/30'}`}
                           >
                              {p}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="glass-card p-8">
               <div className="flex items-center gap-3 pb-5 mb-8 border-b border-[#EEF1F5]">
                  <Cpu size={18} className="text-accent-amber" />
                  <h4 className="text-[0.7rem] font-semibold text-gov-navy uppercase tracking-[0.25em]">AI Thresholds</h4>
               </div>

               <div className="flex flex-col gap-10">
                  {[
                    { label: 'Suspicious Item Detection', description: 'Sensitivity for flagging non-standard densities.', value: '74%' },
                    { label: 'Prohibited Material Detection', description: 'Critical threshold for organic/inorganic separation.', value: '92%' }
                  ].map((p, i) => (
                    <div key={i} className="flex flex-col gap-4">
                       <div className="flex justify-between items-center text-[0.65rem] font-semibold uppercase tracking-widest">
                          <span className="text-gov-navy">{p.label}</span>
                          <span className="text-accent-amber">{p.value}</span>
                       </div>
                       <div className="relative h-2 bg-[#EEF1F5] rounded-full border border-[#D1D9E0]">
                          <div className="h-full bg-accent-amber rounded-full" style={{ width: p.value }} />
                          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-accent-amber rounded-sm shadow-sm" style={{ left: p.value }} />
                       </div>
                       <p className="text-[0.6rem] font-medium text-text-dim uppercase tracking-widest">{p.description}</p>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Hardware Diagnostics Column */}
         <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="glass-card p-6">
               <h4 className="text-[0.65rem] font-semibold text-gov-navy uppercase tracking-[0.25em] pb-4 mb-6 border-b border-[#EEF1F5]">Hardware Status</h4>
               <div className="flex flex-col gap-7">
                  {[
                    { label: 'X-RAY ARRAY ALPHA', status: 'NOMINAL', value: 98, color: 'gov-green', hex: '#2E7D32' },
                    { label: 'MASS SPECTROMETER', status: 'CALIBRATION REQ.', value: 62, color: 'accent-amber', hex: '#F9A825' }
                  ].map((h, i) => (
                    <div key={i} className="flex flex-col gap-3">
                       <div className="flex justify-between items-center">
                          <span className="text-[0.55rem] font-semibold text-text-dim uppercase tracking-[0.2em]">{h.label}</span>
                          <span className={`text-[0.55rem] font-semibold uppercase px-2 py-0.5 rounded border bg-${h.color}/10 text-${h.color} border-${h.color}/25`}>{h.status}</span>
                       </div>
                       <div className="h-1.5 bg-[#EEF1F5] rounded-full overflow-hidden border border-[#D1D9E0]">
                          <div className="h-full rounded-full" style={{ width: `${h.value}%`, backgroundColor: h.hex }} />
                       </div>
                    </div>
                  ))}
               </div>
               <div className="mt-8 pt-6 border-t border-[#EEF1F5]">
                  <div className="flex flex-col gap-2.5 mb-6">
                     <div className="flex justify-between text-[0.55rem] font-medium uppercase tracking-widest text-text-dim">
                        <span>Last Calibration:</span>
                        <span className="text-gov-navy font-semibold">2024-05-12 08:00</span>
                     </div>
                     <div className="flex justify-between text-[0.55rem] font-medium uppercase tracking-widest text-text-dim">
                        <span>Firmware Ver:</span>
                        <span className="text-gov-navy font-semibold">v4.8.2-SENTINEL</span>
                     </div>
                  </div>
                  <button className="w-full py-2.5 bg-[#F4F6F8] border border-[#D1D9E0] rounded text-[0.65rem] font-semibold uppercase tracking-widest text-text-dim hover:text-gov-navy hover:border-gov-navy/30 hover:bg-[#EEF1F5] transition-all">
                     Run Diagnostics
                  </button>
               </div>
            </div>

            <div className="glass-card p-5 flex items-center gap-4 border-l-4 border-l-gov-accent">
               <div className="w-10 h-10 rounded bg-gov-accent/10 flex items-center justify-center text-gov-accent flex-shrink-0">
                  <Lock size={18} />
               </div>
               <div>
                  <p className="text-[0.6rem] font-semibold text-text-dim uppercase tracking-widest mb-0.5">Session Operator</p>
                  <p className="text-xs font-semibold text-gov-navy tracking-widest uppercase">Senior Analyst Meet Rao</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
