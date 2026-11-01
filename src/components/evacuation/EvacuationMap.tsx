import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EvacuationDestination, EvacuationRouteResponse, RoadObstructionReport, EvacuationHazardsFeed } from '../../types';
import { Layers, Navigation2, Compass, AlertTriangle, ShieldCheck, CheckCircle2, Info } from 'lucide-react';

interface EvacuationMapProps {
  citizenLocation: { lat: number; lng: number } | null;
  destinations: EvacuationDestination[];
  selectedDestination: EvacuationDestination | null;
  onSelectDestination: (dest: EvacuationDestination) => void;
  routeData: EvacuationRouteResponse | null;
  hazards: EvacuationHazardsFeed;
  height?: string;
  isRecalculating?: boolean;
}

// Marker icon creators
const createDivIcon = (color: string, symbol: string, pulse: boolean = false) => {
  return L.divIcon({
    className: 'custom-evacuation-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        ${pulse ? `<div style="position: absolute; inset: -6px; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="
          background-color: ${color};
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 15px;
          z-index: 10;
        ">
          ${symbol}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const citizenIcon = createDivIcon('#2563eb', '📍', true);
const shelterIcon = createDivIcon('#059669', '⛺');
const selectedShelterIcon = createDivIcon('#10b981', '⭐', true);
const hospitalIcon = createDivIcon('#0284c7', '🏥');
const roadblockIcon = createDivIcon('#dc2626', '🚧');
const pendingReportIcon = createDivIcon('#f59e0b', '⚠️');
const disasterIcon = createDivIcon('#b91c1c', '🔥');

// Map controller to adjust bounds dynamically
const EvacuationMapController: React.FC<{
  citizenLocation: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][];
  selectedDestination?: EvacuationDestination | null;
}> = ({ citizenLocation, routeCoordinates, selectedDestination }) => {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 1) {
      const bounds = L.latLngBounds(routeCoordinates.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    } else if (citizenLocation && selectedDestination) {
      const bounds = L.latLngBounds(
        [citizenLocation.lat, citizenLocation.lng],
        [selectedDestination.location.lat, selectedDestination.location.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (citizenLocation) {
      map.flyTo([citizenLocation.lat, citizenLocation.lng], 14, { duration: 1.2 });
    }
  }, [citizenLocation, routeCoordinates, selectedDestination, map]);

  return null;
};

export const EvacuationMap: React.FC<EvacuationMapProps> = ({
  citizenLocation,
  destinations,
  selectedDestination,
  onSelectDestination,
  routeData,
  hazards,
  height = '620px',
  isRecalculating = false
}) => {
  const [showDisasters, setShowDisasters] = React.useState(true);
  const [showRoadblocks, setShowRoadblocks] = React.useState(true);
  const [showShelters, setShowShelters] = React.useState(true);
  const [showHospitals, setShowHospitals] = React.useState(true);

  // Default center if citizen GPS is not yet acquired (Connaught Place fallback only for view, not saved)
  const defaultCenterLat = citizenLocation?.lat || 28.6304;
  const defaultCenterLng = citizenLocation?.lng || 77.2177;

  // Polyline style based on route safety status
  const polylineColor = useMemo(() => {
    if (!routeData) return '#3b82f6';
    switch (routeData.status) {
      case 'Recommended':
        return '#10b981'; // Emerald Green
      case 'Caution':
        return '#f59e0b'; // Amber Warning
      case 'Blocked':
        return '#ef4444'; // Red Hazard
      case 'Information Incomplete':
      default:
        return '#8b5cf6'; // Purple Caution
    }
  }, [routeData]);

  const polylineDashArray = useMemo(() => {
    if (!routeData) return '8, 8';
    if (routeData.status === 'Blocked') return '6, 8';
    if (routeData.status === 'Information Incomplete') return '8, 8';
    return undefined; // solid line for Recommended & Caution
  }, [routeData]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950" style={{ height }}>
      {/* Route Status HUD Overlay */}
      {routeData && (
        <div className="absolute top-4 right-4 z-[1000] bg-[#0c1222]/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700 shadow-2xl flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 font-bold">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                routeData.status === 'Recommended'
                  ? 'bg-emerald-500 animate-pulse'
                  : routeData.status === 'Caution'
                  ? 'bg-amber-500'
                  : routeData.status === 'Blocked'
                  ? 'bg-red-500'
                  : 'bg-purple-500'
              }`}
            />
            <span
              className={
                routeData.status === 'Recommended'
                  ? 'text-emerald-400 font-bold'
                  : routeData.status === 'Caution'
                  ? 'text-amber-400 font-bold'
                  : routeData.status === 'Blocked'
                  ? 'text-red-400 font-bold'
                  : 'text-purple-400 font-bold'
              }
            >
              ROUTE: {routeData.status.toUpperCase()}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          <div className="text-slate-300 font-mono">
            {routeData.distanceKm} km · <span className="text-white font-semibold">{routeData.durationMins} mins</span>
          </div>

          {isRecalculating && (
            <div className="text-blue-400 text-[11px] animate-pulse">
              Recalculating...
            </div>
          )}
        </div>
      )}

      {/* Layer Control Pill Overlay */}
      <div className="absolute top-4 left-4 z-[1000] bg-[#0c1222]/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl max-w-xs text-xs">
        <div className="flex items-center space-x-2 mb-2 pb-1.5 border-b border-slate-700">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Map Layers</span>
        </div>

        <div className="space-y-1 text-slate-300 text-[11px]">
          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Disaster Perimeters</span>
            </span>
            <input
              type="checkbox"
              checked={showDisasters}
              onChange={(e) => setShowDisasters(e.target.checked)}
              className="accent-red-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Road Closures & Blocks</span>
            </span>
            <input
              type="checkbox"
              checked={showRoadblocks}
              onChange={(e) => setShowRoadblocks(e.target.checked)}
              className="accent-amber-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Relief Shelters</span>
            </span>
            <input
              type="checkbox"
              checked={showShelters}
              onChange={(e) => setShowShelters(e.target.checked)}
              className="accent-emerald-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Emergency Hospitals</span>
            </span>
            <input
              type="checkbox"
              checked={showHospitals}
              onChange={(e) => setShowHospitals(e.target.checked)}
              className="accent-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={[defaultCenterLat, defaultCenterLng]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <EvacuationMapController
          citizenLocation={citizenLocation}
          routeCoordinates={routeData?.coordinates}
          selectedDestination={selectedDestination}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Citizen Current GPS Location */}
        {citizenLocation && (
          <>
            <Marker position={[citizenLocation.lat, citizenLocation.lng]} icon={citizenIcon}>
              <Popup>
                <div className="p-1 font-mono text-xs">
                  <div className="font-bold text-blue-500 mb-1 flex items-center space-x-1">
                    <span>📍 YOUR CURRENT GPS LOCATION</span>
                  </div>
                  <div className="text-slate-600">
                    {citizenLocation.lat.toFixed(5)}, {citizenLocation.lng.toFixed(5)}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                    Evacuation Origin Point
                  </div>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[citizenLocation.lat, citizenLocation.lng]}
              radius={80}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1.5 }}
            />
          </>
        )}

        {/* 2. Route Polyline */}
        {routeData && routeData.coordinates && routeData.coordinates.length > 0 && (
          <Polyline
            positions={routeData.coordinates}
            pathOptions={{
              color: polylineColor,
              weight: 6,
              opacity: 0.9,
              dashArray: polylineDashArray
            }}
          />
        )}

        {/* 3. Disaster Zones with perimeters */}
        {showDisasters &&
          hazards.disasterZones.map((zone) => (
            <React.Fragment key={zone.id}>
              <Circle
                center={[zone.center.lat, zone.center.lng]}
                radius={zone.radiusMeters || 500}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.22,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              />
              <Marker position={[zone.center.lat, zone.center.lng]} icon={disasterIcon}>
                <Popup>
                  <div className="p-1.5 max-w-xs font-mono text-xs">
                    <div className="font-bold text-red-500 mb-1">🚨 ACTIVE DISASTER PERIMETER</div>
                    <div className="font-semibold text-slate-800">{zone.title}</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Type: <span className="font-bold text-red-600">{zone.disasterType}</span> | Severity:{' '}
                      <span className="font-bold text-red-600">{zone.severity}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Danger Exclusion Radius: {zone.radiusMeters}m
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

        {/* 4. Verified Road Closures & Obstructions */}
        {showRoadblocks &&
          hazards.roadClosures.map((closure) => {
            const isVerified = closure.status === 'VERIFIED';
            const markerIcon = isVerified ? roadblockIcon : pendingReportIcon;
            const circleColor = isVerified ? '#dc2626' : '#f59e0b';

            return (
              <React.Fragment key={closure.reportId || closure._id}>
                <Circle
                  center={[closure.location.lat, closure.location.lng]}
                  radius={closure.radiusMeters || 150}
                  pathOptions={{
                    color: circleColor,
                    fillColor: circleColor,
                    fillOpacity: 0.28,
                    weight: 2,
                    dashArray: '4, 4'
                  }}
                />
                <Marker position={[closure.location.lat, closure.location.lng]} icon={markerIcon}>
                  <Popup>
                    <div className="p-1.5 max-w-xs font-mono text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-500">
                          {isVerified ? '🚧 CONFIRMED ROAD CLOSURE' : '⚠️ UNVERIFIED ROAD OBSTRUCTION'}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            isVerified ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {closure.status}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-800">{closure.title}</div>
                      <div className="text-[11px] text-slate-600 mt-1">{closure.description}</div>
                      <div className="text-[10px] text-slate-500 mt-1.5 border-t border-slate-200 pt-1">
                        Hazard: {closure.hazardType} | Radius: {closure.radiusMeters}m
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* 5. Safe Destinations: Relief Shelters */}
        {showShelters &&
          destinations
            .filter((d) => d.destinationType === 'RELIEF_SHELTER')
            .map((shelter) => {
              const isSelected = selectedDestination?.id === shelter.id;
              const iconToUse = isSelected ? selectedShelterIcon : shelterIcon;

              return (
                <Marker
                  key={shelter.id}
                  position={[shelter.location.lat, shelter.location.lng]}
                  icon={iconToUse}
                  eventHandlers={{
                    click: () => onSelectDestination(shelter)
                  }}
                >
                  <Popup>
                    <div className="p-2 max-w-xs text-xs font-sans">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-600 text-[11px] uppercase flex items-center space-x-1">
                          <span>⛺ RELIEF SHELTER</span>
                        </span>
                        {shelter.verified && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{shelter.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">{shelter.address}</p>

                      <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">Available Space:</span>
                          <span className="font-bold text-emerald-600">
                            {shelter.availableCapacity ?? 'Open'} / {shelter.totalCapacity ?? '500'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Occupancy:</span>
                          <span className="font-bold text-slate-700">
                            {shelter.occupancyPercentage ? `${shelter.occupancyPercentage}%` : 'Moderate'}
                          </span>
                        </div>
                      </div>

                      {shelter.suppliesAvailable && (
                        <div className="mt-2 text-[10px] text-slate-600 space-y-0.5">
                          <div>🍞 Food Packs: {shelter.suppliesAvailable.foodPacks ?? 500}</div>
                          <div>💧 Clean Water: {shelter.suppliesAvailable.waterLiters ?? 2000}L</div>
                        </div>
                      )}

                      <button
                        onClick={() => onSelectDestination(shelter)}
                        className="mt-3 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow transition-all"
                      >
                        {isSelected ? 'Currently Selected' : 'Route To This Shelter'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

        {/* 6. Safe Destinations: Hospitals */}
        {showHospitals &&
          destinations
            .filter((d) => d.destinationType === 'HOSPITAL')
            .map((hosp) => {
              const isSelected = selectedDestination?.id === hosp.id;

              return (
                <Marker
                  key={hosp.id}
                  position={[hosp.location.lat, hosp.location.lng]}
                  icon={hospitalIcon}
                  eventHandlers={{
                    click: () => onSelectDestination(hosp)
                  }}
                >
                  <Popup>
                    <div className="p-2 max-w-xs text-xs font-sans">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-blue-600 text-[11px] uppercase">
                          🏥 EMERGENCY HOSPITAL
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            hosp.ambulanceReceivingStatus === 'ACCEPTING'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {hosp.ambulanceReceivingStatus || 'OPEN'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{hosp.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">{hosp.address}</p>

                      <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">General Beds:</span>
                          <span className="font-bold text-blue-600">{hosp.availableBeds ?? 'Available'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">ICU Beds:</span>
                          <span className="font-bold text-indigo-600">{hosp.availableICUBeds ?? 'Available'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectDestination(hosp)}
                        className="mt-3 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow transition-all"
                      >
                        {isSelected ? 'Currently Selected' : 'Route To This Hospital'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
      </MapContainer>
    </div>
  );
};
