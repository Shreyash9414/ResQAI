import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PatientTransport, Hospital, ResourceUnit, Incident } from '../types';
import { apiService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { LiveCommandMap } from '../components/map/LiveCommandMap';
import { Ambulance, Building2 as HospitalIcon, MapPin, ArrowLeft, Navigation, Shield, HeartPulse, CheckCircle, Clock } from 'lucide-react';

export const CitizenTransportTrackingPage: React.FC = () => {
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
          distanceRemaining: telemetry.distanceRemaining || prev.distanceRemaining
        } : prev);
      }
    });

    socket.on('hospital_selected', (data: any) => {
      setTransport(prev => prev ? { ...prev, destinationHospitalName: data.destinationHospitalName, status: 'HOSPITAL_SELECTED' } : prev);
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
      socket.off('hospital_selected');
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
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p>CONNECTING TO CITIZEN PATIENT TRANSPORT TRACKING...</p>
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
    ambulanceName: 'AMB-04',
    pickupLatitude: 28.6280,
    pickupLongitude: 77.2050,
    pickupAddress: 'Sector 14 Commercial Complex',
    destinationHospitalId: 'hosp_1',
    destinationHospitalName: 'CityCare Emergency Hospital',
    destinationHospitalLocation: { lat: 28.5672, lng: 77.2100 },
    status: 'EN_ROUTE_TO_HOSPITAL',
    patientStatus: 'PATIENT_IN_TRANSIT',
    hospitalStatus: 'ACCEPTED',
    eta: '8 minutes',
    distanceRemaining: '3.4 km',
    speed: 48,
    heading: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const steps = [
    { label: 'Emergency reported', done: true },
    { label: 'Ambulance assigned', done: true },
    { label: 'Ambulance reached patient', done: true },
    { label: 'Patient picked up', done: tr.status !== 'AMBULANCE_ASSIGNED' },
    { label: 'Hospital selected', done: Boolean(tr.destinationHospitalName) },
    { label: 'Hospital accepted & Bed Reserved', done: tr.hospitalStatus === 'ACCEPTED' || tr.status === 'EN_ROUTE_TO_HOSPITAL' || tr.status === 'COMPLETED' },
    { label: 'Patient being transported', done: tr.status === 'EN_ROUTE_TO_HOSPITAL' || tr.status === 'ARRIVED_AT_HOSPITAL' || tr.status === 'COMPLETED', active: tr.status === 'EN_ROUTE_TO_HOSPITAL' },
    { label: 'Hospital arrival', done: tr.status === 'ARRIVED_AT_HOSPITAL' || tr.status === 'COMPLETED' },
    { label: 'Patient admitted', done: tr.status === 'COMPLETED' }
  ];

  const mapIncidents: Incident[] = [{
    id: tr.id,
    incidentId: tr.transportId,
    title: tr.destinationHospitalName || 'Destination Hospital',
    disasterType: 'Medical Emergency',
    severity: 'Critical',
    priority: 1,
    status: 'In Progress',
    reporterName: tr.patientName,
    reporterPhone: '+1 555-0101',
    location: tr.destinationHospitalLocation ? { lat: tr.destinationHospitalLocation.lat, lng: tr.destinationHospitalLocation.lng, address: tr.destinationHospitalName || 'Hospital' } : { lat: 28.5672, lng: 77.2100, address: tr.destinationHospitalName || 'Hospital' },
    description: 'Target Destination Hospital',
    media: [],
    assignedResponders: [],
    createdAt: new Date().toISOString()
  }];


  const mapResources: ResourceUnit[] = [{
    id: tr.ambulanceId || 'amb_1',
    name: tr.ambulanceName || 'AMB-04',
    type: 'Ambulance',
    status: 'En Route',
    location: { lat: ambLocation?.lat || tr.pickupLatitude || 28.6139, lng: ambLocation?.lng || tr.pickupLongitude || 77.209, address: 'Ambulance Position' },
    etaMinutes: 8,
    capacity: 2,
    contactNumber: '+1 555-911-0000'
  }];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO DASHBOARD</span>
        </Link>
        <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
          PATIENT LIVE TRACKING • ID: {tr.transportId}
        </span>
      </div>

      {/* Main Status Hero */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border-2 border-emerald-600 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 animate-pulse">
              <Ambulance className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">AMBULANCE LIVE PATIENT TRACKING</span>
              <h2 className="text-2xl font-extrabold text-white mt-0.5">{tr.patientName}</h2>
            </div>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-extrabold">
            STATUS: {tr.status}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">🚑 AMBULANCE UNIT</span>
            <span className="text-blue-400 font-extrabold">{tr.ambulanceName}</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-emerald-500/40">
            <span className="text-emerald-400 block text-[10px] uppercase font-bold">🏥 DESTINATION HOSPITAL</span>
            <span className="text-white font-extrabold">{tr.destinationHospitalName || 'Hospital Selected'}</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">⏱️ ESTIMATED ARRIVAL</span>
            <span className="text-amber-400 font-extrabold">{tr.eta || '8 minutes'} ({tr.distanceRemaining || '3.4 km'})</span>
          </div>
        </div>
      </div>

      {/* 8-Stage Timeline */}
      <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-4">
        <h3 className="font-extrabold text-base text-white font-mono uppercase">PATIENT TRANSPORT LIFECYCLE TIMELINE</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border font-mono text-[10px] flex flex-col justify-between transition-all ${
                st.done
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : st.active
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span>STAGE 0{idx + 1}</span>
                {st.done && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <span className="font-bold">{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Map & Hospital Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="font-extrabold text-lg text-white mb-3 flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span>Ambulance Live GIS Tracking Map</span>
          </h3>
          <LiveCommandMap incidents={mapIncidents} resources={mapResources} height="420px" />
        </div>

        {/* Hospital Details Card */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-lg text-white">Hospital Emergency Details</h3>

          {hospital ? (
            <div className="p-5 rounded-3xl bg-surface-card border border-slate-700 space-y-3 font-mono text-xs">
              <h4 className="font-extrabold text-sm text-emerald-400">{hospital.name}</h4>
              <p className="text-slate-300 text-[11px]">{hospital.address}</p>

              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 font-bold text-center">
                EMERGENCY BED RESERVED ✓
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">AVAILABLE WARD BEDS</span>
                  <span className="font-bold text-white text-sm">{hospital.availableBeds}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">ICU BEDS AVAILABLE</span>
                  <span className="font-bold text-amber-400 text-sm">{hospital.availableICUBeds || 8}</span>
                </div>
              </div>

              <p className="text-slate-400 text-[10px] pt-1">Emergency Contact: <b className="text-white">{hospital.contactPhone}</b></p>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-surface-card border border-slate-800 text-center text-xs text-slate-400 font-mono">
              Connecting to target hospital telemetry...
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
