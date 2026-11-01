import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, ReliefCamp } from '../../types';
import { Compass } from 'lucide-react';

const createCustomIcon = (color: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 15px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

// Specialized high-visibility glowing radar beacon for Citizen device location
const createUserLocationIcon = () => {
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

const disasterIcon = createCustomIcon('#dc2626', '🔴');
const ambulanceIcon = createCustomIcon('#ef4444', '🚑');
const fireIcon = createCustomIcon('#f59e0b', '🔥');
const policeIcon = createCustomIcon('#8b5cf6', '🚓');
const hospitalIcon = createCustomIcon('#10b981', '🏥');
const campIcon = createCustomIcon('#06b6d4', '⛺');

interface CitizenDeviceMapProps {
  userLocation: { lat: number; lng: number } | null;
  accuracy: number | null;
  incidentLocation?: { lat: number; lng: number; type?: string; severity?: string } | null;
  recenterTrigger?: number;
  assignedUnits?: any[];
  hospitals?: Hospital[];
  camps?: ReliefCamp[];
  height?: string;
}

export const CitizenDeviceMap: React.FC<CitizenDeviceMapProps> = ({
  userLocation,
  accuracy,
  incidentLocation = null,
  recenterTrigger = 0,
  assignedUnits = [],
  hospitals = [],
  camps = [],
  height = '460px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const incidentMarkerRef = useRef<L.Marker | null>(null);
  const disasterCircleRef = useRef<L.Circle | null>(null);
  const unitMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const hospitalMarkersRef = useRef<L.Marker[]>([]);
  const campMarkersRef = useRef<L.Marker[]>([]);
  const hasInitialCenteredRef = useRef<boolean>(false);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const initialLat = userLocation ? userLocation.lat : 20.5937;
    const initialLng = userLocation ? userLocation.lng : 78.9629;
    const initialZoom = userLocation ? 16 : 4;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    // Trigger invalidateSize to ensure full canvas bounds
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      incidentMarkerRef.current = null;
      disasterCircleRef.current = null;
      unitMarkersRef.current = {};
      hospitalMarkersRef.current = [];
      campMarkersRef.current = [];
      hasInitialCenteredRef.current = false;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle Real Device Location & Accurate Marker Rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    const { lat, lng } = userLocation;
    const currentAccuracy = accuracy || 10;

    // Invalidate container size so Leaflet knows dimensions
    map.invalidateSize();

    // Center on user on first acquisition
    if (!hasInitialCenteredRef.current) {
      map.setView([lat, lng], 17);
      hasInitialCenteredRef.current = true;
    }

    const popupHtml = `
      <div style="font-family: monospace; font-size: 12px; padding: 4px; min-width: 190px;">
        <strong style="color: #3b82f6; font-size: 13px;">📍 YOU (LIVE DEVICE LOCATION)</strong><br/>
        Latitude: <b>${lat.toFixed(6)}</b><br/>
        Longitude: <b>${lng.toFixed(6)}</b><br/>
        Accuracy: <b>${Math.round(currentAccuracy)} meters</b><br/>
        <span style="color: #10b981; font-size: 10px; font-weight: bold;">🟢 GPS FIX ACTIVE</span>
      </div>
    `;

    // Ensure User Marker exists on the active map
    if (!userMarkerRef.current || !map.hasLayer(userMarkerRef.current)) {
      const marker = L.marker([lat, lng], {
        icon: createUserLocationIcon(),
        zIndexOffset: 2000
      }).addTo(map);
      marker.bindPopup(popupHtml);
      userMarkerRef.current = marker;
    } else {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setPopupContent(popupHtml);
    }

    // Ensure Accuracy Halo Circle exists on the active map
    if (!accuracyCircleRef.current || !map.hasLayer(accuracyCircleRef.current)) {
      const circle = L.circle([lat, lng], {
        radius: Math.max(20, currentAccuracy),
        weight: 2,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15
      }).addTo(map);
      accuracyCircleRef.current = circle;
    } else {
      accuracyCircleRef.current.setLatLng([lat, lng]);
      accuracyCircleRef.current.setRadius(Math.max(20, currentAccuracy));
    }
  }, [userLocation, accuracy]);

  // Recenter Map on Button Trigger
  useEffect(() => {
    if (mapRef.current && userLocation) {
      const { lat, lng } = userLocation;
      mapRef.current.invalidateSize();
      mapRef.current.flyTo([lat, lng], 17, { duration: 0.8 });
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    }
  }, [recenterTrigger]);

  // Handle Active Incident / Disaster Marker & 100m Geofence Circle Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (incidentLocation && incidentLocation.lat && incidentLocation.lng) {
      const { lat, lng, type, severity } = incidentLocation;
      if (!incidentMarkerRef.current || !map.hasLayer(incidentMarkerRef.current)) {
        const marker = L.marker([lat, lng], { icon: disasterIcon, zIndexOffset: 1500 }).addTo(map);
        marker.bindPopup(
          `<div style="font-family: monospace; font-size: 12px; padding: 4px;">
            <strong style="color: #dc2626;">🔴 DISASTER INCIDENT LOCATION</strong><br/>
            Type: <b>${type || 'Emergency'}</b><br/>
            Severity: <b style="color: #ef4444;">${severity || 'CRITICAL'}</b><br/>
            Latitude: <b>${lat.toFixed(6)}</b><br/>
            Longitude: <b>${lng.toFixed(6)}</b>
          </div>`
        );
        incidentMarkerRef.current = marker;
      } else {
        incidentMarkerRef.current.setLatLng([lat, lng]);
      }

      // 100m Geofence Danger Circle
      if (!disasterCircleRef.current || !map.hasLayer(disasterCircleRef.current)) {
        const circle = L.circle([lat, lng], {
          radius: 100,
          weight: 2,
          color: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.2,
          dashArray: '6, 6'
        }).addTo(map);
        circle.bindPopup(
          `<div style="font-family: monospace; font-size: 11px; padding: 4px;">
            <strong style="color: #dc2626;">🚨 100m DISASTER DANGER GEOFENCE ZONE</strong><br/>
            Immediate danger perimeter. Follow official rescue team evacuation orders.
          </div>`
        );
        disasterCircleRef.current = circle;
      } else {
        disasterCircleRef.current.setLatLng([lat, lng]);
      }
    } else {
      if (incidentMarkerRef.current) {
        incidentMarkerRef.current.remove();
        incidentMarkerRef.current = null;
      }
      if (disasterCircleRef.current) {
        disasterCircleRef.current.remove();
        disasterCircleRef.current = null;
      }
    }
  }, [incidentLocation]);

  // Assigned Responder Units Live Movement Markers (Ambulance, Fire Brigade, Police)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    assignedUnits.forEach((unit) => {
      const unitLat = unit.location?.lat || unit.latitude;
      const unitLng = unit.location?.lng || unit.longitude;
      if (!unitLat || !unitLng) return;

      const key = unit.unitId || unit.id || unit.type;
      const icon = unit.type === 'AMBULANCE' ? ambulanceIcon : unit.type === 'FIRE_BRIGADE' ? fireIcon : policeIcon;

      if (!unitMarkersRef.current[key] || !map.hasLayer(unitMarkersRef.current[key])) {
        const marker = L.marker([unitLat, unitLng], { icon, zIndexOffset: 1200 }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: monospace; font-size: 12px; min-width: 200px; padding: 2px;">
            <b style="font-size: 13px; color: #38bdf8;">${unit.type === 'AMBULANCE' ? '🚑 AMBULANCE' : unit.type === 'FIRE_BRIGADE' ? '🚒 FIRE BRIGADE' : unit.type === 'POLICE' ? '🚓 POLICE' : '🛥️ RESCUE UNIT'}</b><br/>
            <span style="color: #94a3b8;">Vehicle ID:</span> <b>${unit.unitName || unit.vehicleNumber || key}</b><br/>
            <span style="color: #94a3b8;">Status:</span> <b style="color: #10b981;">${unit.status || 'EN_ROUTE'}</b>
          </div>
        `);
        unitMarkersRef.current[key] = marker;
      } else {
        unitMarkersRef.current[key].setLatLng([unitLat, unitLng]);
      }
    });
  }, [assignedUnits]);

  // Hospital Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    hospitalMarkersRef.current.forEach(m => m.remove());
    hospitalMarkersRef.current = [];

    const hospitalList = Array.isArray(hospitals) ? hospitals : (hospitals as any)?.hospitals || [];
    hospitalList.forEach((h: any) => {
      const lat = h.location?.lat || (h as any).latitude;
      const lng = h.location?.lng || (h as any).longitude;
      if (!lat || !lng) return;

      const marker = L.marker([lat, lng], { icon: hospitalIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 12px;">
          <b style="color: #10b981;">🏥 ${h.name}</b><br/>
          Beds Available: <b>${h.availableBeds}/${h.totalBeds}</b>
        </div>
      `);
      hospitalMarkersRef.current.push(marker);
    });
  }, [hospitals]);

  // Relief Camp Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    campMarkersRef.current.forEach(m => m.remove());
    campMarkersRef.current = [];

    camps.forEach(c => {
      if (!c.location?.lat || !c.location?.lng) return;
      const marker = L.marker([c.location.lat, c.location.lng], { icon: campIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 12px;">
          <b style="color: #06b6d4;">🛟 SHELTER: ${c.name}</b><br/>
          Occupancy: <b>${c.currentOccupants}/${c.capacity}</b>
        </div>
      `);
      campMarkersRef.current.push(marker);
    });
  }, [camps]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
      <div ref={mapContainerRef} style={{ width: '100%', height }} />
      {!userLocation && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center z-[1000] font-mono text-xs text-slate-300">
          <div className="space-y-2">
            <Compass className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
            <p className="font-extrabold text-sm text-white">Acquiring Physical Device Geolocation...</p>
            <p className="text-[11px] text-slate-400">Please grant browser location permissions when prompted.</p>
          </div>
        </div>
      )}
    </div>
  );
};
