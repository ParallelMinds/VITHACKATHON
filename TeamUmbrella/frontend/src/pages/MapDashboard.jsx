import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyShips, fetchShipHistory } from '../services/api';

const MUMBAI_PORT = [19.0760, 72.8777];

// High-risk ports and regions for route risk scoring
const HIGH_RISK_PORTS = [
  'karachi',
  'chittagong',
  'gwadar',
  'bandar abbas',
  'hormuz',
  'aden',
  'mogadishu',
  'lasbela',
  'ormara',
  'pasni',
  'jask',
  'chabahar',
  'khorramshahr',
  'bushehr',
  'assab',
  'hudeidah',
  'berbera',
  'bosaso',
  'kismayo',
];

// Known smuggling corridors / high-risk regions
const HIGH_RISK_REGIONS = [
  'strait of hormuz',
  'gulf of aden',
  'arabian sea',
  'horn of africa',
  'bab el-mandeb',
  'makran coast',
];

/**
 * Generate route coordinates from ship data.
 * Returns array of [lat, lon] points for the route polyline.
 */
function generateRouteCoordinates(ship) {
  const points = [];
  
  // Origin port coordinates (approximate for demo)
  const originPortCoords = getPortCoordinates(ship.origin_port || ship.origin || ship.last_port);
  const currentCoords = [ship.lat, ship.lon];
  const destCoords = getPortCoordinates(ship.destination);
  
  if (originPortCoords) {
    points.push(originPortCoords);
  }
  
  // Add intermediate points if we have route history
  if (ship.route_history && ship.route_history.length > 0) {
    ship.route_history.forEach(point => {
      if (point.lat && point.lon) {
        points.push([point.lat, point.lon]);
      }
    });
  }
  
  // Add current position
  if (ship.lat && ship.lon) {
    points.push(currentCoords);
  }
  
  // Add destination
  if (destCoords && (!originPortCoords || 
      Math.abs(destCoords[0] - currentCoords[0]) > 0.01 || 
      Math.abs(destCoords[1] - currentCoords[1]) > 0.01)) {
    points.push(destCoords);
  }
  
  return points.length > 1 ? points : [];
}

/**
 * Get approximate coordinates for known ports
 */
function getPortCoordinates(portName) {
  if (!portName) return null;
  
  const ports = {
    'karachi': [24.8607, 67.0011],
    'chittagong': [22.3384, 91.8317],
    'gwadar': [25.1263, 62.3227],
    'mumbai': [19.0760, 72.8777],
    'bombay': [19.0760, 72.8777],
    'colombo': [6.9271, 79.8612],
    'singapore': [1.2644, 103.8220],
    'shanghai': [31.2304, 121.4737],
    'shenzhen': [22.5431, 114.0579],
    'ningbo': [29.8683, 121.5440],
    'busan': [35.1796, 129.0756],
    'hong kong': [22.3193, 114.1694],
    'jebel ali': [25.0118, 55.1045],
    'dubai': [25.2048, 55.2708],
    'bandar abbas': [27.1865, 56.2654],
    'chennai': [13.0827, 80.2707],
    'kolkata': [22.5726, 88.3639],
    'visakhapatnam': [17.6868, 83.2185],
    'cochin': [9.9312, 76.2673],
    'mundra': [22.8395, 69.7343],
    'pipavav': [20.9716, 69.7447],
    'hormuz': [26.9667, 56.2667],
    'aden': [12.7855, 45.0187],
    'mogadishu': [2.0469, 45.3182],
    'berbera': [10.4390, 45.0133],
    'hudeidah': [14.7978, 42.9545],
    'assab': [13.0092, 42.7392],
    'bosaso': [11.2167, 49.1833],
    'kismayo': [-0.3582, 42.5460],
    'chabahar': [25.2919, 60.6439],
    'jask': [25.6519, 57.7522],
    'bushehr': [28.9234, 50.8203],
    'khorramshahr': [30.4256, 48.1697],
    'lasbela': [25.4167, 66.7500],
    'ormara': [25.2333, 64.6333],
    'pasni': [25.2667, 63.4667],
  };
  
  const lowerPort = portName.toLowerCase();
  
  // Direct match
  if (ports[lowerPort]) {
    return ports[lowerPort];
  }
  
  // Partial match
  for (const [key, coords] of Object.entries(ports)) {
    if (lowerPort.includes(key) || key.includes(lowerPort)) {
      return coords;
    }
  }
  
  return null;
}

