import React from 'react';

export default function TopBar() {
  return (
    <header className="h-12 bg-bg-card border-b border-border-primary flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-alert-red animate-pulse"></div>
        <span className="text-sm font-semibold tracking-wide">
          RED QUEEN — Cargo Intelligence & Border Security
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-alert-green animate-pulse"></div>
          <span className="text-xs font-medium text-alert-green">LIVE</span>
        </div>
        <span className="text-xs text-gray-400 border-r border-border-primary pr-4">
          Mumbai Port Authority
        </span>
        <span className="text-xs text-gray-300">
          Officer: <span className="font-medium">A. Sharma</span>
        </span>
      </div>
    </header>
  );
}
