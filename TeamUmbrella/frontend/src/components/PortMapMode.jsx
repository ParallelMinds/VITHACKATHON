import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import VesselSidebar from './VesselSidebar';
import { fetchVessels, fetchInspections } from '../services/api';

const MUMBAI_PORT = [18.9322, 72.8374];

function getMarkerColor(riskLevel) {
  const level = riskLevel?.toUpperCase();
  switch (level) {
    case 'RED':
    case 'HIGH':
      return '#ef4444';
    case 'AMBER':
    case 'MEDIUM':
      return '#f59e0b';
    case 'GREEN':
    case 'LOW':
      return '#34d399';
    default:
      return '#6b7280';
  }
}

export default function PortMapMode() {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [inspections, setInspections] = useState([]);
  const [isLoadingVessels, setIsLoadingVessels] = useState(true);
  const [isLoadingInspections, setIsLoadingInspections] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setError(null);
      
      // Fetch vessels
      setIsLoadingVessels(true);
      try {
        const vesselData = await fetchVessels();
        setVessels(vesselData);
      } catch (err) {
        console.error('Failed to fetch vessels:', err);
        setError('Failed to load vessel data');
      } finally {
        setIsLoadingVessels(false);
      }

      // Fetch inspections
      setIsLoadingInspections(true);
      try {
        const inspectionData = await fetchInspections(20);
        setInspections(inspectionData);
      } catch (err) {
        console.error('Failed to fetch inspections:', err);
      } finally {
        setIsLoadingInspections(false);
      }
    };

    loadData();
  }, []);

  const handleSelectVessel = (vessel) => {
    setSelectedVessel(vessel);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const getFilteredVessels = () => {
    if (filter === 'all') return vessels;
    const normalizedFilter = filter.toUpperCase();
    return vessels.filter(v => {
      const level = v.risk_level?.toUpperCase();
      return level === normalizedFilter ||
             (normalizedFilter === 'HIGH' && level === 'RED') ||
             (normalizedFilter === 'MEDIUM' && level === 'AMBER') ||
             (normalizedFilter === 'LOW' && level === 'GREEN');
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Map Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          {isLoadingVessels ? (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-primary">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-gray-400 text-sm">Loading vessel data...</div>
              </div>
            </div>
          ) : (
            <MapContainer
              center={MUMBAI_PORT}
              zoom={6}
              scrollWheelZoom={true}
              className="w-full h-full"
              style={{ background: '#0d0f14' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains={['a', 'b', 'c', 'd']}
              />

              {getFilteredVessels().map((vessel) => (
                <CircleMarker
                  key={vessel.id}
                  center={[vessel.lat, vessel.lng]}
                  radius={12}
                  fillColor={getMarkerColor(vessel.risk_level)}
                  color="#0d0f14"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.7}
                  eventHandlers={{
                    click: () => handleSelectVessel(vessel)
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold mb-1">{vessel.name}</div>
                      <div className="text-gray-600">{vessel.origin} → Mumbai</div>
                      <div className="text-gray-600">ETA: {vessel.eta}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Inspection Log Table */}
        <InspectionLogTable inspections={inspections} isLoading={isLoadingInspections} />
      </div>

      {/* Sidebar - Always visible, never replaces map */}
      <VesselSidebar
        vessels={getFilteredVessels()}
        selectedVessel={selectedVessel}
        onSelectVessel={handleSelectVessel}
        filter={filter}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}

function InspectionLogTable({ inspections, isLoading }) {
  const getRiskBadgeClass = (level) => {
    const normalizedLevel = level?.toUpperCase();
    switch (normalizedLevel) {
      case 'RED':
      case 'HIGH':
        return 'bg-[#2d1515] text-[#f87171]';
      case 'AMBER':
      case 'MEDIUM':
        return 'bg-[#2d2210] text-[#fbbf24]';
      case 'GREEN':
      case 'LOW':
        return 'bg-[#0f291e] text-[#34d399]';
      default:
        return 'bg-gray-800 text-gray-400';
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="h-48 bg-bg-card border-t border-border-primary flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading inspection log...</div>
      </div>
    );
  }

  if (!inspections || inspections.length === 0) {
    return (
      <div className="h-48 bg-bg-card border-t border-border-primary flex items-center justify-center">
        <div className="text-gray-500 text-sm">No inspection records</div>
      </div>
    );
  }

  return (
    <div className="h-48 bg-bg-card border-t border-border-primary overflow-hidden">
      <div className="px-4 py-2 border-b border-border-primary">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Recent Inspections
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-36px)]">
        <table className="w-full text-xs">
          <thead className="bg-bg-cardAlt sticky top-0">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">Case ID</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">Timestamp</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">Risk Level</th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium">Objects</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((inspection, idx) => (
              <tr key={idx} className="border-b border-border-primary/50 hover:bg-bg-cardAlt/50">
                <td className="px-4 py-2 text-gray-300 font-mono">{inspection.id || inspection.case_id}</td>
                <td className="px-4 py-2 text-gray-400">{formatTimestamp(inspection.timestamp)}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskBadgeClass(inspection.risk_level)}`}>
                    {inspection.risk_level}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {inspection.objects_detected?.map(o => o.class).join(', ') || 
                   inspection.objects?.join(', ') || 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