/**
 * Get route line color based on ship risk level
 */
function getRouteColor(ship) {
  const routeRisk = calculateRouteRisk(ship);
  const score = routeRisk.risk_score ?? ship.risk_score;
  
  if (score == null || score === undefined) return '#6B7280'; // gray
  if (score > 0.6) return '#EF4444'; // red - HIGH
  if (score >= 0.3) return '#F59E0B'; // yellow - MEDIUM
  return '#10B981'; // green - LOW
}

/**
 * Calculate risk score based on ship's origin port.
 * Returns { risk_score, risk_reason, risk_level }
 */
function calculateRouteRisk(ship) {
  const origin = (ship.origin_port || ship.origin || ship.last_port || '').toLowerCase();
  const destination = (ship.destination || '').toLowerCase();

  // Check if origin is a high-risk port
  const isHighRiskPort = HIGH_RISK_PORTS.some(port => origin.includes(port));

  // Check if route passes through high-risk regions
  const passesThroughRiskRegion = HIGH_RISK_REGIONS.some(region =>
    origin.includes(region) || destination.includes(region)
  );

  // Use ship's existing risk_score if available, default to 0
  let riskScore = ship.risk_score ?? 0;
  let riskReason = ship.risk_reason || null;
  let reasons = [];

  if (isHighRiskPort) {
    riskScore = Math.max(riskScore, 0.7);
    reasons.push('High-risk origin port');
  }

  if (passesThroughRiskRegion) {
    riskScore = Math.max(riskScore, 0.5);
    reasons.push('Known smuggling corridor');
  }

  // If ship has no existing risk but comes from flagged port, set minimum risk
  if (isHighRiskPort && riskScore < 0.5) {
    riskScore = 0.65;
  }

  if (reasons.length > 0) {
    riskReason = reasons.join('; ');
  }

  // Determine risk level from score
  let riskLevel = ship.risk_level || 'LOW';
  if (riskScore > 0.6) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 0.3) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return { risk_score: riskScore, risk_reason: riskReason, risk_level: riskLevel };
}

/**
 * Get marker color based on risk score
 */
function getMarkerColorFromScore(riskScore) {
  if (riskScore == null || riskScore === undefined) return '#6B7280'; // gray for unknown
  if (riskScore > 0.6) return '#EF4444'; // red - HIGH
  if (riskScore >= 0.3) return '#F59E0B'; // yellow - MEDIUM
  return '#10B981'; // green - LOW
}

/**
 * Get marker color based on risk level string
 */
function getMarkerColorFromLevel(riskLevel) {
  const level = riskLevel?.toUpperCase();
  switch (level) {
    case 'RED':
    case 'HIGH':
      return '#EF4444';
    case 'AMBER':
    case 'MEDIUM':
      return '#F59E0B';
    case 'GREEN':
    case 'LOW':
      return '#10B981';
    default:
      return '#6B7280';
  }
}

/**
 * Get risk badge class for a given level
 */
function getRiskBadgeClass(level) {
  const normalizedLevel = level?.toUpperCase();
  switch (normalizedLevel) {
    case 'RED':
    case 'HIGH':
      return 'risk-high';
    case 'AMBER':
    case 'MEDIUM':
      return 'risk-medium';
    case 'GREEN':
    case 'LOW':
      return 'risk-low';
    default:
      return 'border border-border-primary text-text-muted';
  }
}

/**
 * Get risk emoji badge
 */
function getRiskEmoji(level) {
  const normalizedLevel = level?.toUpperCase();
  switch (normalizedLevel) {
    case 'RED':
    case 'HIGH':
      return '🔴';
    case 'AMBER':
    case 'MEDIUM':
      return '🟡';
    case 'GREEN':
    case 'LOW':
      return '🟢';
    default:
      return '⚪';
  }
}

