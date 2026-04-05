import React, { useState, useEffect } from 'react';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { currentUser, role, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <header className="h-[64px] bg-white border-b border-[#D1D9E0] flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.55rem] font-semibold text-[#718096] uppercase tracking-[0.2em]">Scanner Online</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gov-navy tracking-widest uppercase">ID: 8829-X</span>
            <div className="w-1.5 h-1.5 rounded-full bg-gov-green" />
          </div>
        </div>
        
        <div className="h-7 w-px bg-[#D1D9E0]" />
        
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.55rem] font-medium text-[#718096] uppercase tracking-[0.18em]">Live Stream: {currentTime} UTC</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
               <Shield size={12} className="text-gov-accent" />
               <span className="text-[0.6rem] font-semibold text-gov-navy uppercase tracking-widest">Protocol Secured</span>
            </div>
            <span className="text-[0.55rem] text-[#718096] font-medium uppercase tracking-[0.12em]">AI Agent V4.2.0-Stable</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {currentUser && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-gov-navy">{currentUser.email}</span>
              <span className="text-[0.55rem] font-bold uppercase tracking-widest text-gov-accent bg-blue-50 px-2 py-0.5 rounded mt-0.5">
                Role: {role || 'Unknown'}
              </span>
            </div>
            <div className="h-6 w-px bg-[#D1D9E0]" />
            <button
              onClick={logout}
              className="flex items-center gap-2 text-[#718096] hover:text-accent-red transition-colors text-[0.65rem] font-bold uppercase tracking-widest"
              title="Logout"
            >
              <LogOut size={16} />
              End Session
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
