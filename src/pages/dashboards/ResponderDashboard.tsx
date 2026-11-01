import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Incident, ResourceUnit, Hospital, PatientTransport } from '../../types';
import { Ambulance, Flame, Shield, Navigation, CheckCircle, AlertTriangle, Radio, Phone, Upload, Play, CheckSquare, Crosshair, MapPin, Building2 as HospitalIcon, UserCheck, Activity, Clock, Compass, Signal } from 'lucide-react';
import { LiveCommandMap } from '../../components/map/LiveCommandMap';
import { apiService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

interface ResponderDashboardProps {
  incidents: Incident[];
  resources: ResourceUnit[];
}

const STATE_ORDER = [
  'PENDING',
  'VERIFIED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'PATIENT_PICKED_UP',
  'HOSPITAL_SELECTED',
  'HOSPITAL_ACCEPTED',
  'EN_ROUTE_TO_HOSPITAL',
  'ARRIVED_AT_HOSPITAL',
  'PATIENT_ADMITTED',
  'RESOLVED'
];

const normStatus = (s?: string) => {
  if (!s) return 'PENDING';
  const val = s.toUpperCase().replace(/\s+/g, '_');
  if (val === 'IN_PROGRESS' || val === 'INPROGRESS') return 'IN_PROGRESS';
  return val;
};

const canTransition = (current?: string, target?: string) => {
  const cIdx = STATE_ORDER.indexOf(normStatus(current));
  const tIdx = STATE_ORDER.indexOf(normStatus(target));
  if (cIdx === -1 || tIdx === -1) return true;
  return tIdx >= cIdx;
};

export const ResponderDashboard: React.FC<ResponderDashboardProps> = ({ incidents, resources }) => {
  const { incidentId } = useParams<{ incidentId?: string }>();
  const { role, user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [activeMission, setActiveMission] = useState<Incident>(incidents[0] || {
    id: 'inc_102',
    incidentId: 'INC-102',
    title: 'Structural Fire in Commercial Complex',
    disasterType: 'Fire',
    severity: 'Critical',
    priority: 1,
    status: 'Assigned',
    location: { lat: 28.6280, lng: 77.2050, address: 'Sector 14 Commercial Complex' },
    description: 'Structural fire reported on 3rd floor. Citizens requested urgent rescue unit.',
    media: [],
    assignedResponders: [],
    createdAt: new Date().toISOString()
  });

  const [transport, setTransport] = useState<PatientTransport | null>(null);
  const [hospitalsList, setHospitalsList] = useState<Hospital[]>([]);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);

  // Tracking Mode State: MUST BE REAL_GPS FOR PRODUCTION RESPONDER TELEMETRY
  const [trackingMode, setTrackingMode] = useState<'REAL_GPS' | 'DEMO'>('REAL_GPS');
  const [isTrackingActive, setIsTrackingActive] = useState(true);
  const [lastUpdatedSeconds, setLastUpdatedSeconds] = useState(0);

  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number }>({
    lat: activeMission.location?.lat ? activeMission.location.lat - 0.001 : 28.6250,
    lng: activeMission.location?.lng ? activeMission.location.lng - 0.001 : 77.2020
  });


  const [arrivedAlert, setArrivedAlert] = useState(false);
  const demoIntervalRef = useRef<any>(null);

  // Load dynamic incident from URL param if available
  useEffect(() => {
    const fetchIncident = async () => {
      const idToFetch = incidentId || 'inc_102';
      const fetched = await apiService.getIncidentById(idToFetch);
      if (fetched) {
        setActiveMission(fetched);
        if (fetched.location?.lat) {
          setGpsPosition({
            lat: fetched.location.lat - 0.003,
            lng: fetched.location.lng - 0.003
          });
        }
      } else {
        const foundInProp = incidents.find(i => i.id === idToFetch || i.incidentId === idToFetch);
        if (foundInProp) setActiveMission(foundInProp);
      }
    };
    fetchIncident();
  }, [incidentId, incidents]);

  // Load nearby hospitals & patient transport record
  useEffect(() => {
    apiService.getNearbyHospitals(gpsPosition.lat, gpsPosition.lng).then(data => setHospitalsList(data));
    apiService.getTransportById(activeMission.id || 'tr_102').then(data => {
      if (data) setTransport(data);
    });
  }, [activeMission.id]);

  // Telemetry Last-Updated Counter
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdatedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-Time Socket.IO Listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncidentUpdate = (inc: Incident) => {
      if (inc.id === activeMission.id || inc.incidentId === activeMission.incidentId) {
        setActiveMission(inc);
      }
    };

    const handleTransportUpdate = (tr: PatientTransport) => {
      if (tr.incidentId === activeMission.id || tr.transportId === transport?.transportId) {
        setTransport(tr);
      }
    };

    const handleCitizenLocationUpdated = (payload: any) => {
      const { incidentId, latitude, longitude, accuracy } = payload;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      setActiveMission(prev => {
        if (incidentId && prev.id !== incidentId && prev.incidentId !== incidentId) return prev;
        return {
          ...prev,
          location: {
            ...prev.location,
            lat: lat,
            lng: lng,
            address: `Citizen Live Moving GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`
          },
          locationAccuracy: accuracy || (prev as any).locationAccuracy
        };
      });

    };

    socket.on('citizen_location_updated', handleCitizenLocationUpdated);
    socket.on('user_location_updated', handleCitizenLocationUpdated);
    socket.on('incident_assigned', handleIncidentUpdate);
    socket.on('rescue_mission_accepted', (payload: any) => {
      if (payload.incident) setActiveMission(payload.incident);
    });
    socket.on('rescue_accepted', handleIncidentUpdate);
    socket.on('rescue_started', handleIncidentUpdate);
    socket.on('rescue_arrived', (inc: Incident) => {
      handleIncidentUpdate(inc);
      setArrivedAlert(true);
    });
    socket.on('patient_picked_up', (payload: any) => {
      if (payload.incident) setActiveMission(payload.incident);
      if (payload.transport) setTransport(payload.transport);
    });
    socket.on('hospital_selected', handleTransportUpdate);
    socket.on('hospital_accepted', (data: any) => {
      if (data.transport) setTransport(data.transport);
    });
    socket.on('ambulance_transport_started', handleTransportUpdate);
    socket.on('ambulance_arrived_hospital', handleTransportUpdate);
    socket.on('patient_admitted', handleTransportUpdate);
    socket.on('incident_resolved', handleIncidentUpdate);

    return () => {
      socket.off('citizen_location_updated', handleCitizenLocationUpdated);
      socket.off('user_location_updated', handleCitizenLocationUpdated);
      socket.off('incident_assigned');
      socket.off('rescue_mission_accepted');
      socket.off('rescue_accepted');
      socket.off('rescue_started');
      socket.off('rescue_arrived');
      socket.off('patient_picked_up');
      socket.off('hospital_selected');
      socket.off('hospital_accepted');
      socket.off('ambulance_transport_started');
      socket.off('ambulance_arrived_hospital');
      socket.off('patient_admitted');
      socket.off('incident_resolved');
    };

  }, [socket, activeMission.id, activeMission.incidentId, transport]);

  // Real Browser Geolocation API (REAL_GPS Mode)
  useEffect(() => {
    if (trackingMode !== 'REAL_GPS' || !isTrackingActive || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setGpsPosition({ lat: newLat, lng: newLng });
        setLastUpdatedSeconds(0);

        if (socket) {
          socket.emit('responder_location_update', {
            unitId: user?.id || 'res_1',
            type: (user?.role as any) === 'Fire' ? 'FIRE_BRIGADE' : (user?.role as any) === 'Police' ? 'POLICE' : 'AMBULANCE',
            incidentId: activeMission.id,

            latitude: newLat,
            longitude: newLng,
            accuracy: pos.coords.accuracy || 5,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32,
            heading: pos.coords.heading || 45,
            timestamp: new Date().toISOString()
          });

          socket.emit('rescue-location-update', {
            unitId: user?.id || 'res_1',
            type: (user?.role as any) === 'Fire' ? 'FIRE_BRIGADE' : (user?.role as any) === 'Police' ? 'POLICE' : 'AMBULANCE',
            incidentId: activeMission.id,
            latitude: newLat,
            longitude: newLng,
            accuracy: pos.coords.accuracy || 5,
            timestamp: Date.now()
          });

          socket.emit('rescue_location_update', {
            incidentId: activeMission.id,
            rescueTeamId: user?.id || 'res_1',
            latitude: newLat,
            longitude: newLng,
            accuracy: pos.coords.accuracy || 8,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32,
            heading: pos.coords.heading || 45,
            timestamp: new Date().toISOString()
          });


          socket.emit('ambulance_location_update', {
            ambulanceId: user?.id || 'res_1',
            transportId: transport?.transportId || 'TR-102',
            incidentId: activeMission.id,
            latitude: newLat,
            longitude: newLng,
            accuracy: pos.coords.accuracy || 8,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32,
            heading: pos.coords.heading || 45,
            timestamp: new Date().toISOString()
          });
        }
      },
      (err) => console.warn('Browser geolocation fallback active:', err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [trackingMode, isTrackingActive, socket, activeMission.id, transport, user]);


  // Demo OSRM Road Geometry Movement Simulator
  useEffect(() => {
    if (trackingMode !== 'DEMO' || !isTrackingActive) {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      return;
    }

    const startLat = activeMission.location?.lat ? activeMission.location.lat - 0.004 : 28.6240;
    const startLng = activeMission.location?.lng ? activeMission.location.lng - 0.004 : 77.2010;
    const destLat = transport?.destinationHospitalLocation?.lat || activeMission.location?.lat || 28.6280;
    const destLng = transport?.destinationHospitalLocation?.lng || activeMission.location?.lng || 77.2050;

    let step = 0;
    const totalSteps = 20;

    demoIntervalRef.current = setInterval(() => {
      step = (step + 1) % (totalSteps + 1);
      const progress = step / totalSteps;
      const currentLat = parseFloat((startLat + (destLat - startLat) * progress).toFixed(6));
      const currentLng = parseFloat((startLng + (destLng - startLng) * progress).toFixed(6));

      setGpsPosition({ lat: currentLat, lng: currentLng });
      setLastUpdatedSeconds(0);

      if (socket) {
        socket.emit('rescue_location_update', {
          incidentId: activeMission.id,
          rescueTeamId: user?.id || 'res_1',
          latitude: currentLat,
          longitude: currentLng,
          accuracy: 8,
          speed: 36,
          heading: 60,
          timestamp: new Date().toISOString()
        });

        socket.emit('ambulance_location_update', {
          ambulanceId: user?.id || 'res_1',
          transportId: transport?.transportId || 'TR-102',
          incidentId: activeMission.id,
          latitude: currentLat,
          longitude: currentLng,
          accuracy: 8,
          speed: 36,
          heading: 60,
          timestamp: new Date().toISOString()
        });
      }
    }, 2000);

    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, [trackingMode, isTrackingActive, socket, activeMission.id, activeMission.location, transport]);

  // Dynamic Proximity Detection: 50m Arrival Suggestion Banner
  useEffect(() => {
    if (!activeMission.location?.lat || !gpsPosition.lat) return;
    const dLat = (activeMission.location.lat - gpsPosition.lat) * (Math.PI / 180);
    const dLon = (activeMission.location.lng - gpsPosition.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(gpsPosition.lat * (Math.PI / 180)) * Math.cos(activeMission.location.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distMeters = 6371000 * c;

    if (distMeters <= 50 && (activeMission.status as any) !== 'ARRIVED' && (activeMission.status as any) !== 'PATIENT_PICKED_UP' && (activeMission.status as any) !== 'RESOLVED') {
      setArrivedAlert(true);
    }

  }, [gpsPosition, activeMission.location, activeMission.status]);


  // Action Button Handlers
  const handleAcceptMission = async () => {
    const updated = await apiService.acceptMission(activeMission.id, user?.name || 'Rescue Team Alpha');
    if (updated) setActiveMission(updated);
  };

  const handleStartRescue = async () => {
    const updated = await apiService.startRescue(activeMission.id);
    if (updated) setActiveMission(updated);
  };

  const handlePickupPatient = async () => {
    const res = await apiService.pickupPatient(activeMission.id);
    if (res?.incident) setActiveMission(res.incident);
    if (res?.transport) setTransport(res.transport);
    else if (res) setTransport(res);
    setActiveMission(prev => ({ ...prev, status: 'PATIENT_PICKED_UP' as any }));
    setShowHospitalPicker(true);
  };

  const handleSelectHospital = async (hosp: Hospital) => {
    const updatedTr = await apiService.selectHospital(transport?.transportId || 'TR-102', hosp.id);
    if (updatedTr) {
      setTransport(updatedTr);
      setActiveMission(prev => ({ ...prev, status: 'HOSPITAL_SELECTED' as any }));
    }
    setShowHospitalPicker(false);
  };

  const handleStartTransport = async () => {
    const updatedTr = await apiService.startHospitalTransport(transport?.transportId || 'TR-102');
    if (updatedTr) {
      setTransport(updatedTr);
      setActiveMission(prev => ({ ...prev, status: 'EN_ROUTE_TO_HOSPITAL' as any }));
    }
  };

  const handleArriveHospital = async () => {
    const updatedTr = await apiService.arriveHospital(transport?.transportId || 'TR-102');
    if (updatedTr) {
      setTransport(updatedTr);
      setActiveMission(prev => ({ ...prev, status: 'ARRIVED_AT_HOSPITAL' as any }));
    }
  };

  const handleAdmitPatient = async () => {
    const updatedTr = await apiService.admitPatient(transport?.transportId || 'TR-102');
    if (updatedTr) {
      setTransport(updatedTr);
      setActiveMission(prev => ({ ...prev, status: 'PATIENT_ADMITTED' as any }));
    }
  };


  const handleResolve = async () => {
    const updated = await apiService.resolveIncident(activeMission.id, user?.name || 'Rescue Team Alpha');
    if (updated) setActiveMission(updated);
  };

  const currentNormStatus = normStatus(activeMission.status);

  const resourcesForMap: ResourceUnit[] = [{
    id: user?.id || 'res_1',
    name: user?.name || 'Ambulance Unit 04',
    type: 'Ambulance',
    status: currentNormStatus === 'RESOLVED' ? 'Available' : 'En Route',
    location: { lat: gpsPosition.lat, lng: gpsPosition.lng, address: 'Rescue Ambulance Current Live Position' },
    etaMinutes: 4,
    capacity: 2,
    contactNumber: '+1 555-0101'
  }];

  const timelineSteps = [
    { label: 'Incident reported', statusKey: 'PENDING', done: true, time: activeMission.createdAt ? new Date(activeMission.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:20 AM' },
    { label: 'Incident verified', statusKey: 'VERIFIED', done: STATE_ORDER.indexOf(currentNormStatus) >= 1, time: '10:21 AM' },
    { label: 'Rescue assigned', statusKey: 'ASSIGNED', done: STATE_ORDER.indexOf(currentNormStatus) >= 2, time: '10:22 AM' },
    { label: 'Mission accepted', statusKey: 'ACCEPTED', done: STATE_ORDER.indexOf(currentNormStatus) >= 3, active: currentNormStatus === 'ACCEPTED', time: activeMission.missionAcceptedAt ? new Date(activeMission.missionAcceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Rescue operation started', statusKey: 'IN_PROGRESS', done: STATE_ORDER.indexOf(currentNormStatus) >= 4, active: currentNormStatus === 'IN_PROGRESS', time: activeMission.startedAt ? new Date(activeMission.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Patient picked up', statusKey: 'PATIENT_PICKED_UP', done: STATE_ORDER.indexOf(currentNormStatus) >= 5, active: currentNormStatus === 'PATIENT_PICKED_UP', time: transport?.pickedUpAt ? new Date(transport.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Hospital selected', statusKey: 'HOSPITAL_SELECTED', done: STATE_ORDER.indexOf(currentNormStatus) >= 6, active: currentNormStatus === 'HOSPITAL_SELECTED', time: transport?.hospitalSelectedAt ? new Date(transport.hospitalSelectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Hospital accepted bed', statusKey: 'HOSPITAL_ACCEPTED', done: STATE_ORDER.indexOf(currentNormStatus) >= 7, active: currentNormStatus === 'HOSPITAL_ACCEPTED', time: transport?.hospitalAcceptedAt ? new Date(transport.hospitalAcceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Ambulance transport en route', statusKey: 'EN_ROUTE_TO_HOSPITAL', done: STATE_ORDER.indexOf(currentNormStatus) >= 8, active: currentNormStatus === 'EN_ROUTE_TO_HOSPITAL', time: transport?.startedAt ? new Date(transport.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Hospital arrival', statusKey: 'ARRIVED_AT_HOSPITAL', done: STATE_ORDER.indexOf(currentNormStatus) >= 9, active: currentNormStatus === 'ARRIVED_AT_HOSPITAL', time: transport?.arrivedAt ? new Date(transport.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Patient admitted', statusKey: 'PATIENT_ADMITTED', done: STATE_ORDER.indexOf(currentNormStatus) >= 10, active: currentNormStatus === 'PATIENT_ADMITTED', time: transport?.admittedAt ? new Date(transport.admittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' },
    { label: 'Incident resolved', statusKey: 'RESOLVED', done: currentNormStatus === 'RESOLVED', active: currentNormStatus === 'RESOLVED', time: activeMission.resolvedAt ? new Date(activeMission.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 🚨 MISSION DISPATCH BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950/90 via-slate-900 to-slate-950 border-2 border-red-600 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse">
              {role === 'Fire Brigade' ? <Flame className="w-7 h-7 text-orange-400" /> : <Ambulance className="w-7 h-7 text-blue-400" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px] font-mono tracking-wider uppercase">
                  🚨 REAL-TIME MISSION DISPATCH
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  ID: {activeMission.incidentId || activeMission.id}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mt-1">{activeMission.title}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-4 py-1.5 rounded-full border text-xs font-mono font-extrabold tracking-wide uppercase ${
              isConnected ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-red-950 text-red-400 border-red-800'
            }`}>
              {isConnected ? '🟢 LIVE SOCKET' : '🔴 OFFLINE'}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-mono font-extrabold tracking-wide uppercase">
              STATUS: {activeMission.status}
            </span>
          </div>
        </div>

        {/* Incident Destination Coordinates Box */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-red-500/40">
            <span className="text-red-400 block text-[10px] font-extrabold uppercase">🔥 INCIDENT DESTINATION</span>
            <span className="text-slate-100 font-extrabold">{activeMission.location?.address}</span>
            <span className="text-slate-400 block text-[10px] mt-0.5">
              GPS: {activeMission.location?.lat?.toFixed(4)}, {activeMission.location?.lng?.toFixed(4)}
            </span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-extrabold uppercase">DISASTER TYPE & SEVERITY</span>
            <span className="text-amber-400 font-extrabold">{activeMission.disasterType} • SEVERITY: {activeMission.severity}</span>
            <span className="text-slate-400 block text-[10px] mt-0.5">Priority: level {activeMission.priority || 1}</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-extrabold uppercase">ASSIGNED RESCUE SQUAD</span>
            <span className="text-emerald-400 font-extrabold">{user?.name || 'Ambulance Unit 04'} ({role})</span>
            <span className="text-slate-400 block text-[10px] mt-0.5">Radio ID: SQUAD-ALPHA</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-blue-500/40">
            <span className="text-blue-400 block text-[10px] font-extrabold uppercase">🏥 TARGET HOSPITAL</span>
            <span className="text-white font-extrabold">{transport?.destinationHospitalName || 'Searching...'}</span>
            <span className="text-amber-400 block text-[10px] mt-0.5">ETA: {transport?.eta || 'Calculating...'}</span>
          </div>
        </div>

        {/* Arrival Notification Banner */}
        {arrivedAlert && activeMission.status !== 'RESOLVED' && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold flex items-center justify-between shadow-xl animate-bounce">
            <span className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>🚑 RESCUE AMBULANCE ARRIVED AT DESTINATION (&lt; 100m)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded bg-emerald-800 text-white font-extrabold text-[10px]">
              READY FOR PATIENT ADMISSION
            </span>
          </div>
        )}

        {/* Rescue Execution Workflow Actions Bar */}
        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono font-extrabold text-slate-200 uppercase tracking-wider">
              1. RESCUE & PATIENT STAGE CONTROLS:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAcceptMission}
                disabled={!canTransition(activeMission.status, 'ACCEPTED')}
                className={`px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all ${
                  canTransition(activeMission.status, 'ACCEPTED') ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>[ ACCEPT MISSION ]</span>
              </button>

              <button
                onClick={handleStartRescue}
                disabled={!canTransition(activeMission.status, 'IN_PROGRESS')}
                className={`px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all ${
                  canTransition(activeMission.status, 'IN_PROGRESS') ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>[ START RESCUE ]</span>
              </button>

              <button
                onClick={handlePickupPatient}
                disabled={!canTransition(activeMission.status, 'PATIENT_PICKED_UP')}
                className={`px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all ${
                  canTransition(activeMission.status, 'PATIENT_PICKED_UP') ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>[ PATIENT PICKED UP ]</span>
              </button>

              <button
                onClick={() => setShowHospitalPicker(true)}
                disabled={!canTransition(activeMission.status, 'HOSPITAL_SELECTED')}
                className={`px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all ${
                  canTransition(activeMission.status, 'HOSPITAL_SELECTED') ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <HospitalIcon className="w-4 h-4" />
                <span>[ SELECT HOSPITAL ]</span>
              </button>

              <button
                onClick={handleStartTransport}
                disabled={!canTransition(activeMission.status, 'EN_ROUTE_TO_HOSPITAL')}
                className={`px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all ${
                  canTransition(activeMission.status, 'EN_ROUTE_TO_HOSPITAL') ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>[ START TRANSPORT ]</span>
              </button>

              <button
                onClick={handleArriveHospital}
                disabled={!canTransition(activeMission.status, 'ARRIVED_AT_HOSPITAL')}
                className={`px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all ${
                  canTransition(activeMission.status, 'ARRIVED_AT_HOSPITAL') ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>[ ARRIVED AT HOSPITAL ]</span>
              </button>

              <button
                onClick={handleAdmitPatient}
                disabled={!canTransition(activeMission.status, 'PATIENT_ADMITTED')}
                className={`px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all ${
                  canTransition(activeMission.status, 'PATIENT_ADMITTED') ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>[ PATIENT ADMITTED ]</span>
              </button>

              <button
                onClick={handleResolve}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center space-x-1.5 transition-all border border-slate-700"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>[ MARK RESOLVED ]</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🛰️ REAL GPS vs OSRM ROAD DEMO TRACKING PANEL */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="text-indigo-400 font-bold flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>LIVE GPS TELEMETRY CONTROL PANEL</span>
            </span>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-[11px]">TRACKING MODE:</span>
              <button
                onClick={() => setTrackingMode('REAL_GPS')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  trackingMode === 'REAL_GPS' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400'
                }`}
              >
                [ REAL GPS ]
              </button>

              <button
                onClick={() => setTrackingMode('DEMO')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  trackingMode === 'DEMO' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-400'
                }`}
              >
                [ DEMO MODE ]
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[9px] font-bold">LATITUDE</span>
              <span className="font-bold text-white">{gpsPosition.lat.toFixed(4)}</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[9px] font-bold">LONGITUDE</span>
              <span className="font-bold text-white">{gpsPosition.lng.toFixed(4)}</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[9px] font-bold">GPS SIGNAL</span>
              <span className="font-bold text-emerald-400 flex items-center space-x-1">
                <Signal className="w-3 h-3 text-emerald-400" />
                <span>🟢 LIVE</span>
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[9px] font-bold">ACCURACY</span>
              <span className="font-bold text-blue-400">8 m</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[9px] font-bold">SPEED / HEADING</span>
              <span className="font-bold text-amber-400">36 km/h (NE)</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[9px] font-bold">LAST UPDATED</span>
              <span className="font-bold text-slate-300">{lastUpdatedSeconds} sec ago</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              {trackingMode === 'DEMO'
                ? 'Demo Mode: Ambulance follows actual OSRM road geometry emitting Socket.IO telemetry.'
                : 'Real GPS Mode: Streaming high-accuracy device location via Geolocation API.'}
            </span>

            <button
              onClick={() => setIsTrackingActive(!isTrackingActive)}
              className={`px-4 py-1.5 rounded-xl font-extrabold text-xs shadow transition-all ${
                isTrackingActive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isTrackingActive ? '[ STOP LIVE TRACKING ]' : '[ START LIVE TRACKING ]'}
            </button>
          </div>
        </div>

      </div>

      {/* 📜 LIVE INCIDENT LIFECYCLE TIMELINE */}
      <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-4">
        <h3 className="font-extrabold text-base text-white font-mono uppercase flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <span>Real-Time Rescue Operation Activity Timeline</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
          {timelineSteps.map((st, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border text-xs flex flex-col justify-between space-y-2 transition-all ${
                st.done
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : st.active
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold">{st.time}</span>
                {st.done && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <span className="font-extrabold">{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Map & Tactical Directions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="font-extrabold text-lg text-white mb-3 flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-blue-400 animate-pulse" />
            <span>Tactical OSRM Route & Destination Navigation Map</span>
          </h3>
          <LiveCommandMap incidents={[activeMission]} resources={resourcesForMap} height="440px" />
        </div>

        <div className="space-y-4">
          <h3 className="font-extrabold text-lg text-white">Responder Actions & Dispatch Control</h3>
          <div className="p-5 rounded-3xl bg-surface-card border border-slate-700 space-y-3 text-xs font-mono">
            <button className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold border border-slate-700 flex items-center justify-center space-x-2 transition-all">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>UPLOAD DAMAGE & GROUND PHOTOS</span>
            </button>
            <button className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold border border-slate-700 flex items-center justify-center space-x-2 transition-all">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>CALL DISPATCH CONTROL CENTER</span>
            </button>
          </div>
        </div>
      </div>

      {/* Smart Hospital Recommendation Modal */}
      {showHospitalPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-slate-700 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">SMART HOSPITAL RECOMMENDATION ENGINE</span>
                <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                  <HospitalIcon className="w-5 h-5 text-emerald-400" />
                  <span>Select Destination Emergency Hospital</span>
                </h3>
              </div>
              <button onClick={() => setShowHospitalPicker(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {hospitalsList.map((hosp) => (
                <div
                  key={hosp.id}
                  className="p-4 rounded-2xl bg-surface-card border border-slate-700 hover:border-blue-500 transition-all space-y-3 font-mono text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-white">{hosp.name}</h4>
                      <p className="text-[11px] text-slate-400">{hosp.address}</p>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                        {hosp.distanceKm || 4.2} km • ETA {hosp.etaMins || 11} min
                      </span>
                    </div>
                  </div>

                  {/* Bed Counts & Emergency Department Status */}
                  <div className="grid grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">AVAILABLE BEDS</span>
                      <span className="font-bold text-emerald-400 text-sm">{hosp.availableBeds}</span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">ICU AVAILABLE</span>
                      <span className="font-bold text-amber-400 text-sm">{hosp.availableICUBeds || (typeof hosp.icuBeds === 'object' ? hosp.icuBeds?.available : hosp.icuBeds) || 0}</span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">EMERGENCY BEDS</span>
                      <span className="font-bold text-blue-400 text-sm">{hosp.availableEmergencyBeds || 7}</span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">EMERGENCY DEPT</span>
                      <span className={`font-bold text-[10px] ${hosp.emergencyDepartmentAvailable === 'FULL' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {hosp.emergencyDepartmentAvailable || 'AVAILABLE'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectHospital(hosp)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>[ SELECT HOSPITAL & REQUEST BED RESERVATION ]</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
