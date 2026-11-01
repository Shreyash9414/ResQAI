import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Incident, ResourceUnit } from '../types';

import { apiService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { LiveCommandMap } from '../components/map/LiveCommandMap';
import { ShieldAlert, CheckCircle, Clock, Navigation, MapPin, AlertTriangle, UserCheck, ArrowLeft, PhoneCall, Radio } from 'lucide-react';

export const CitizenTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { socket } = useSocket();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [rescueLocation, setRescueLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial incident data
  useEffect(() => {
    if (!id) return;
    apiService.getIncidentById(id).then((data) => {
      if (data) {
        setIncident(data);
        if (data.assignedTeam?.currentLocation) {
          setRescueLocation(data.assignedTeam.currentLocation);
        } else if (data.location) {
          setRescueLocation({ lat: data.location.lat - 0.005, lng: data.location.lng - 0.005 });
        }
        if ((data as any).activityTimeline) {
          setActivities((data as any).activityTimeline);
        }
      }
      setLoading(false);
    });
  }, [id]);

  // Socket room join & live updates
  useEffect(() => {
    if (!socket || !id) return;

    // Join room for this specific incident
    socket.emit('join_incident_room', id);

    socket.on('incident_verified', (updated: Incident) => {
      if (updated.id === id || updated.incidentId === id) setIncident(updated);
    });

    socket.on('incident_assigned', (updated: Incident) => {
      if (updated.id === id || updated.incidentId === id) setIncident(updated);
    });

    socket.on('rescue_accepted', (updated: Incident) => {
      if (updated.id === id || updated.incidentId === id) setIncident(updated);
    });

    socket.on('rescue_started', (updated: Incident) => {
      if (updated.id === id || updated.incidentId === id) setIncident(updated);
    });

    socket.on('rescue_location_updated', (loc: any) => {
      if (loc.incidentId === id || loc.incidentId === incident?.id || loc.incidentId === incident?.incidentId) {
        setRescueLocation({ lat: loc.latitude, lng: loc.longitude });
      }
    });

    socket.on('incident_resolved', (updated: Incident) => {
      if (updated.id === id || updated.incidentId === id) setIncident(updated);
    });

    socket.on('activity_logged', (act: any) => {
      if (act.incidentId === id || act.incidentId === incident?.id || act.incidentId === incident?.incidentId) {
        setActivities((prev) => [act, ...prev]);
      }
    });

    return () => {
      socket.emit('leave_incident_room', id);
      socket.off('incident_verified');
      socket.off('incident_assigned');
      socket.off('rescue_accepted');
      socket.off('rescue_started');
      socket.off('rescue_location_updated');
      socket.off('incident_resolved');
      socket.off('activity_logged');
    };
  }, [socket, id, incident]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 font-mono text-slate-400">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p>CONNECTING TO LIVE DISASTER DISPATCH SYSTEM...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-surface-card border border-slate-800 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Emergency Report Not Found</h2>
        <p className="text-sm text-slate-400">We could not locate incident ID "{id}". Please check your tracking ID or return to the main dashboard.</p>
        <Link to="/dashboard" className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO DASHBOARD</span>
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'Submitted', label: 'Report Submitted', done: true, time: incident.createdAt },
    { key: 'Verified', label: 'Report Verified', done: incident.status !== 'Pending', time: incident.verifiedAt },
    { key: 'Assigned', label: 'Rescue Team Assigned', done: incident.status === 'Assigned' || incident.status === 'In Progress' || incident.status === 'Resolved', time: incident.assignedAt },
    { key: 'Accepted', label: 'Mission Accepted', done: Boolean(incident.missionAcceptedAt) || incident.status === 'In Progress' || incident.status === 'Resolved', time: incident.missionAcceptedAt },
    { key: 'EnRoute', label: 'Rescue Team On The Way', done: incident.status === 'In Progress' || incident.status === 'Resolved', active: incident.status === 'In Progress' && !(incident as any).arrivalStatus, time: incident.startedAt },
    { key: 'Arrived', label: 'Rescue Team Arrived', done: Boolean((incident as any).arrivalStatus === 'ARRIVED') || incident.status === 'Resolved', active: (incident as any).arrivalStatus === 'ARRIVED', time: (incident as any).arrivedAt },
    { key: 'InProgress', label: 'Rescue Operation In Progress', done: incident.status === 'In Progress' || incident.status === 'Resolved', active: incident.status === 'In Progress', time: incident.startedAt },
    { key: 'Resolved', label: 'Incident Resolved', done: incident.status === 'Resolved', active: incident.status === 'Resolved', time: incident.resolvedAt }
  ];


  const resourcesForMap: ResourceUnit[] = incident.assignedTeam ? [{
    id: incident.assignedTeam.id || 'res_1',
    name: incident.assignedTeam.name || 'Assigned Rescue Unit',
    type: (incident.assignedTeam.type as any) || 'Ambulance',
    status: incident.status === 'Resolved' ? 'Available' : 'En Route',
    location: rescueLocation ? { lat: rescueLocation.lat, lng: rescueLocation.lng, address: 'Live Rescue GPS Location' } : incident.location,
    etaMinutes: 3,
    capacity: 4,
    contactNumber: incident.assignedTeam.phone || '+1 555-0101'
  }] : [];


  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center space-x-2 text-xs font-bold font-mono text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO DASHBOARD</span>
        </Link>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-950/80 text-red-400 font-mono text-xs border border-red-800">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>LIVE TRACKING DISPATCH HUB</span>
        </div>
      </div>

      {/* Incident Hero Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-[#0a0f1d] border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="px-3 py-1 rounded-lg bg-red-950 text-red-300 border border-red-800 text-xs font-mono font-bold">
              ID: {incident.incidentId || incident.id}
            </span>
            <span className="px-3 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 text-xs font-mono font-bold">
              {incident.disasterType} • SEVERITY: {incident.severity}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{incident.title}</h1>
          <p className="text-xs text-slate-400 font-mono mt-1 flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{incident.location?.address}</span>
          </p>
        </div>

        {/* Dynamic Status Badge */}
        <div className="px-6 py-4 rounded-2xl bg-surface-card border border-slate-700 text-center font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">CURRENT STATUS</span>
          <span className={`text-xl font-extrabold ${
            incident.status === 'Resolved' ? 'text-emerald-400' :
            incident.status === 'In Progress' ? 'text-amber-400 animate-pulse' :
            incident.status === 'Assigned' ? 'text-blue-400' : 'text-rose-400'
          }`}>
            {incident.status === 'In Progress' ? '🟠 RESCUE IN PROGRESS' :
             incident.status === 'Resolved' ? '🟢 INCIDENT RESOLVED' :
             incident.status === 'Assigned' ? '🚑 RESCUE TEAM ASSIGNED' :
             `🚨 ${incident.status.toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* Live Timeline & Rescue Team Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step Progress Timeline */}
        <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-6">
          <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Live Rescue Timeline</span>
          </h3>

          <div className="space-y-4 relative pl-4 border-l-2 border-slate-800">
            {steps.map((step, idx) => (
              <div key={idx} className="relative group">
                <div className={`absolute -left-[23px] top-1 w-4 h-4 rounded-full border-2 ${
                  step.done
                    ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50'
                    : step.active
                    ? 'bg-amber-500 border-amber-400 animate-ping'
                    : 'bg-slate-900 border-slate-700'
                }`} />

                <div className="ml-2">
                  <span className={`font-bold text-xs ${step.done ? 'text-emerald-300' : step.active ? 'text-amber-400 font-extrabold' : 'text-slate-500'}`}>
                    {step.done ? '✓ ' : step.active ? '🟠 ' : '○ '}
                    {step.label}
                  </span>
                  {step.time && (
                    <p className="text-[10px] font-mono text-slate-400">
                      {new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Assigned Rescue Team Card */}
          {incident.assignedTeam && (
            <div className="mt-6 p-4 rounded-2xl bg-blue-950/40 border border-blue-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">ASSIGNED RESCUE UNIT</span>
                <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-200 text-[10px] font-bold">
                  LIVE TRACKING
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500 flex items-center justify-center text-blue-400 font-bold">
                  🚑
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{incident.assignedTeam.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{incident.assignedTeam.type || 'Emergency Unit'}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-900/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center space-x-1">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{incident.assignedTeam.phone || '+1 555-0101'}</span>
                </span>
                <span className="text-emerald-400 font-bold">DISPATCHED</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Leaflet Map & GPS Location Track */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-red-500 animate-pulse" />
                <span>Live Rescue Vehicle GIS Tracker</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>REALTIME GPS FEED ACTIVE</span>
              </span>
            </div>

            <LiveCommandMap
              incidents={[incident]}
              resources={resourcesForMap}
              height="420px"
            />
          </div>

          {/* Activity Logs History */}
          <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-4">
            <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
              <Radio className="w-5 h-5 text-indigo-400" />
              <span>Emergency Activity Log History</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activities.length > 0 ? (
                activities.map((act, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">{act.action}</span>
                      <span className="text-slate-400">{act.details}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 font-mono py-2">No activity records logged yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
