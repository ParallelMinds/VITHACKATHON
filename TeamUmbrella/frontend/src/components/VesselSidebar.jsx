import React from 'react';

const flagEmojis = {
  'Pakistan': '🇵🇰',
  'Iran': '🇮🇷',
  'UAE': '🇦🇪',
  'Sri Lanka': '🇱🇰',
  'Singapore': '🇸🇬',
  'Germany': '🇩🇪',
  'India': '🇮🇳',
};

function RiskDot({ level }) {
  const normalizedLevel = level?.toUpperCase();
  let color = 'bg-gray-500';
  
  if (normalizedLevel === 'RED' || normalizedLevel === 'HIGH') {
    color = 'bg-alert-red';
  } else if (normalizedLevel === 'AMBER' || normalizedLevel === 'MEDIUM') {
    color = 'bg-alert-amber';
  } else if (normalizedLevel === 'GREEN' || normalizedLevel === 'LOW') {
    color = 'bg-alert-green';
  }
  
  return <div className={`w-2 h-2 rounded-full ${color}`}></div>;
}

export default function VesselSidebar({ vessels, selectedVessel, onSelectVessel, filter, onFilterChange }) {
  const filters = ['all', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="w-72 bg-bg-card border-l border-border-primary flex flex-col">
      {/* Filter Pills */}
      <div className="p-3 border-b border-border-primary">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-cardAlt text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Vessel List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {vessels.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No vessels found
          </div>
        ) : (
          vessels.map((vessel) => (
            <div
              key={vessel.id}
              onClick={() => onSelectVessel(vessel)}
              className={`p-3 rounded border cursor-pointer transition-colors ${
                selectedVessel?.id === vessel.id
                  ? 'bg-[#1a1f3a] border-accent-primary'
                  : 'bg-bg-cardAlt border-border-primary hover:border-border-secondary'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-200">{vessel.name}</span>
                <RiskDot level={vessel.risk_level} />
              </div>
              <div className="text-xs text-gray-500">
                {flagEmojis[vessel.flag] || '🏴'} {vessel.origin} → Mumbai
              </div>
              <div className="text-xs text-gray-600 mt-1">
                ETA: {vessel.eta}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Vessel Detail Panel */}
      {selectedVessel && (
        <div className="border-t border-border-primary p-4 bg-bg-cardAlt">
          <div className="flex items-center gap-2 mb-3">
            <RiskDot level={selectedVessel.risk_level} />
            <span className="text-sm font-semibold">{selectedVessel.name}</span>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Route Risk</span>
              <span className={`font-medium ${
                selectedVessel.risk_level?.toUpperCase() === 'RED' || selectedVessel.risk_level?.toUpperCase() === 'HIGH'
                  ? 'text-alert-red'
                  : selectedVessel.risk_level?.toUpperCase() === 'AMBER' || selectedVessel.risk_level?.toUpperCase() === 'MEDIUM'
                  ? 'text-alert-amber'
                  : 'text-alert-green'
              }`}>
                {selectedVessel.risk_level}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Flag</span>
              <span>{flagEmojis[selectedVessel.flag] || '🏴'} {selectedVessel.flag}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ETA</span>
              <span>{selectedVessel.eta}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Origin</span>
              <span>{selectedVessel.origin}</span>
            </div>
            <div>
              <span className="text-gray-500">Declared Cargo</span>
              <div className="text-gray-300 mt-1">{selectedVessel.declared_cargo}</div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">AIS Status</span>
              <span className={
                selectedVessel.ais_status === 'Transmitting' ? 'text-alert-green' : 'text-alert-amber'
              }>
                {selectedVessel.ais_status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="p-3 border-t border-border-primary">
        <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2">Legend</div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-alert-red"></div>
            <span className="text-gray-400">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-alert-amber"></div>
            <span className="text-gray-400">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-alert-green"></div>
            <span className="text-gray-400">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}
