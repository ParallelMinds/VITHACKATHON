import React from 'react';

export default function ModeSwitcher({ mode, onModeChange }) {
  return (
    <div className="h-10 bg-bg-card border-b border-border-primary flex items-center px-4 gap-2">
      <button
        onClick={() => onModeChange('xray')}
        className={`px-4 h-7 rounded text-sm font-medium transition-colors ${
          mode === 'xray'
            ? 'bg-[#1e2d52] text-accent-light border border-border-accent'
            : 'bg-transparent text-gray-500 hover:text-gray-300'
        }`}
      >
        X-Ray Scan
      </button>
      <button
        onClick={() => onModeChange('map')}
        className={`px-4 h-7 rounded text-sm font-medium transition-colors ${
          mode === 'map'
            ? 'bg-[#1e2d52] text-accent-light border border-border-accent'
            : 'bg-transparent text-gray-500 hover:text-gray-300'
        }`}
      >
        Port Map
      </button>
    </div>
  );
}
