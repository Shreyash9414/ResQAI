import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Incident, ResourceUnit, Hospital, ReliefCamp } from '../../types';
import { Layers, Navigation, Compass, AlertTriangle, Radio, Crosshair } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const createCustomIcon = (color: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 15px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 15px;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
};

// High-visibility glowing radar beacon for Citizen device location
const createUserLiveIcon = () => {
  return L.divIcon({
    className: 'user-live-radar-marker',
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        <!-- Concentric Pulsing Radar Ring -->
        <div style="
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.45);
          box-shadow: 0 0 24px rgba(59, 130, 246, 0.9);
          animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <!-- High-contrast Core Beacon -->
        <div style="
          position: relative;
          background: #2563eb;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 16px #2563eb, inset 0 0 6px rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #ffffff;
          z-index: 2;
        ">
          📍
        </div>
        <!-- Floating Label Badge -->
        <div style="
          position: absolute;
          bottom: -22px;
          background: #1e3a8a;
          color: #93c5fd;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          padding: 1px 7px;
          font-family: monospace;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.7);
          letter-spacing: 0.5px;
          z-index: 3;
        ">
          YOU ARE HERE
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

const destinationIcon = createCustomIcon('#dc2626', '🔥');
const rescueIcon = createCustomIcon('#2563eb', '🚑');
const policeIcon = createCustomIcon('#7c3aed', '🚓');
const hospitalIcon = createCustomIcon('#10b981', '🏥');
const campIcon = createCustomIcon('#0891b2', '⛺');
const userMarkerIcon = createUserLiveIcon();

const calculateHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Map view Auto-Fitter / Controller Component
const MapController: React.FC<{
  centerLat: number;
  centerLng: number;
  zoom?: number;
  trigger?: number;
}> = ({ centerLat, centerLng, zoom = 14, trigger = 0 }) => {
  const map = useMap();
  useEffect(() => {
    if (centerLat && centerLng) {
      map.flyTo([centerLat, centerLng], zoom, { duration: 1 });
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [centerLat, centerLng, zoom, trigger, map]);
  return null;
};

interface LiveCommandMapProps {
  incidents?: Incident[];
  resources?: ResourceUnit[];
  hospitals?: Hospital[];
  camps?: ReliefCamp[];
  userLocation?: { lat: number; lng: number } | null;
  height?: string;
  activeIncident?: any;
}

export const LiveCommandMap: React.FC<LiveCommandMapProps> = ({
  incidents = [],
  resources = [],
  hospitals = [],
  camps = [],
  userLocation = null,
  height = 'calc(100vh - 120px)'
}) => {
  const [deviceGps, setDeviceGps] = useState<{ lat: number; lng: number } | null>(userLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState<'USER' | 'INCIDENT'>('USER');
  const [centerTrigger, setCenterTrigger] = useState<number>(0);

  // Automatically acquire device GPS coordinates if not passed via props
  useEffect(() => {
    if (userLocation) {
      setDeviceGps(userLocation);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsAccuracy(pos.coords.accuracy || 10);
        },
        (err) => console.warn('LiveCommandMap geolocation notice:', err.message),
        { enableHighAccuracy: true, timeout: 8000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setDeviceGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsAccuracy(pos.coords.accuracy || 10);
        },
        (err) => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [userLocation]);

  const safeIncidents = (Array.isArray(incidents) ? incidents : []).filter(
    (inc): inc is Incident => Boolean(inc && inc.location && typeof inc.location.lat === 'number' && typeof inc.location.lng === 'number' && !isNaN(inc.location.lat) && !isNaN(inc.location.lng))
  );

  const safeResources: ResourceUnit[] = (Array.isArray(resources) ? resources : ((resources as any)?.resources || [])).filter(
    (res: any): res is ResourceUnit => Boolean(res && res.location && typeof res.location.lat === 'number' && typeof res.location.lng === 'number' && !isNaN(res.location.lat) && !isNaN(res.location.lng))
  );

  const safeHospitals: Hospital[] = (Array.isArray(hospitals) ? hospitals : ((hospitals as any)?.hospitals || [])).filter(
    (hosp: any): hosp is Hospital => Boolean(hosp && hosp.location && typeof hosp.location.lat === 'number' && typeof hosp.location.lng === 'number' && !isNaN(hosp.location.lat) && !isNaN(hosp.location.lng))
  );

  const safeCamps: ReliefCamp[] = (Array.isArray(camps) ? camps : []).filter(
    (camp: any): camp is ReliefCamp => Boolean(camp && camp.location && typeof camp.location.lat === 'number' && typeof camp.location.lng === 'number' && !isNaN(camp.location.lat) && !isNaN(camp.location.lng))
  );

  const [layers, setLayers] = useState({
    incidents: true,
    ambulances: true,
    hospitals: true,
    camps: true,
    hazardZones: true
  });

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string; mode: string } | null>(null);

  // Active Incident Selection
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(safeIncidents[0] || null);

  // Determine Map Center: Prioritize Device Location when available
  const centerLat = useMemo(() => {
    if (focusMode === 'USER' && deviceGps) {
      return deviceGps.lat;
    }
    if (selectedIncident?.location?.lat) {
      return selectedIncident.location.lat;
    }
    return deviceGps ? deviceGps.lat : 20.5937;
  }, [focusMode, deviceGps, selectedIncident]);

  const centerLng = useMemo(() => {
    if (focusMode === 'USER' && deviceGps) {
      return deviceGps.lng;
    }
    if (selectedIncident?.location?.lng) {
      return selectedIncident.location.lng;
    }
    return deviceGps ? deviceGps.lng : 78.9629;
  }, [focusMode, deviceGps, selectedIncident]);

  const currentZoom = (focusMode === 'USER' && deviceGps) ? 15 : 13;

  // Find nearest incident to user's real device
  const nearestIncidentToUser = useMemo<{ incident: Incident; distKm: number } | null>(() => {
    if (!deviceGps || !safeIncidents.length) return null;
    let closest: { incident: Incident; distKm: number } | null = null;
    safeIncidents.forEach((inc) => {
      const d = calculateHaversineKm(deviceGps.lat, deviceGps.lng, inc.location.lat, inc.location.lng);
      if (!closest || d < closest.distKm) {
        closest = { incident: inc, distKm: d };
      }
    });
    return closest;
  }, [deviceGps, safeIncidents]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-surface-border shadow-2xl" style={{ height }}>
      
      {/* Real Device Location & Status Banner */}
      <div className="absolute top-4 right-4 z-[1000] bg-[#0c1222]/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-blue-500/50 shadow-2xl flex items-center space-x-3 text-xs font-mono">
        {deviceGps ? (
          <>
            <div className="flex items-center space-x-1.5 text-blue-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <span>LIVE DEVICE GPS</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="text-emerald-400 font-bold">
              {deviceGps.lat.toFixed(4)}, {deviceGps.lng.toFixed(4)}
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="text-slate-300">
              {nearestIncidentToUser && nearestIncidentToUser.distKm <= 50 ? (
                <span className="text-amber-400 font-bold">⚠️ Incident {nearestIncidentToUser.distKm.toFixed(1)} km away</span>
              ) : (
                <span className="text-emerald-300">🟢 No active disaster in 50km</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2 text-slate-300">
            <Compass className="w-4 h-4 animate-spin text-blue-400" />
            <span>Acquiring Device GPS...</span>
          </div>
        )}
      </div>

      {/* Map Control & Layer Selector Header */}
      <div className="absolute top-4 left-4 z-[1000] bg-[#0c1222]/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-2xl max-w-xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">MAP COMMAND</span>
          </div>
        </div>

        {/* Focus Mode Switcher: Center on My Location vs Regional Incidents */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={() => {
              setFocusMode('USER');
              setCenterTrigger(prev => prev + 1);
            }}
            className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
              focusMode === 'USER'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 border border-blue-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>MY LOCATION</span>
          </button>

          <button
            onClick={() => {
              setFocusMode('INCIDENT');
              if (safeIncidents.length) {
                setSelectedIncident(safeIncidents[0]);
              }
              setCenterTrigger(prev => prev + 1);
            }}
            className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
              focusMode === 'INCIDENT'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 border border-red-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>INCIDENTS</span>
          </button>
        </div>

        <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800">
          <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Incidents & Hazards</span>
            </span>
            <input
              type="checkbox"
              checked={layers.incidents}
              onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
              className="accent-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Rescue Responders</span>
            </span>
            <input
              type="checkbox"
              checked={layers.ambulances}
              onChange={(e) => setLayers({ ...layers, ambulances: e.target.checked })}
              className="accent-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Hospitals & Shelters</span>
            </span>
            <input
              type="checkbox"
              checked={layers.hospitals}
              onChange={(e) => setLayers({ ...layers, hospitals: e.target.checked, camps: e.target.checked })}
              className="accent-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* Live Map Renderer */}
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={currentZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapController
          centerLat={centerLat}
          centerLng={centerLng}
          zoom={currentZoom}
          trigger={centerTrigger}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 📍 REAL DEVICE CITIZEN LOCATION BEACON */}
        {deviceGps && (
          <>
            <Marker position={[deviceGps.lat, deviceGps.lng]} icon={userMarkerIcon} zIndexOffset={3000}>
              <Popup>
                <div className="p-1 font-mono text-xs">
                  <strong style={{ color: '#3b82f6', fontSize: '13px' }}>📍 YOU (LIVE DEVICE GPS)</strong>
                  <br />
                  Latitude: <b>{deviceGps.lat.toFixed(6)}</b>
                  <br />
                  Longitude: <b>{deviceGps.lng.toFixed(6)}</b>
                  <br />
                  Accuracy: <b>{gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : 'High'}</b>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[deviceGps.lat, deviceGps.lng]}
              radius={Math.max(25, gpsAccuracy || 15)}
              pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.18, weight: 2 }}
            />
          </>
        )}

        {/* Hazard Zone Circles */}
        {layers.hazardZones &&
          safeIncidents.map((inc) => {
            const disaster = (inc.disasterType || '').toUpperCase();
            let radius = 100;
            if (disaster.includes('FLOOD') || disaster.includes('EARTH')) radius = 500;
            else if (disaster.includes('CHEM')) radius = 300;
            else if (disaster.includes('GAS')) radius = 200;

            return (
              <Circle
                key={`circle_${inc.id || inc.incidentId}`}
                center={[inc.location.lat, inc.location.lng]}
                radius={radius}
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 2, dashArray: '4, 4' }}
              />
            );
          })}

        {/* Incident Markers */}
        {layers.incidents &&
          safeIncidents.map((inc) => (
            <Marker
              key={inc.id || inc.incidentId}
              position={[inc.location.lat, inc.location.lng]}
              icon={destinationIcon}
              eventHandlers={{
                click: () => {
                  setSelectedIncident(inc);
                  setFocusMode('INCIDENT');
                }
              }}
            >
              <Popup>
                <div className="p-1 max-w-xs font-mono text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-red-500 text-xs uppercase">🔥 INCIDENT DESTINATION</span>
                    <span className="px-1 rounded bg-red-950 text-red-300 font-bold text-[10px]">
                      {inc.severity}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100 mb-1">{inc.title}</h4>
                  <p className="text-[11px] text-slate-300">{inc.location.address}</p>
                  <p className="text-[10px] text-blue-400 mt-1 font-bold">ID: {inc.incidentId || inc.id}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Rescue Team / Vehicle Markers */}
        {layers.ambulances &&
          safeResources.map((res) => (
            <Marker
              key={res.id || (res as any).resourceId || (res as any)._id}
              position={[res.location.lat, res.location.lng]}
              icon={res.type === 'Police Cruiser' ? policeIcon : rescueIcon}
            >
              <Popup>
                <div className="p-1 font-mono text-xs">
                  <h4 className="font-bold text-sm text-blue-400">🚑 RESCUE TEAM</h4>
                  <p className="font-bold text-slate-100">{res.name}</p>
                  <p className="text-slate-300">Status: <b className="text-emerald-400">{res.status}</b></p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Hospital Markers */}
        {layers.hospitals &&
          safeHospitals.map((hosp: Hospital) => (
            <Marker key={hosp.id || hosp.hospitalId} position={[hosp.location.lat, hosp.location.lng]} icon={hospitalIcon}>
              <Popup>
                <div className="p-1 font-mono text-xs">
                  <h4 className="font-bold text-emerald-400">{hosp.name}</h4>
                  <p className="text-slate-300">Beds: {hosp.availableBeds}/{hosp.totalBeds}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Relief Camp Markers */}
        {layers.camps &&
          safeCamps.map((camp) => (
            <Marker key={camp.id} position={[camp.location.lat, camp.location.lng]} icon={campIcon}>
              <Popup>
                <div className="p-1 font-mono text-xs">
                  <h4 className="font-bold text-cyan-400">{camp.name}</h4>
                  <p className="text-slate-300">Occupants: {camp.currentOccupants}/{camp.capacity}</p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};
