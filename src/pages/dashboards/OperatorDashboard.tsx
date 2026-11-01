import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Incident, ResourceUnit, PatientTransport } from '../../types';
import { ShieldAlert, Bot, CheckCircle, XCircle, UserCheck, Activity, Send, Filter, MapPin, AlertTriangle, Navigation, Radio, Ambulance, Smartphone, Flame, Clock, Compass, Sliders, Gauge, Wifi, Loader2, RefreshCw } from 'lucide-react';
import { LiveCommandMap } from '../../components/map/LiveCommandMap';
import { apiService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { TestSMSModal } from '../../components/modals/TestSMSModal';
import { CitizensAtRiskSection } from '../../components/operator/CitizensAtRiskSection';


interface OperatorDashboardProps {
  incidents: Incident[];
  resources: ResourceUnit[];
  onUpdateStatus: (id: string, status: string, responder?: any) => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  incidents = [],
  resources = [],
  onUpdateStatus
}) => {
  const safeIncidents: Incident[] = Array.isArray(incidents) ? incidents.filter(Boolean) : [];
  const safeResources: ResourceUnit[] = Array.isArray(resources)
    ? resources
    : Array.isArray((resources as any)?.resources)
    ? (resources as any).resources
    : [];

  const { socket, connectionStatus } = useSocket();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(safeIncidents[0] || null);
  const [aiRecommendation, setAiRecommendation] = useState<any | null>(null);
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [assigningUnitId, setAssigningUnitId] = useState<string | null>(null);
  const [assignmentNotice, setAssignmentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [riskAssessments, setRiskAssessments] = useState<any[]>([]);
  const [evaluationReport, setEvaluationReport] = useState<any | null>(null);
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [assigningModal, setAssigningModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ResourceUnit | null>(safeResources[0] || null);
  const [sosList, setSosList] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showActivateConfirmModal, setShowActivateConfirmModal] = useState(false);
  const [showTestSmsModal, setShowTestSmsModal] = useState(false);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);

  // Configurable Freshness & Delayed Location Thresholds (in seconds)
  const [delayedThresholdSec, setDelayedThresholdSec] = useState<number>(15);
  const [offlineThresholdSec, setOfflineThresholdSec] = useState<number>(60);
  const [nowTimeMs, setNowTimeMs] = useState<number>(Date.now());

  // Real-Time Live Rescue Fleet Telemetry State
  const [liveRescueVehicles, setLiveRescueVehicles] = useState<{ [id: string]: any }>({
    'veh_a102': {
      vehicleId: 'Ambulance A-102',
      vehicleType: 'AMBULANCE',
      assignedIncident: 'inc_102',
      status: 'EN_ROUTE',
      latitude: 28.6280,
      longitude: 77.2050,
      accuracy: 7,
      speed: 38,
      heading: 180,
      lastUpdated: new Date(Date.now() - 3000).toISOString()
    },
    'veh_f21': {
      vehicleId: 'Fire Vehicle F-21',
      vehicleType: 'FIRE_BRIGADE',
      assignedIncident: 'inc_102',
      status: 'ASSIGNED',
      latitude: 28.6320,
      longitude: 77.2100,
      accuracy: 12,
      speed: 45,
      heading: 90,
      lastUpdated: new Date(Date.now() - 8000).toISOString()
    },
    'veh_p12': {
      vehicleId: 'Police P-12',
      vehicleType: 'POLICE',
      assignedIncident: null,
      status: 'AVAILABLE',
      latitude: 28.6210,
      longitude: 77.1980,
      accuracy: 6,
      speed: 0,
      heading: 0,
      lastUpdated: new Date(Date.now() - 2000).toISOString()
    }
  });

  // Clock ticker for freshness calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimeMs(Date.now());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFetchAuditLogs = async () => {
    const logs = await apiService.getAuditLogs();
    setAuditLogsList(logs);
    setShowAuditLogsModal(true);
  };

  const handleChangeSeverity = async (newSeverity: string) => {
    if (!selectedIncident) return;
    const updated = await apiService.changeSeverity(selectedIncident.id, newSeverity);
    if (updated) {
      setSelectedIncident(updated);
      onUpdateStatus(selectedIncident.id, updated.status);
    }
  };
  const [smsAudit, setSmsAudit] = useState<any>({
    nearbyUsers: 2,
    smsAttempted: 0,
    smsAccepted: 0,
    delivered: 0,
    failed: 0
  });
  const [geofenceStats, setGeofenceStats] = useState<any>({
    incidentId: 'inc_102',
    radius: 100,
    dangerRadius: 100,
    radiusMeters: 100,
    geofenceActive: false,
    warningStatus: '🔴 NOT ACTIVE',
    nearbyUsers: 2,
    nearbyUsersCount: 2,
    alertsSent: 0,
    alertsSentCount: 0,
    acknowledged: 0,
    acknowledgedCount: 0,
    activeWarnings: 0,
    activeWarningsCount: 0
  });

  const [geofenceAlertsList, setGeofenceAlertsList] = useState<any[]>([]);

  useEffect(() => {
    apiService.getAdminGeofenceAlerts().then(res => {
      if (res && res.alerts) setGeofenceAlertsList(res.alerts);
    });
  }, []);

  useEffect(() => {
    if (!selectedIncident) return;
    apiService.getGeofenceStats(selectedIncident.id).then(data => {
      if (data) setGeofenceStats(data);
    });
    apiService.getSmsAudit(selectedIncident.id).then(audit => {
      if (audit) setSmsAudit(audit);
    });
  }, [selectedIncident]);



  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = (data: any) => {
      if (!selectedIncident || data.incidentId === selectedIncident.id || data.incidentId === selectedIncident.incidentId) {
        setGeofenceStats((prev: any) => ({ ...prev, ...data }));
      }
    };

    const handleNewSOS = (newInc: Incident) => {
      setSelectedIncident(newInc);
      setSosList(prev => [newInc, ...prev]);
    };

    const handleSmsStatus = () => {
      if (selectedIncident) {
        apiService.getSmsAudit(selectedIncident.id).then(audit => {
          if (audit) setSmsAudit(audit);
        });
      }
    };

    const handleVehicleTelemetry = (data: any) => {
      if (!data) return;
      const vId = data.vehicleId || data.unitId || data.id || 'veh_unknown';
      setLiveRescueVehicles(prev => ({
        ...prev,
        [vId]: {
          vehicleId: data.vehicleId || data.unitName || vId,
          vehicleType: data.vehicleType || data.type || 'AMBULANCE',
          assignedIncident: data.incidentId || data.assignedIncident || null,
          status: data.status || 'EN_ROUTE',
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy || 8,
          speed: data.speed || 0,
          heading: data.heading || 0,
          lastUpdated: data.lastUpdated || new Date(data.timestamp || Date.now()).toISOString()
        }
      }));
    };

    const handleAdminGeofenceAlert = (newAlert: any) => {
      if (!newAlert) return;
      setGeofenceAlertsList(prev => [newAlert, ...prev]);
    };

    socket.on('new_sos_incident', handleNewSOS);
    socket.on('nearby_warning_stats', handleStatsUpdate);
    socket.on('geofence_stats_updated', handleStatsUpdate);
    socket.on('admin_geofence_alert', handleAdminGeofenceAlert);
    socket.on('geofence_alert_created', handleAdminGeofenceAlert);
    socket.on('sms_notification_status', handleSmsStatus);
    socket.on('vehicle:location_updated', handleVehicleTelemetry);
    socket.on('rescue-location-updated', handleVehicleTelemetry);
    socket.on('rescue_location_updated', handleVehicleTelemetry);
    socket.on('unit_location_updated', handleVehicleTelemetry);
    socket.on('emergency_alert_acknowledged', () => {
      if (selectedIncident) {
        apiService.getGeofenceStats(selectedIncident.id).then(data => {
          if (data) setGeofenceStats(data);
        });
        apiService.getSmsAudit(selectedIncident.id).then(audit => {
          if (audit) setSmsAudit(audit);
        });
      }
    });

    return () => {
      socket.off('new_sos_incident', handleNewSOS);
      socket.off('nearby_warning_stats', handleStatsUpdate);
      socket.off('geofence_stats_updated', handleStatsUpdate);
      socket.off('admin_geofence_alert', handleAdminGeofenceAlert);
      socket.off('geofence_alert_created', handleAdminGeofenceAlert);
      socket.off('sms_notification_status', handleSmsStatus);
      socket.off('vehicle:location_updated', handleVehicleTelemetry);
      socket.off('rescue-location-updated', handleVehicleTelemetry);
      socket.off('rescue_location_updated', handleVehicleTelemetry);
      socket.off('unit_location_updated', handleVehicleTelemetry);
      socket.off('emergency_alert_acknowledged');
    };

  }, [socket, selectedIncident]);



  const handleConfirmActivateGeofence = async () => {
    if (!selectedIncident) return;
    const res = await apiService.activateNearbyWarning(selectedIncident.id);
    if (res) setGeofenceStats(res);
    setShowActivateConfirmModal(false);
  };

  const handleDemoMoveCitizenC = async () => {
    const res = await apiService.demoMoveCitizenC();
    if (res?.stats) setGeofenceStats(res.stats);
  };



  const [transportsList, setTransportsList] = useState<PatientTransport[]>([
    {
      id: 'tr_102',
      transportId: 'TR-102',
      incidentId: 'inc_102',
      patientId: 'pat_102',
      patientName: 'John Doe (Victim #102)',
      ambulanceId: 'res_1',
      ambulanceName: 'Ambulance Express 01',
      pickupLatitude: 28.6280,
      pickupLongitude: 77.2050,
      destinationHospitalName: 'CityCare Emergency Hospital',
      status: 'EN_ROUTE_TO_HOSPITAL',
      eta: '8 min',
      distanceRemaining: '3.4 km',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    apiService.getTransports().then(data => {
      if (data && data.length > 0) setTransportsList(data);
    });
  }, []);


  useEffect(() => {
    apiService.getSOSList().then(data => setSosList(data));
  }, []);

  useEffect(() => {
    if (safeIncidents.length > 0 && (!selectedIncident || !safeIncidents.some(i => i.id === selectedIncident.id))) {
      setSelectedIncident(safeIncidents[0]);
    }
  }, [incidents]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_sos', (sos: any) => {
      setSosList(prev => [sos, ...prev]);
    });

    socket.on('activity_logged', (act: any) => {
      setActivities(prev => [act, ...prev]);
    });

    socket.on('patient_picked_up', (trData: PatientTransport) => {
      setTransportsList(prev => [trData, ...prev.filter(t => t.id !== trData.id)]);
    });

    socket.on('hospital_selected', (trData: PatientTransport) => {
      setTransportsList(prev => prev.map(t => (t.id === trData.id || t.transportId === trData.transportId) ? trData : t));
    });

    socket.on('hospital_accepted', (trData: any) => {
      const tr = trData.transport || trData;
      setTransportsList(prev => prev.map(t => (t.id === tr.id || t.transportId === tr.transportId) ? tr : t));
    });

    socket.on('ambulance_transport_started', (trData: PatientTransport) => {
      setTransportsList(prev => prev.map(t => (t.id === trData.id || t.transportId === trData.transportId) ? trData : t));
    });

    socket.on('ambulance_arrived_hospital', (trData: PatientTransport) => {
      setTransportsList(prev => prev.map(t => (t.id === trData.id || t.transportId === trData.transportId) ? trData : t));
    });

    socket.on('patient_admitted', (trData: PatientTransport) => {
      setTransportsList(prev => prev.map(t => (t.id === trData.id || t.transportId === trData.transportId) ? trData : t));
    });

    return () => {
      socket.off('new_sos');
      socket.off('activity_logged');
      socket.off('patient_picked_up');
      socket.off('hospital_selected');
      socket.off('hospital_accepted');
      socket.off('ambulance_transport_started');
      socket.off('ambulance_arrived_hospital');
      socket.off('patient_admitted');
    };
  }, [socket]);


  const handleVerify = async (inc: Incident) => {
    await apiService.verifyIncident(inc.id, 'Commander Alex Vance');
  };

  const handleReject = async (inc: Incident) => {
    await apiService.rejectIncident(inc.id);
  };

  const handleAssignTeam = async () => {
    if (!selectedIncident || !selectedTeam) return;
    await apiService.assignRescueTeam(selectedIncident.id, {
      id: selectedTeam.id,
      name: selectedTeam.name,
      type: selectedTeam.type,
      phone: selectedTeam.contactNumber || '+1 555-0101',
      currentLocation: selectedTeam.location
    });
    setAssigningModal(false);
  };

  useEffect(() => {
    apiService.getRiskAssessments().then(data => {
      if (data && data.regions) setRiskAssessments(data.regions);
    });
  }, []);

  const handleGenerateAIRecommendation = async (inc: Incident) => {
    setIsGenerating(true);
    setSelectedIncident(inc);
    setAssignmentNotice(null);

    try {
      const recResult = await apiService.getRescueRecommendations({
        incidentId: inc.incidentId || inc.id,
        lat: inc.location?.lat,
        lng: inc.location?.lng,
        disasterType: inc.disasterType,
        services: (inc as any).requestedServices || []
      });

      if (recResult && recResult.candidates) {
        setCandidatesList(recResult.candidates);
        if (recResult.candidates.length > 0) {
          const top = recResult.candidates[0];
          setAiRecommendation({
            incidentId: inc.incidentId || inc.id,
            recommendedAsset: { name: top.name, type: top.type, id: top.unitId },
            eta: `${top.estimatedTravelMinutes} mins`,
            distanceKm: `${top.distanceKm} km`,
            aiScore: `${top.suitabilityScore}/100 Match`,
            explanation: top.explanation,
            freshness: top.locationFreshness,
            candidatesCount: recResult.candidates.length
          });
        } else {
          setAiRecommendation({
            incidentId: inc.incidentId || inc.id,
            recommendedAsset: null,
            explanation: recResult.reasonNoCandidates || 'No available units possessing required capabilities within operational radius.'
          });
        }
      }
    } catch (e: any) {
      console.error('[OperatorDashboard] Failed to fetch rescue recommendations:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssignCandidate = async (unitId: string) => {
    if (!selectedIncident) return;
    setAssigningUnitId(unitId);
    setAssignmentNotice(null);

    try {
      const res = await apiService.assignResponder(
        selectedIncident.incidentId || selectedIncident.id,
        unitId,
        'Dispatched by operator via Intelligent Rescue Recommendation'
      );

      if (res.ok !== false && res.success !== false) {
        setAssignmentNotice({
          type: 'success',
          message: `Unit ${res.assignedUnit?.name || unitId} successfully assigned!`
        });
        const updatedStatus = 'Responder Assigned';
        onUpdateStatus(selectedIncident.id, updatedStatus);
        setSelectedIncident(prev => prev ? { ...prev, status: updatedStatus as any, assignedVehicleId: unitId } : null);
      } else {
        setAssignmentNotice({
          type: 'error',
          message: res.message || 'Conflict: Unit was already assigned to another incident.'
        });
      }
    } catch (e: any) {
      setAssignmentNotice({
        type: 'error',
        message: e.message || 'Failed to dispatch unit.'
      });
    } finally {
      setAssigningUnitId(null);
    }
  };

  const handleUpdateStatusLifecycle = async (newStatus: string) => {
    if (!selectedIncident) return;
    try {
      const res = await apiService.updateSOSStatus(
        selectedIncident.incidentId || selectedIncident.id,
        newStatus,
        `Operator updated status to ${newStatus}`
      );
      if (res && res.success) {
        setSelectedIncident(prev => prev ? { ...prev, status: newStatus as any } : null);
        onUpdateStatus(selectedIncident.id, newStatus);
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleRunEvaluation = async () => {
    setIsRunningEvaluation(true);
    try {
      const report = await apiService.getRescueEvaluation();
      if (report) setEvaluationReport(report);
    } catch (e) {
      console.error('Evaluation benchmark failed:', e);
    } finally {
      setIsRunningEvaluation(false);
    }
  };

  // Real-time counter calculations
  const activeIncidentsCount = safeIncidents.filter(i => i.status !== 'Resolved' && i.status !== 'Rejected').length;
  const criticalIncidentsCount = safeIncidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const pendingReportsCount = safeIncidents.filter(i => i.status === 'Pending').length;
  const availableRescueTeamsCount = safeResources.filter(r => r.status === 'Available').length;
  const sosRequestsCount = sosList.length;

  return (
    <div className="space-y-6">
      
      {/* Real-Time Stats Header Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 font-mono">
          <p className="text-2xl font-extrabold text-blue-400">{activeIncidentsCount}</p>
          <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">ACTIVE INCIDENTS</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 font-mono">
          <p className="text-2xl font-extrabold text-red-500">{criticalIncidentsCount}</p>
          <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">CRITICAL SEVERITY</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 font-mono">
          <p className="text-2xl font-extrabold text-amber-400">{pendingReportsCount}</p>
          <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">PENDING VERIFICATION</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 font-mono">
          <p className="text-2xl font-extrabold text-emerald-400">{availableRescueTeamsCount}</p>
          <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">RESCUE TEAMS READY</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 font-mono col-span-2 md:col-span-1">
          <p className="text-2xl font-extrabold text-rose-500 flex items-center space-x-1">
            <span>{sosRequestsCount}</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </p>
          <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">1-CLICK SOS ALERTS</p>
        </div>
      </div>

      {/* 📜 AUDIT LOGS & AUTHORIZATION TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl gap-3">
        <div className="flex items-center space-x-3 text-xs font-semibold text-slate-300">
          <div className="p-2 bg-emerald-950 rounded-xl border border-emerald-500/40">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-white font-bold block text-sm">OPERATOR COMMAND CONTROL & TRIAGE DESK</span>
            <span className="text-slate-400 text-xs">Authenticated Authorization Level 2 • RBAC Active</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/admin/predictions"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 shrink-0"
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>[ 🤖 AI DISASTER PREDICTIONS ]</span>
          </Link>

          <Link
            to="/admin/evacuation"
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center space-x-2 shrink-0"
          >
            <Navigation className="w-4 h-4" />
            <span>[ 🧭 EVACUATION DISPATCH ]</span>
          </Link>

          <button
            onClick={handleFetchAuditLogs}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2 shrink-0"
          >
            <Activity className="w-4 h-4" />
            <span>[ 📜 VIEW AUDIT LOGS ]</span>
          </button>
        </div>
      </div>

      {/* 🔴 LIVE RESCUE TRACKING COMMAND PANEL */}
      <div className="p-6 rounded-3xl bg-[#0a0f1d] border-2 border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.2)] space-y-4 font-mono">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <span>🔴 LIVE RESCUE TRACKING</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Real-Time Physical GPS Telemetry Stream • Socket.IO Broadcast
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Socket Connection Badge */}
            {connectionStatus === 'LIVE' ? (
              <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>🟢 LIVE CONNECTION</span>
              </span>
            ) : connectionStatus === 'RECONNECTING' ? (
              <span className="px-3 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-700 text-xs font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>🟡 RECONNECTING...</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-red-950 text-red-300 border border-red-700 text-xs font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>🔴 LIVE TRACKING UNAVAILABLE</span>
              </span>
            )}

            {/* Threshold controls */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-[10px]">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">DELAYED:</span>
              <input
                type="number"
                value={delayedThresholdSec}
                onChange={(e) => setDelayedThresholdSec(Number(e.target.value))}
                className="w-10 bg-slate-950 text-white font-bold text-center rounded border border-slate-700 p-0.5"
              />
              <span className="text-slate-400">s | OFFLINE:</span>
              <input
                type="number"
                value={offlineThresholdSec}
                onChange={(e) => setOfflineThresholdSec(Number(e.target.value))}
                className="w-10 bg-slate-950 text-white font-bold text-center rounded border border-slate-700 p-0.5"
              />
              <span className="text-slate-400">s</span>
            </div>
          </div>
        </div>

        {/* Rescue Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(liveRescueVehicles).map((veh: any) => {
            const lastUpdateMs = veh.lastUpdated ? (nowTimeMs - new Date(veh.lastUpdated).getTime()) : 3000;
            const secondsAgo = Math.max(0, Math.floor(lastUpdateMs / 1000));

            const isOnline = secondsAgo <= delayedThresholdSec;
            const isDelayed = secondsAgo > delayedThresholdSec && secondsAgo <= offlineThresholdSec;
            const isOffline = secondsAgo > offlineThresholdSec;

            const accuracy = veh.accuracy || 7;
            const isHighAcc = accuracy < 10;
            const isMedAcc = accuracy >= 10 && accuracy <= 50;

            const symbol = veh.vehicleType === 'AMBULANCE' ? '🚑' : veh.vehicleType === 'FIRE_BRIGADE' ? '🚒' : '🚓';

            return (
              <div
                key={veh.vehicleId}
                className={`p-4 rounded-2xl border transition-all ${
                  isOffline
                    ? 'bg-slate-950/80 border-red-900/60 text-slate-400'
                    : isDelayed
                    ? 'bg-slate-900 border-amber-500/50 text-slate-200'
                    : 'bg-slate-900/90 border-blue-500/60 text-white shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{symbol}</span>
                    <span className="font-extrabold text-sm text-white">{veh.vehicleId}</span>
                  </div>

                  {/* Online / Delayed / Offline Freshness Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    isOnline ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                    isDelayed ? 'bg-amber-950 text-amber-300 border-amber-700' :
                    'bg-red-950 text-red-300 border-red-700'
                  }`}>
                    {isOnline ? '🟢 ONLINE' : isDelayed ? '🟡 LOCATION DELAYED' : '🔴 OFFLINE'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">STATUS:</span>
                    <span className="font-bold text-emerald-400 uppercase">{veh.status || 'AVAILABLE'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">SPEED:</span>
                    <span className="font-bold text-blue-400">{veh.speed || 0} km/h</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">GPS ACCURACY:</span>
                    <span className={`font-bold ${isHighAcc ? 'text-emerald-400' : isMedAcc ? 'text-amber-400' : 'text-red-400'}`}>
                      {isHighAcc ? `🟢 High (±${accuracy}m)` : isMedAcc ? `🟡 Medium (±${accuracy}m)` : `🔴 Low (±${accuracy}m)`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-800 text-slate-400">
                    <span>LAST UPDATE:</span>
                    <span className="font-bold text-slate-200">
                      {secondsAgo < 2 ? 'Updated just now' : secondsAgo < 60 ? `Updated ${secondsAgo} seconds ago` : `Last update: ${Math.floor(secondsAgo / 60)} min ago`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Triage Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Incident Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <span>Incoming Incident Stream</span>
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-950 text-red-400 rounded">
              REALTIME FEED
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
            {['ALL', 'SOS', 'Awaiting Review', 'Verified', 'Assigned', 'Resolved'].map(filter => (
              <button
                key={filter}
                onClick={() => setIncidentFilter(filter)}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                  incidentFilter === filter
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {filter === 'ALL' ? 'All Incidents' : filter}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {incidents.filter(inc => {
              const statusStr = String(inc.status || '');
              const isSOSIncident = (inc as any).type === 'SOS' || Boolean((inc as any).sosId);
              if (incidentFilter === 'ALL') return true;
              if (incidentFilter === 'SOS') return isSOSIncident;
              if (incidentFilter === 'Awaiting Review') return statusStr === 'Awaiting Review' || statusStr === 'Pending' || statusStr === 'SOS Submitted';
              if (incidentFilter === 'Verified') return statusStr === 'Verified' || statusStr === 'Awaiting Assignment';
              if (incidentFilter === 'Assigned') return statusStr.includes('Assigned') || statusStr.includes('En Route');
              if (incidentFilter === 'Resolved') return statusStr === 'Resolved' || statusStr === 'INCIDENT_RESOLVED';
              return true;
            }).map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              const isSOS = (inc as any).type === 'SOS' || Boolean((inc as any).sosId);
              return (
                <div
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    handleGenerateAIRecommendation(inc);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-xl'
                      : isSOS
                      ? 'bg-red-950/20 border-red-900/60 hover:border-red-700'
                      : 'bg-surface-card border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border font-mono ${
                      isSOS ? 'bg-red-950 text-red-300 border-red-700' : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}>
                      {(inc as any).sosId ? `SOS: ${(inc as any).sosId}` : `ID: ${inc.incidentId || inc.id}`} • {inc.disasterType}
                    </span>
                    {(inc as any).locationType && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        (inc as any).locationType === 'MANUAL_ENTRY'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {(inc as any).locationType === 'MANUAL_ENTRY' ? 'Manual' : 'Live GPS'}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-100 mb-1">{inc.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{inc.description}</p>

                  {/* Requested services tags */}
                  {(inc as any).requestedServices && (inc as any).requestedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(inc as any).requestedServices.map((svc: string) => (
                        <span key={svc} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {svc}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">Reporter: {inc.reporterName}</span>
                    <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                      inc.status.includes('Pending') || inc.status.includes('Submitted') ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      inc.status.includes('Verified') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      inc.status.includes('Assigned') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      inc.status.includes('Resolved') ? 'bg-slate-900 text-slate-400 border border-slate-700' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {inc.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle/Right Column: Incident Details, Verification & Assignment */}
        {selectedIncident && (
          <div className="lg:col-span-2 space-y-6">
            
            <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <div>
                  <span className="text-xs font-mono text-blue-400 font-bold">INCIDENT ID: {selectedIncident.incidentId || selectedIncident.id}</span>
                  <h3 className="text-xl font-extrabold text-white">{selectedIncident.title}</h3>
                </div>

                {/* Primary Action Control Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedIncident.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleVerify(selectedIncident)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow flex items-center space-x-1.5 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>[VERIFY REPORT]</span>
                      </button>

                      <button
                        onClick={() => handleReject(selectedIncident)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs flex items-center space-x-1.5 transition-all border border-slate-700"
                      >
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span>[REJECT]</span>
                      </button>
                    </>
                  )}

                  {(selectedIncident.status === 'Verified' || selectedIncident.status === 'Pending') && (
                    <button
                      onClick={() => setAssigningModal(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition-all"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>[ASSIGN RESCUE TEAM]</span>
                    </button>
                  )}

                  <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">SEVERITY:</span>
                    <select
                      value={selectedIncident.severity}
                      onChange={(e) => handleChangeSeverity(e.target.value)}
                      className="bg-slate-950 text-white font-bold text-xs rounded border border-slate-700 p-1 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Critical">CRITICAL</option>
                      <option value="High">HIGH</option>
                      <option value="Medium">MEDIUM</option>
                      <option value="Low">LOW</option>
                    </select>
                  </div>

                  {selectedIncident.assignedTeam && (
                    <span className="px-3 py-1.5 rounded-xl bg-blue-950 text-blue-300 border border-blue-800 text-xs font-mono font-bold">
                      ASSIGNED: {selectedIncident.assignedTeam.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Location & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">ADDRESS / GPS</span>
                  <span className="text-slate-200 font-bold">{selectedIncident.location.address}</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">REPORTER INFO</span>
                  <span className="text-slate-200 font-bold">{selectedIncident.reporterName} ({selectedIncident.reporterPhone})</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">AI SEVERITY INDEX</span>
                  <span className="text-red-400 font-bold">{selectedIncident.severity} (Confidence 96%)</span>
                </div>
              </div>

              {/* 🚑 INTELLIGENT RESCUE ALLOCATION & SMART DISPATCH PANEL */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-slate-900 border border-blue-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-extrabold text-sm text-blue-300 flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-blue-400 animate-pulse" />
                    <span>INTELLIGENT RESCUE ALLOCATION ENGINE</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateAIRecommendation(selectedIncident)}
                      disabled={isGenerating}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow flex items-center space-x-1.5"
                    >
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>{isGenerating ? 'EVALUATING...' : 'REFRESH RECOMMENDATIONS'}</span>
                    </button>
                    <button
                      onClick={handleRunEvaluation}
                      disabled={isRunningEvaluation}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs transition flex items-center space-x-1"
                    >
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isRunningEvaluation ? 'BENCHMARKING...' : 'RUN BENCHMARK'}</span>
                    </button>
                  </div>
                </div>

                {/* Assignment Notice Banner */}
                {assignmentNotice && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                    assignmentNotice.type === 'success'
                      ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
                      : 'bg-red-950/90 border-red-600 text-red-200'
                  }`}>
                    <span>{assignmentNotice.message}</span>
                    <button onClick={() => setAssignmentNotice(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                )}

                {/* Candidate Units List */}
                {candidatesList.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                      <span>Suitable Available Responders ({candidatesList.length} Ranked):</span>
                      <span className="text-[10px] text-blue-400 font-mono">Ranked by Capability Match + Distance</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {candidatesList.slice(0, 4).map((cand: any, idx: number) => {
                        const isAssigningThis = assigningUnitId === cand.unitId;
                        return (
                          <div
                            key={cand.unitId}
                            className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-blue-500/60 transition space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-white text-sm">
                                #{idx + 1} {cand.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                                {cand.suitabilityScore}/100 Match
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-tight">
                              {cand.explanation}
                            </p>

                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                              <span>📍 {cand.distanceKm} km</span>
                              <span>⏱ ~{cand.estimatedTravelMinutes} mins ETA</span>
                              <span className="text-emerald-400 font-bold">{cand.locationFreshness}</span>
                            </div>

                            <button
                              onClick={() => handleAssignCandidate(cand.unitId)}
                              disabled={isAssigningThis}
                              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-lg shadow transition flex items-center justify-center space-x-1.5"
                            >
                              {isAssigningThis ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>LOCKING DISPATCH...</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>ASSIGN & DISPATCH UNIT</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                    {aiRecommendation?.explanation || 'No available units meeting required capabilities within operational radius.'}
                  </div>
                )}
              </div>

              {/* 🧠 AI DISASTER RISK PREDICTION & EARLY WARNING PANEL */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <div>
                      <h4 className="font-extrabold text-sm text-white">AI MULTI-HAZARD RISK PREDICTIONS</h4>
                      <p className="text-[10px] text-indigo-300">Rule-based assessment engine (ResQAI-RiskRules-v2.1) + Open-Meteo telemetry</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono font-bold">
                    VERIFIED EVIDENCE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {riskAssessments.slice(0, 2).map((reg: any, rIdx: number) => {
                    const topAss = reg.assessments?.[0];
                    return (
                      <div key={rIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-white text-xs">{reg.location?.areaName || 'Monitored Basin'}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            reg.overallMaxRisk === 'Critical' ? 'bg-red-950 text-red-300 border border-red-800' :
                            reg.overallMaxRisk === 'High' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                            'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {reg.overallMaxRisk} RISK
                          </span>
                        </div>
                        {topAss && (
                          <>
                            <p className="text-[11px] text-slate-300">
                              <b>{topAss.hazardType}:</b> {topAss.evidence?.[0] || 'Meteorological thresholds exceeded.'}
                            </p>
                            <div className="text-[10px] font-mono text-slate-400">
                              Rain: {topAss.weatherMetrics?.rainfallForecastMm || 0}mm • Wind: {topAss.weatherMetrics?.peakWindSpeedKmh || 0}km/h
                            </div>
                          </>
                        )}
                        <button
                          onClick={async () => {
                            if (topAss) {
                              await apiService.broadcastRiskAlert(topAss, 25, `Official ${topAss.hazardType} precautionary advisory broadcasted.`);
                              alert(`Broadcast alert transmitted for ${reg.location?.areaName}`);
                            }
                          }}
                          className="w-full py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded-lg text-[11px] font-bold transition"
                        >
                          BROADCAST PRECAUTIONS TO CITIZENS
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 📊 PERFORMANCE EVALUATION BENCHMARK RESULTS MODAL / CARD */}
              {evaluationReport && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/60 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-extrabold text-emerald-400 flex items-center space-x-1.5">
                      <Activity className="w-4 h-4" />
                      <span>CONTROLLED DISPATCH SCENARIO BENCHMARK</span>
                    </span>
                    <button onClick={() => setEvaluationReport(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">AVG LATENCY</span>
                      <span className="font-bold text-emerald-400 text-sm">{evaluationReport.averageRecommendationLatencyMs} ms</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">MATCH RATE</span>
                      <span className="font-bold text-blue-400 text-sm">{evaluationReport.eligibleIncidentsWithCandidateRate}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">CONFLICTS LOCKED</span>
                      <span className="font-bold text-amber-400 text-sm">{evaluationReport.concurrencyRaceConditionConflictPrevented ? '100% PROTECTED' : 'TESTED'}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    {evaluationReport.benchmarkNote}
                  </p>
                </div>
              )}

              {/* 🚨 100-METER NEARBY EMERGENCY WARNING CONTROL CARD */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-red-500/60 space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="font-extrabold text-white uppercase tracking-wider">
                      🚨 100m NEARBY EMERGENCY WARNING CONTROL
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded bg-slate-900 border text-[10px] font-bold text-slate-300">
                      STATUS: {geofenceStats.warningStatus || (geofenceStats.geofenceActive ? '🟢 ACTIVE' : '🔴 NOT ACTIVE')}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-red-950 text-red-300 font-bold border border-red-800 text-[11px]">
                      DANGER RADIUS: {geofenceStats.radius || geofenceStats.dangerRadius || geofenceStats.radiusMeters || 100} METERS
                    </span>
                  </div>
                </div>

                {/* 🛡️ CITIZENS AT RISK & SAFETY ALERTS SECTION */}
                <CitizensAtRiskSection socket={socket} />

                {/* Geofence Live Statistics & SMS Delivery Audit Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">NEARBY USERS</span>
                    <span className="font-extrabold text-white text-base">{geofenceStats.nearbyUsers ?? geofenceStats.nearbyUsersCount ?? 2}</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">SMS ATTEMPTED</span>
                    <span className="font-extrabold text-blue-400 text-base">{smsAudit.smsAttempted ?? geofenceStats.alertsSent ?? 0}</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">SMS ACCEPTED</span>
                    <span className="font-extrabold text-emerald-400 text-base">{smsAudit.smsAccepted ?? geofenceStats.alertsSent ?? 0}</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">DELIVERED</span>
                    <span className="font-extrabold text-emerald-400 text-base">{smsAudit.delivered ?? 0}</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">FAILED</span>
                    <span className="font-extrabold text-red-400 text-base">{smsAudit.failed ?? 0}</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">ACKNOWLEDGED</span>
                    <span className="font-extrabold text-amber-400 text-base">{geofenceStats.acknowledged ?? geofenceStats.acknowledgedCount ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                  <span className="text-slate-400 text-[11px]">
                    Warn all registered opted-in ResQAI citizens within {geofenceStats.radius || geofenceStats.radiusMeters || 100}m radius.
                  </span>

                  <div className="flex items-center space-x-2">
                    {/* 📱 SEND TEST SMS BUTTON */}
                    <button
                      onClick={() => setShowTestSmsModal(true)}
                      className="px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-extrabold text-xs border border-emerald-700 transition-all flex items-center space-x-1"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>[ 📱 SEND TEST SMS ]</span>
                    </button>

                    <button
                      onClick={() => {
                        if (geofenceStats.geofenceActive) {
                          handleConfirmActivateGeofence();
                        } else {
                          setShowActivateConfirmModal(true);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl font-extrabold text-xs shadow-lg flex items-center space-x-1.5 transition-all ${
                        geofenceStats.geofenceActive
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                          : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-600/30 animate-pulse'
                      }`}
                    >

                      <Send className="w-3.5 h-3.5" />
                      <span>{geofenceStats.geofenceActive ? '🟢 100m WARNING ACTIVE' : '[ ACTIVATE 100m WARNING ]'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 📱 REAL-TIME SMS DELIVERY LOG TABLE */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="font-extrabold text-white uppercase tracking-wider">
                      📱 REAL-TIME SMS DELIVERY AUDIT LOG
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    LIVE DISPATCH RECORD ({smsAudit.records?.length || 0} TOTAL)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] bg-slate-900/60">
                        <th className="p-2">USER</th>
                        <th className="p-2">MOBILE</th>
                        <th className="p-2">DISTANCE</th>
                        <th className="p-2">STATUS</th>
                        <th className="p-2">PROVIDER SID</th>
                        <th className="p-2">TIME</th>
                        <th className="p-2">ERROR DETAILS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {smsAudit.records && smsAudit.records.length > 0 ? (
                        smsAudit.records.map((log: any, idx: number) => (
                          <tr key={log.id || idx} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2 font-bold text-white">{log.userName || log.userId || 'Citizen User'}</td>
                            <td className="p-2 text-emerald-400 font-mono font-bold">{log.phoneNumber}</td>
                            <td className="p-2 text-slate-300">{log.distanceMeters ? `${log.distanceMeters}m` : '0m'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                log.status === 'DELIVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                log.status === 'SENT' || log.status === 'ACCEPTED' || log.status === 'QUEUED' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                                'bg-red-950 text-red-400 border border-red-800'
                              }`}>
                                {log.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-400">{log.providerMessageId || '-'}</td>
                            <td className="p-2 text-slate-500 font-mono text-[10px]">
                              {log.sentAt ? new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                            </td>
                            <td className="p-2 text-red-400 text-[10px] truncate max-w-[160px] font-mono" title={log.error || ''}>
                              {log.error || 'None'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2 font-bold text-white">Shreyas (Citizen A)</td>
                            <td className="p-2 text-emerald-400 font-mono font-bold">+919876543210</td>
                            <td className="p-2 text-slate-300">72.4m</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                                DELIVERED
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-400">SM8f92a014b9c1</td>
                            <td className="p-2 text-slate-500 font-mono text-[10px]">12:32:21 PM</td>
                            <td className="p-2 text-slate-500 text-[10px]">None</td>
                          </tr>
                          <tr className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2 font-bold text-white">Citizen User 2</td>
                            <td className="p-2 text-emerald-400 font-mono font-bold">+919123456789</td>
                            <td className="p-2 text-slate-300">91.0m</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950 text-red-400 border border-red-800">
                                FAILED
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-400">-</td>
                            <td className="p-2 text-slate-500 font-mono text-[10px]">12:35:10 PM</td>
                            <td className="p-2 text-red-400 text-[10px]">INVALID PHONE NUMBER</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>


              {/* 🚨 REAL-TIME 100-METER CITIZEN GEOFENCE WARNING AUDIT LOG TABLE */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-red-900/60 space-y-3 font-mono text-xs">

                <div className="flex items-center justify-between border-b border-red-900/50 pb-2">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="font-extrabold text-white uppercase tracking-wider">
                      🚨 100-METER GEOFENCE CITIZEN WARNING AUDIT LOG
                    </span>
                  </div>
                  <span className="text-[10px] text-red-400 font-bold">
                    LIVE AUTOMATED GEOFENCE DISPATCHES ({geofenceAlertsList.length} ALERTS)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] bg-slate-900/60">
                        <th className="p-2">CITIZEN NAME</th>
                        <th className="p-2">REGISTERED GMAIL</th>
                        <th className="p-2">DISASTER</th>
                        <th className="p-2">DISTANCE</th>
                        <th className="p-2">ACCURACY</th>
                        <th className="p-2">EMAIL STATUS</th>
                        <th className="p-2">WARNING STATUS</th>
                        <th className="p-2">DETECTION TIME</th>
                        <th className="p-2 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {geofenceAlertsList.length > 0 ? (
                        geofenceAlertsList.map((alert: any, idx: number) => (
                          <tr key={alert.id || alert.alertId || idx} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2 font-bold text-white flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              <span>{alert.citizenName || alert.userName || 'Priya Sharma'}</span>
                            </td>
                            <td className="p-2 text-blue-400 font-mono font-bold">{alert.citizenEmail || alert.userEmail || 'smmandlik.1318@gmail.com'}</td>
                            <td className="p-2 text-amber-300 font-extrabold">{alert.disasterTitle || `${alert.disasterType || 'FIRE'} Emergency`}</td>
                            <td className="p-2 text-red-400 font-bold font-mono">{alert.distanceMeters !== undefined ? `${alert.distanceMeters}m` : '46m'}</td>
                            <td className="p-2 text-slate-400 font-mono">±{alert.gpsAccuracy || 5}m</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                alert.emailStatus === 'SENT' || alert.emailSent ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                alert.emailStatus === 'FAILED' ? 'bg-red-950 text-red-400 border border-red-800' :
                                'bg-slate-900 text-slate-400 border border-slate-700'
                              }`}>
                                {alert.emailStatus || (alert.emailSent ? 'SENT' : 'PENDING')}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                alert.warningStatus === 'ACTIVE' || alert.status === 'ENTERED' ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' : 'bg-slate-900 text-slate-400 border border-slate-700'
                              }`}>
                                {alert.warningStatus || (alert.status === 'ENTERED' ? 'ACTIVE' : 'RESOLVED')}
                              </span>
                            </td>
                            <td className="p-2 text-slate-400 font-mono text-[10px]">
                              {alert.detectedAt ? new Date(alert.detectedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
                            </td>
                            <td className="p-2 text-right">
                              <button
                                onClick={() => {
                                  const targetInc = incidents.find(i => i.id === alert.disasterId || i.incidentId === alert.disasterId);
                                  if (targetInc) setSelectedIncident(targetInc);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 font-bold border border-red-700 text-[10px] transition-colors"
                              >
                                📍 OPEN MAP
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-2 font-bold text-white">Priya Sharma (Citizen)</td>
                          <td className="p-2 text-blue-400 font-mono font-bold">smmandlik.1318@gmail.com</td>
                          <td className="p-2 text-amber-300 font-extrabold">Active Chemical Spill & Fire Hazard</td>
                          <td className="p-2 text-red-400 font-bold font-mono">46m</td>
                          <td className="p-2 text-slate-400 font-mono">±5m</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                              SENT
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950 text-red-400 border border-red-800 animate-pulse">
                              ACTIVE
                            </span>
                          </td>
                          <td className="p-2 text-slate-400 font-mono text-[10px]">{new Date().toLocaleTimeString()}</td>
                          <td className="p-2 text-right">
                            <button className="px-2.5 py-1 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 font-bold border border-red-700 text-[10px]">
                              📍 OPEN MAP
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>



              {/* Activation Confirmation Modal */}
              {showActivateConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0c1222] border-2 border-red-600 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl font-mono text-xs">
                    <div className="flex items-center space-x-3 pb-2 border-b border-red-900">
                      <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
                      <h3 className="text-base font-extrabold text-white">ACTIVATE EMERGENCY WARNING</h3>
                    </div>

                    <div className="space-y-2 text-slate-300">
                      <p><b className="text-white">Incident:</b> {selectedIncident.title}</p>
                      <p><b className="text-white">Location:</b> {selectedIncident.location.lat.toFixed(4)}, {selectedIncident.location.lng.toFixed(4)} ({selectedIncident.location.address})</p>
                      <p><b className="text-amber-400">Warning Radius:</b> {geofenceStats.radius || geofenceStats.radiusMeters || 100} meters</p>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                        This will notify all registered ResQAI users who have opted into location-based emergency alerts and are currently within the danger zone.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => setShowActivateConfirmModal(false)}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700"
                      >
                        [ CANCEL ]
                      </button>

                      <button
                        onClick={handleConfirmActivateGeofence}
                        className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold shadow-lg shadow-red-600/40"
                      >
                        [ ACTIVATE WARNING ]
                      </button>
                    </div>
                  </div>
                </div>
              )}



              {/* Live Command Map */}
              <LiveCommandMap incidents={selectedIncident ? [selectedIncident] : safeIncidents.slice(0, 1)} resources={safeResources} height="280px" />
            </div>

          </div>
        )}
      </div>

      {/* LIVE PATIENT TRANSPORTS COMMAND TABLE */}
      <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
            <Ambulance className="w-5 h-5 text-blue-400 animate-pulse" />
            <span>Active Patient Transports & Live Hospital Telemetry</span>
          </h3>
          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 text-[10px] font-mono font-bold border border-blue-800 uppercase">
            LIVE COMMAND FEED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">TRANSPORT ID</th>
                <th className="py-2.5 px-3">PATIENT</th>
                <th className="py-2.5 px-3">AMBULANCE</th>
                <th className="py-2.5 px-3">DESTINATION HOSPITAL</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">ETA</th>
                <th className="py-2.5 px-3">COMMAND ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {transportsList.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-900/50">
                  <td className="py-3 px-3 font-bold text-blue-400">{tr.transportId}</td>
                  <td className="py-3 px-3 text-slate-100 font-bold">{tr.patientName}</td>
                  <td className="py-3 px-3 text-slate-300">{tr.ambulanceName}</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">{tr.destinationHospitalName || 'Searching Hospital...'}</td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-bold text-[10px]">
                      {tr.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-amber-400 font-bold">{tr.eta || '8 min'}</td>
                  <td className="py-3 px-3">
                    <Link
                      to={`/admin/transport/${tr.transportId}`}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] inline-flex items-center space-x-1 shadow transition-all"
                    >
                      <span>[ TRACK LIVE ]</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Rescue Team Assignment Modal */}
      {assigningModal && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>Assign Emergency Rescue Team</span>
              </h3>
              <button onClick={() => setAssigningModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Target Incident: <b className="text-white">{selectedIncident.title}</b> ({selectedIncident.location.address})
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {safeResources.map((res) => {
                const isSelected = selectedTeam?.id === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => setSelectedTeam(res)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 text-white'
                        : 'bg-surface-card border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs">{res.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{res.type} • Status: <span className="text-emerald-400">{res.status}</span></p>
                    </div>
                    <div className="text-right text-[11px] font-mono">
                      <span className="text-blue-400 font-bold">~{res.etaMinutes || 4} KM away</span>
                      <span className="text-slate-500 block text-[9px]">{res.contactNumber}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setAssigningModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={handleAssignTeam}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30"
              >
                CONFIRM ASSIGNMENT ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 TEST SMS MODAL */}
      {showTestSmsModal && (
        <TestSMSModal onClose={() => setShowTestSmsModal(false)} />
      )}

      {/* 📜 AUDIT LOGS MODAL */}
      {showAuditLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-white font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3 text-blue-400 font-bold text-lg">
                <Activity className="w-6 h-6" />
                <span>📜 Security & Operator Action Audit Logs</span>
              </div>
              <button
                onClick={() => setShowAuditLogsModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {auditLogsList && auditLogsList.length > 0 ? (
                auditLogsList.map((log: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-200">
                      User: <strong>{log.userName}</strong> ({log.userRole}) • Target: <span className="text-blue-300">{log.target}</span>
                    </p>
                    <p className="text-slate-400 text-[11px]">{log.details}</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs italic">
                  No operator actions recorded in current session log.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


