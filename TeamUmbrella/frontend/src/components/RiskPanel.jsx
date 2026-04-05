import React from 'react';

function RiskBadge({ level }) {
  // Handle both backend format (RED/AMBER/GREEN) and frontend format (HIGH/MEDIUM/LOW)
  const normalizedLevel = level?.toUpperCase();
  
  const styles = {
    RED: { bg: 'bg-[#2d1515]', text: 'text-[#f87171]', border: 'border-[#7f1d1d]', label: 'HIGH' },
    HIGH: { bg: 'bg-[#2d1515]', text: 'text-[#f87171]', border: 'border-[#7f1d1d]', label: 'HIGH' },
    AMBER: { bg: 'bg-[#2d2210]', text: 'text-[#fbbf24]', border: 'border-[#92400e]', label: 'MEDIUM' },
    MEDIUM: { bg: 'bg-[#2d2210]', text: 'text-[#fbbf24]', border: 'border-[#92400e]', label: 'MEDIUM' },
    GREEN: { bg: 'bg-[#0f291e]', text: 'text-[#34d399]', border: 'border-[#065f46]', label: 'LOW' },
    LOW: { bg: 'bg-[#0f291e]', text: 'text-[#34d399]', border: 'border-[#065f46]', label: 'LOW' },
  };

  const style = styles[normalizedLevel] || styles.LOW;

  return (
    <div className={`${style.bg} ${style.text} ${style.border} border px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider`}>
      {style.label}
    </div>
  );
}

function DetectionItem({ detection }) {
  const riskTier = detection.risk_tier || detection.risk_level || 'NORMAL';
  const normalizedTier = riskTier.toUpperCase();
  
  const borderColors = {
    PROHIBITED: 'border-l-red-600',
    HIGH: 'border-l-red-600',
    RESTRICTED: 'border-l-amber-500',
    MEDIUM: 'border-l-amber-500',
    NORMAL: 'border-l-green-500',
    LOW: 'border-l-green-500',
  };

  return (
    <div className={`${borderColors[normalizedTier] || 'border-l-gray-500'} border-l-2 bg-bg-card/50 p-3 rounded mb-2`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{detection.class}</span>
        <span className="text-xs text-gray-400">{(detection.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">{riskTier}</div>
    </div>
  );
}

export default function RiskPanel({ result, onReset }) {
  if (!result) {
    return (
      <div className="w-80 bg-bg-card border-l border-border-primary p-4 flex flex-col">
        <div className="text-gray-500 text-sm text-center mt-8">
          Upload a cargo image to view risk analysis
        </div>
      </div>
    );
  }

  const riskScore = result.risk_score || 0;
  const riskLevel = result.risk_level || 'LOW';

  return (
    <div className="w-80 bg-bg-card border-l border-border-primary p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Section 1: Shipment Risk Score */}
      <div>
        <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2">
          Shipment Risk Score
        </div>
        <div className="flex items-center gap-2 mb-3">
          <RiskBadge level={riskLevel} />
        </div>
        <div className="text-4xl font-bold text-white mb-1">
          {riskScore.toFixed(2)}
        </div>
        <div className="text-xs text-gray-500">
          {riskLevel === 'RED' || riskLevel === 'HIGH' ? 'Immediate inspection required' :
           riskLevel === 'AMBER' || riskLevel === 'MEDIUM' ? 'Secondary screening recommended' : 'Standard processing'}
        </div>
      </div>

      {/* Section 2: Detected Objects */}
      <div>
        <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2">
          Detected Objects
        </div>
        <div className="space-y-2">
          {result.detections && result.detections.length > 0 ? (
            result.detections.map((detection, idx) => (
              <DetectionItem key={idx} detection={detection} />
            ))
          ) : (
            <div className="text-gray-500 text-sm">No objects detected</div>
          )}
        </div>
      </div>

      {/* Section 3: AI Flag Reason */}
      {result.flag_reason && (
        <div>
          <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2">
            AI Flag Reason
          </div>
          <div className="bg-bg-cardAlt border border-[#1f2a44] rounded p-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              {result.flag_reason}
            </p>
          </div>
        </div>
      )}

      {/* Section 4: Model Metrics (placeholder for now) */}
      <div>
        <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2">
          Detection Summary
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-bg-cardAlt border border-border-primary rounded p-2 text-center">
            <div className="text-sm font-semibold text-white">
              {result.detections?.length || 0}
            </div>
            <div className="text-[10px] text-gray-500">Objects</div>
          </div>
          <div className="bg-bg-cardAlt border border-border-primary rounded p-2 text-center">
            <div className="text-sm font-semibold text-white">
              {result.detections?.filter(d => 
                (d.risk_tier || d.risk_level || '').toUpperCase() === 'PROHIBITED' ||
                (d.risk_tier || d.risk_level || '').toUpperCase() === 'HIGH'
              ).length || 0}
            </div>
            <div className="text-[10px] text-gray-500">High Risk</div>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t border-border-primary">
        <button
          onClick={onReset}
          className="flex-1 bg-bg-cardAlt border border-border-primary text-gray-300 text-sm py-2 rounded hover:bg-[#1a1f2e] transition-colors"
        >
          New Scan
        </button>
      </div>
    </div>
  );
}
