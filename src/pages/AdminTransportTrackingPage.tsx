import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PatientTransport, Hospital, ResourceUnit, Incident } from '../types';
import { apiService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { LiveCommandMap } from '../components/map/LiveCommandMap';
import { Ambulance, Building2 as HospitalIcon, MapPin, ArrowLeft, Navigation, Shield, HeartPulse, Clock, Activity, Phone } from 'lucide-react';

export const AdminTransportTrackingPage: React.FC = () => {
  const { transportId } = useParams<{ transportId: string }>();
  const { socket } = useSocket();

  const [transport, setTransport] = useState<PatientTransport | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [ambLocation, setAmbLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransport = async () => {
      setLoading(true);
      const data = await apiService.getTransportById(transportId || 'tr_102');
      if (data) {
        setTransport(data);
        if (data.pickupLatitude && data.pickupLongitude) {
          setAmbLocation({
            lat: data.pickupLatitude,
            lng: data.pickupLongitude
          });
        }
        if (data.destinationHospitalId) {
          const hospData = await apiService.getNearbyHospitals(data.pickupLatitude, data.pickupLongitude);
          const found = hospData.find(h => h.id === data.destinationHospitalId);
          if (found) setHospital(found);
        }
      }
      setLoading(false);
    };
    loadTransport();
  }, [transportId]);


  useEffect(() => {
    if (!socket) return;
    socket.emit('join_transport_room', transportId);

    socket.on('ambulance_location_update', (telemetry: any) => {
      if (telemetry.transportId === transportId || !telemetry.transportId) {
        setAmbLocation({ lat: telemetry.latitude, lng: telemetry.longitude });
        setTransport(prev => prev ? {
          ...prev,
          speed: telemetry.speed || prev.speed,
          heading: telemetry.heading || prev.heading,
          distanceRemaining: telemetry.distanceRemaining || prev.distanceRemaining
        } : prev);
      }
    });

    socket.on('hospital_accepted', (data: any) => {
      setTransport(prev => prev ? { ...prev, status: 'HOSPITAL_ACCEPTED', hospitalStatus: 'ACCEPTED' } : prev);
    });

    socket.on('ambulance_transport_started', (data: any) => {
      setTransport(prev => prev ? { ...prev, status: 'EN_ROUTE_TO_HOSPITAL' } : prev);
    });

    socket.on('ambulance_arrived_hospital', (data: any) => {
      setTransport(prev => prev ? { ...prev, status: 'ARRIVED_AT_HOSPITAL' } : prev);
    });

    socket.on('patient_admitted', (data: any) => {
      setTransport(prev => prev ? { ...prev, status: 'COMPLETED', patientStatus: 'PATIENT_ADMITTED' } : prev);
    });

    socket.on('bed_availability_updated', (payload: any) => {
      if (hospital && payload.hospitalId === hospital.id) {
        setHospital((prev: any) => prev ? { ...prev, availableBeds: payload.availableBeds, availableEmergencyBeds: payload.availableEmergencyBeds } : prev);
      }
    });

    return () => {
      socket.off('ambulance_location_update');
      socket.off('hospital_accepted');
      socket.off('ambulance_transport_started');
      socket.off('ambulance_arrived_hospital');
      socket.off('patient_admitted');
      socket.off('bed_availability_updated');
    };
  }, [socket, transportId, hospital]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 font-mono text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p>CONNECTING TO AMBULANCE TELEMETRY SATELLITE HUB...</p>
      </div>
    );
  }

  const tr: PatientTransport = transport || {
    id: 'tr_102',
    transportId: 'TR-102',
    incidentId: 'inc_102',
    patientId: 'pat_102',
    patientName: 'John Doe (Victim #102)',
    ambulanceId: 'res_1',
    ambulanceName: 'Ambulance Express 01',
    pickupLatitude: 28.6280,
    pickupLongitude: 77.2050,
    pickupAddress: 'Sector 14 Commercial Complex',
    destinationHospitalId: 'hosp_1',
    destinationHospitalName: 'CityCare Emergency Hospital',
    destinationHospitalLocation: { lat: 28.5672, lng: 77.2100 },
    status: 'EN_ROUTE_TO_HOSPITAL',
    patientStatus: 'PATIENT_IN_TRANSIT',
    hospitalStatus: 'ACCEPTED',
    eta: '8 min',
    distanceRemaining: '3.4 km',
    speed: 48,
    heading: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mapIncidents: Incident[] = [{
    id: tr.id,
    incidentId: tr.transportId,
    title: `DESTINATION: ${tr.destinationHospitalName || 'Hospital'}`,
    disasterType: 'Medical Emergency',
    severity: 'Critical',
    priority: 1,
    status: 'In Progress',
    reporterName: tr.patientName,
    reporterPhone: '+1 555-0101',
    location: tr.destinationHospitalLocation ? { lat: tr.destinationHospitalLocation.lat, lng: tr.destinationHospitalLocation.lng, address: tr.destinationHospitalName || 'Hospital' } : { lat: 28.5672, lng: 77.2100, address: tr.destinationHospitalName || 'Hospital' },
    description: `Patient Transport ${tr.transportId} destination hospital.`,
    media: [],
    assignedResponders: [],
    createdAt: new Date().toISOString()
  }];


  const mapResources: ResourceUnit[] = [{
    id: tr.ambulanceId || 'amb_1',
    name: tr.ambulanceName || 'AMB-04',
    type: 'Ambulance',
    status: 'En Route',
    location: { lat: ambLocation?.lat || tr.pickupLatitude || 28.6139, lng: ambLocation?.lng || tr.pickupLongitude || 77.209, address: 'Ambulance Current Live Position' },
    etaMinutes: 8,
    capacity: 2,
    contactNumber: '+1 555-911-0000'
  }];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Link to="/operator" className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO COMMAND CENTER</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-mono font-extrabold uppercase">
            LIVE TELEMETRY HUB • TRANSPORT ID: {tr.transportId}
          </span>
        </div>
      </div>

      {/* Main Hero Status Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/90 via-slate-900 to-slate-950 border-2 border-blue-600/70 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 animate-pulse">
              <Ambulance className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">ACTIVE EMERGENCY PATIENT TRANSPORT</span>
              <h2 className="text-2xl font-extrabold text-white mt-0.5">{tr.patientName}</h2>
            </div>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-blue-950 text-blue-300 border border-blue-700 text-xs font-mono font-extrabold">
            STATUS: {tr.status}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">📍 PICKUP INCIDENT SCENE</span>
            <span className="text-slate-100 font-extrabold">{tr.pickupAddress}</span>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">🚑 AMBULANCE UNIT</span>
            <span className="text-blue-400 font-extrabold">{tr.ambulanceName} ({tr.speed || 48} km/h)</span>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-blue-500/40">
            <span className="text-blue-400 block text-[10px] uppercase font-bold">🏥 DESTINATION HOSPITAL</span>
            <span className="text-emerald-400 font-extrabold">{tr.destinationHospitalName || 'Searching...'}</span>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">⏱️ ESTIMATED HOSPITAL ARRIVAL</span>
            <span className="text-amber-400 font-extrabold">{tr.eta || '8 min'} ({tr.distanceRemaining || '3.4 km'})</span>
          </div>
        </div>
      </div>

      {/* Live Map & Hospital Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Large Command Map */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-blue-400 animate-pulse" />
            <span>Ambulance Live GPS & OSRM Hospital Route Map</span>
          </h3>
          <LiveCommandMap incidents={mapIncidents} resources={mapResources} height="480px" />
        </div>

        {/* Hospital Reserved Bed & Status Panel */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-lg text-white">Hospital Bed Telemetry</h3>

          {hospital ? (
            <div className="p-5 rounded-3xl bg-surface-card border border-slate-700 space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-extrabold text-sm text-emerald-400">{hospital.name}</h4>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                  BED RESERVED ✓
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Available Ward Beds:</span>
                  <span className="font-bold text-white text-sm">{hospital.availableBeds} / {hospital.totalBeds}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">ICU Beds Available:</span>
                  <span className="font-bold text-amber-400 text-sm">{hospital.availableICUBeds || (typeof hospital.icuBeds === 'object' ? (hospital.icuBeds as any)?.available : hospital.icuBeds) || 0}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Emergency Trauma Beds:</span>
                  <span className="font-bold text-emerald-400 text-sm">{hospital.availableEmergencyBeds || 7}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1 text-slate-400 text-[11px]">
                <p>Address: <b className="text-slate-200">{hospital.address}</b></p>
                <p>Emergency Contact: <b className="text-blue-400">{hospital.contactPhone}</b></p>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-surface-card border border-slate-800 text-center space-y-2">
              <Activity className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Awaiting hospital selection from ambulance crew...</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