// Custom ship marker component
function ShipMarker({ ship, onClick, showRoute, routeCoordinates, routeColor }) {
  // Apply route risk calculation
  const routeRisk = calculateRouteRisk(ship);
  const enrichedShip = {
    ...ship,
    risk_score: routeRisk.risk_score ?? ship.risk_score ?? 0,
    risk_level: routeRisk.risk_level || ship.risk_level || 'LOW',
    risk_reason: routeRisk.risk_reason || ship.risk_reason || 'No risk data available',
  };

  // Use risk_score for color if available, fallback to risk_level
  const markerColor = enrichedShip.risk_score != null
    ? getMarkerColorFromScore(enrichedShip.risk_score)
    : getMarkerColorFromLevel(enrichedShip.risk_level);

  const glowClass = enrichedShip.risk_score > 0.6
    ? 'ship-marker-high'
    : enrichedShip.risk_score >= 0.3
    ? 'ship-marker-medium'
    : 'ship-marker-low';

  const originPort = enrichedShip.origin_port || enrichedShip.origin || enrichedShip.last_port || 'Unknown';
  const destination = enrichedShip.destination || 'Unknown';
  const eta = enrichedShip.eta || 'N/A';
  const riskLevelDisplay = enrichedShip.risk_level === 'RED' ? 'HIGH' : enrichedShip.risk_level === 'AMBER' ? 'MEDIUM' : enrichedShip.risk_level || 'LOW';

  return (
    <>
      <CircleMarker
        center={[enrichedShip.lat, enrichedShip.lon]}
        radius={10}
        fillColor={markerColor}
        color="#000000"
        weight={2}
        opacity={1}
        fillOpacity={0.8}
        className={glowClass}
        eventHandlers={{
          click: () => onClick(enrichedShip),
        }}
      >
        <Popup>
          <div className="text-sm min-w-[220px]">
            <div className="font-semibold text-white mb-2">{enrichedShip.name}</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">MMSI:</span>
                <span className="text-white font-mono">{enrichedShip.mmsi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Origin:</span>
                <span className="text-white">{originPort}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Destination:</span>
                <span className="text-white">{destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ETA:</span>
                <span className="text-white font-mono">{eta}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Speed:</span>
                <span className="text-white">{enrichedShip.speed?.toFixed(1) || 0} knots</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Risk Score:</span>
                <span className="text-white font-mono">{enrichedShip.risk_score?.toFixed(2) || '0.00'}</span>
              </div>
              {/* Risk Level Badge */}
              <div className="flex justify-between items-center pt-1 border-t border-gray-700 mt-1">
                <span className="text-gray-400">Risk Level:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getRiskBadgeClass(enrichedShip.risk_level)}`}>
                  {getRiskEmoji(enrichedShip.risk_level)} {riskLevelDisplay}
                </span>
              </div>
              {/* Risk Reason */}
              {enrichedShip.risk_reason && (
                <div className="pt-1 mt-1 border-t border-gray-700">
                  <span className="text-gray-400">Reason:</span>
                  <span className="text-alert-amber block mt-0.5">{enrichedShip.risk_reason}</span>
                </div>
              )}
            </div>
          </div>
        </Popup>
      </CircleMarker>
      {/* Route visualization */}
      {showRoute && routeCoordinates && routeCoordinates.length > 1 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{
            color: routeColor,
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
          }}
        />
      )}
    </>
  );
}

// Ship list panel component
function ShipListPanel({ ships, selectedShip, onSelectShip, filter, onFilterChange, isLoading, error }) {
  const filters = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

  const getFilteredShips = () => {
    if (filter === 'ALL') return ships;
    return ships.filter(s => {
      // Apply route risk to get accurate level
      const routeRisk = calculateRouteRisk(s);
      const level = (routeRisk.risk_level || s.risk_level || 'LOW').toUpperCase();
      return level === filter ||
             (filter === 'HIGH' && level === 'RED') ||
             (filter === 'MEDIUM' && level === 'AMBER') ||
             (filter === 'LOW' && level === 'GREEN');
    });
  };

  const filteredShips = getFilteredShips();

  return (
    <div className="w-80 bg-bg-panel border-r border-border-primary flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Vessel Tracking</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-alert-amber animate-pulse' : error ? 'bg-alert-red' : 'bg-alert-green'}`}></div>
            <span className="text-xs text-text-muted">{ships.length} vessels</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                  : 'bg-bg-card text-text-muted border border-border-primary hover:border-border-secondary'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Ship List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-text-muted">Loading vessels...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <svg className="w-10 h-10 text-alert-red mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-alert-red mb-1">Connection Error</p>
              <p className="text-xs text-text-muted">{error}</p>
            </div>
          </div>
        ) : filteredShips.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-text-muted">No vessels detected in this area.</span>
          </div>
        ) : (
          <ul className="divide-y divide-border-primary">
            {filteredShips.map((ship, index) => {
              // Apply route risk for display
              const routeRisk = calculateRouteRisk(ship);
              const displayLevel = routeRisk.risk_level || ship.risk_level || 'LOW';
              const shipKey = ship.mmsi || ship.id || `ship-${index}`;
              return (
                <li
                  key={shipKey}
                  onClick={() => onSelectShip({ ...ship, ...routeRisk })}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedShip?.mmsi === ship.mmsi || selectedShip?.id === ship.id
                      ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
                      : 'hover:bg-bg-cardAlt border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-white">{ship.name || 'Unknown Vessel'}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getRiskBadgeClass(displayLevel)}`}>
                      {displayLevel === 'RED' ? 'HIGH' : displayLevel === 'AMBER' ? 'MEDIUM' : displayLevel}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-text-muted">
                    <div className="flex justify-between">
                      <span>MMSI</span>
                      <span className="font-mono text-text-secondary">{ship.mmsi || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Speed</span>
                      <span className="font-mono text-text-secondary">{ship.speed?.toFixed(1) || 0} kn</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heading</span>
                      <span className="font-mono text-text-secondary">{ship.heading ?? 0}°</span>
                    </div>
                    {routeRisk.risk_reason && (
                      <div className="flex justify-between">
                        <span>Risk</span>
                        <span className="text-alert-amber truncate max-w-[120px]">{routeRisk.risk_reason}</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border-primary">
        <div className="text-[10px] uppercase text-text-muted tracking-wider mb-3">Risk Legend</div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-alert-red shadow-glow"></div>
            <span className="text-xs text-text-muted">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-alert-amber shadow-glow"></div>
            <span className="text-xs text-text-muted">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-alert-green shadow-glow"></div>
            <span className="text-xs text-text-muted">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ship info panel component
function ShipInfoPanel({ ship, onClose, onInspect }) {
  if (!ship) return null;

  // Apply route risk calculation
  const routeRisk = calculateRouteRisk(ship);
  const displayLevel = routeRisk.risk_level || ship.risk_level || 'LOW';
  const displayScore = routeRisk.risk_score ?? ship.risk_score ?? 0;
  const displayReason = routeRisk.risk_reason || ship.risk_reason || 'No risk data available';

  const originPort = ship.origin_port || ship.origin || ship.last_port || 'Unknown';

  return (
    <div className="w-96 bg-bg-panel border-l border-border-primary flex flex-col h-full slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border-primary flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Vessel Intelligence</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-bg-cardAlt rounded transition-colors"
        >
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ship Name & Risk */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{ship.name}</h3>
          <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${getRiskBadgeClass(displayLevel)}`}>
            {getRiskEmoji(displayLevel)} {displayLevel === 'RED' ? 'HIGH' : displayLevel === 'AMBER' ? 'MEDIUM' : displayLevel}
          </span>
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-card border border-border-primary rounded p-3">
            <div className="text-[10px] uppercase text-text-muted tracking-wider mb-1">MMSI</div>
            <div className="text-sm font-mono text-white">{ship.mmsi || 'N/A'}</div>
          </div>
          <div className="bg-bg-card border border-border-primary rounded p-3">
            <div className="text-[10px] uppercase text-text-muted tracking-wider mb-1">Flag</div>
            <div className="text-sm text-white">{ship.flag || 'Unknown'}</div>
          </div>
          <div className="bg-bg-card border border-border-primary rounded p-3">
            <div className="text-[10px] uppercase text-text-muted tracking-wider mb-1">Type</div>
            <div className="text-sm text-white">{ship.type || 'Cargo'}</div>
          </div>
          <div className="bg-bg-card border border-border-primary rounded p-3">
            <div className="text-[10px] uppercase text-text-muted tracking-wider mb-1">Status</div>
            <div className="text-sm text-white">{ship.status || 'Underway'}</div>
          </div>
        </div>

        {/* Route Risk Assessment */}
        <div>
          <div className="text-[10px] uppercase text-text-muted tracking-wider mb-3">Route Risk Assessment</div>
          <div className="bg-bg-card border border-border-primary rounded p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Origin Port</span>
              <span className="text-sm text-white">{originPort}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Destination</span>
              <span className="text-sm text-white">{ship.destination || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Risk Score</span>
              <span className="text-sm font-mono text-white">{displayScore.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Risk Level</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getRiskBadgeClass(displayLevel)}`}>
                {getRiskEmoji(displayLevel)} {displayLevel === 'RED' ? 'HIGH' : displayLevel === 'AMBER' ? 'MEDIUM' : displayLevel}
              </span>
            </div>
            {displayReason && (
              <div className="pt-2 border-t border-border-primary">
                <span className="text-xs text-text-muted">Risk Reason</span>
                <p className="text-xs text-alert-amber mt-1">{displayReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Data */}
        <div>
          <div className="text-[10px] uppercase text-text-muted tracking-wider mb-3">Navigation Data</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="text-xs text-text-muted">Speed</span>
              <span className="text-sm font-mono text-white">{ship.speed?.toFixed(2) || 0} knots</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="text-xs text-text-muted">Heading</span>
              <span className="text-sm font-mono text-white">{ship.heading || 0}°</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="text-xs text-text-muted">Course</span>
              <span className="text-sm font-mono text-white">{ship.course || ship.heading || 0}°</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="text-xs text-text-muted">Destination</span>
              <span className="text-sm text-white">{ship.destination || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-text-muted">ETA</span>
              <span className="text-sm font-mono text-white">{ship.eta || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Position */}
        <div>
          <div className="text-[10px] uppercase text-text-muted tracking-wider mb-3">Current Position</div>
          <div className="bg-bg-card border border-border-primary rounded p-3 font-mono text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-text-muted">Latitude</span>
              <span className="text-white">{ship.lat?.toFixed(6) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Longitude</span>
              <span className="text-white">{ship.lon?.toFixed(6) || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-border-primary">
          <button
            onClick={() => onInspect(ship)}
            className="w-full py-2.5 bg-accent-primary hover:bg-accent-dark text-white text-sm font-medium rounded border border-accent-dark/50 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Initiate Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MapDashboard() {
  const [ships, setShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState(null); // { shipMmsi, coordinates, color }
  const hasLoadedOnce = useRef(false);

  const loadShips = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch ships near Mumbai Port from backend
      const data = await fetchNearbyShips(MUMBAI_PORT[0], MUMBAI_PORT[1], 50);
      // Backend returns an array directly, not wrapped in an object
      const shipsArray = Array.isArray(data) ? data : [];
      // Normalize ships with safe default values
      const normalizedShips = shipsArray.map((ship, index) => ({
        ...ship,
        id: ship.id || `ship-${index}`,
        mmsi: ship.mmsi || ship.id || `unknown-${index}`,
        name: ship.name || 'Unknown Vessel',
        lat: ship.lat ?? 0,
        lon: ship.lon ?? 0,
        speed: ship.speed ?? 0,
        heading: ship.heading ?? 0,
        type: ship.type || 'Unknown',
        risk_score: ship.risk_score ?? 0,
        risk_reason: ship.risk_reason ?? 'No risk data available',
        risk_level: ship.risk_level ?? 'LOW',
        origin_port: ship.origin_port || ship.origin || ship.last_port || 'Unknown',
        destination: ship.destination || 'Unknown',
        eta: ship.eta || 'N/A',
        flag: ship.flag || 'Unknown',
        status: ship.status || 'Underway',
        course: ship.course ?? ship.heading ?? 0,
        route_history: ship.route_history || [],
      }));
      setShips(normalizedShips);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error('Failed to load ships:', err);
      // Only show error on first load, not on retries
      if (!hasLoadedOnce.current) {
        const errorMsg = err.code === 'ERR_NETWORK'
          ? 'Unable to connect to the server. Please ensure the backend is running.'
          : err.message || 'Failed to load vessel data';
        setError(errorMsg);
      }
      setShips([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShips();
    
    // Auto-refresh ships every 30 seconds
    const interval = setInterval(loadShips, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectShip = (ship) => {
    setSelectedShip(ship);
    
    // Generate route data for the selected ship
    const coordinates = generateRouteCoordinates(ship);
    const color = getRouteColor(ship);
    
    if (coordinates.length > 1) {
      setRouteData({
        shipMmsi: ship.mmsi,
        coordinates,
        color,
      });
    } else {
      setRouteData(null);
    }
  };

  const handleCloseShipPanel = () => {
    setSelectedShip(null);
    setRouteData(null);
  };

  const handleInspect = (ship) => {
    console.log('Initiating inspection for:', ship);
  };

  return (
    <div className="flex h-full">
      {/* Ship List Panel */}
      <ShipListPanel
        ships={ships}
        selectedShip={selectedShip}
        onSelectShip={handleSelectShip}
        filter={filter}
        onFilterChange={setFilter}
        isLoading={isLoading}
        error={error}
      />

      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer
          center={MUMBAI_PORT}
          zoom={9}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ background: '#000000' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
          />

          {/* Render ship markers safely - ships is always an array */}
          {Array.isArray(ships) && ships.map((ship, index) => {
            const shipKey = ship.mmsi || ship.id || `ship-${index}`;
            return (
              <ShipMarker
                key={shipKey}
                ship={ship}
                onClick={handleSelectShip}
                showRoute={routeData?.shipMmsi === ship.mmsi}
                routeCoordinates={routeData?.shipMmsi === ship.mmsi ? routeData.coordinates : null}
                routeColor={routeData?.color || getRouteColor(ship)}
              />
            );
          })}
        </MapContainer>

        {/* Map Overlay - Top Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="bg-bg-panel/90 backdrop-blur border border-border-primary rounded px-4 py-2 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-alert-amber animate-pulse' : error ? 'bg-alert-red' : 'bg-alert-green'} animate-pulse`}></div>
                <span className="text-xs text-text-secondary">{isLoading ? 'Loading...' : error ? 'Offline' : 'Live Tracking'}</span>
              </div>
              <span className="text-xs text-text-muted">|</span>
              <span className="text-xs text-text-muted font-mono">Mumbai Port Authority</span>
            </div>
          </div>

          <div className="bg-bg-panel/90 backdrop-blur border border-border-primary rounded px-4 py-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              <span className="text-xs text-text-secondary">50 km radius</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="absolute bottom-4 left-4 bg-risk-danger/90 backdrop-blur border border-alert-red rounded px-4 py-3 max-w-md">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-alert-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-alert-red">Connection Warning</div>
                <div className="text-xs text-gray-400 mt-1">{error}</div>
                <button 
                  onClick={loadShips}
                  className="text-xs text-accent-primary hover:underline mt-1"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ship Info Panel */}
      {selectedShip && (
        <ShipInfoPanel
          ship={selectedShip}
          onClose={handleCloseShipPanel}
          onInspect={handleInspect}
        />
      )}
    </div>
  );
}
