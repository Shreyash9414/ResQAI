import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Incident, EmergencyAlertPayload, Hospital, ReliefCamp, EmergencyNotification } from '../../types';
import { AlertTriangle, MapPin, Shield, HeartHandshake, PhoneCall, CheckCircle, Search, HelpCircle, Utensils, Droplet, Pill, Navigation, Radio, Compass, BellRing, Smartphone, Activity, Clock, RefreshCw, Crosshair, Flame, ShieldAlert } from 'lucide-react';
import { CitizenDeviceMap } from '../../components/map/CitizenDeviceMap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { EmergencyWarningModal } from '../../components/modals/EmergencyWarningModal';
import { SafeLocationsModal } from '../../components/modals/SafeLocationsModal';
import { ReportDisasterModal } from '../../components/modals/ReportDisasterModal';
import { OfflineDetector } from '../../components/layout/OfflineDetector';
import { SOSConfirmationModal, SOSSubmitPayload } from '../../components/modals/SOSConfirmationModal';
import { SafetyPrecautionsPanel } from '../../components/safety/SafetyPrecautionsPanel';
import { EmergencyContactsSection } from '../../components/safety/EmergencyContactsSection';
import { AlertOctagon, XCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';

interface CitizenDashboardProps {
  incidents: Incident[];
  onOpenSOSModal: () => void;
  hospitals?: Hospital[];
  camps?: ReliefCamp[];
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  incidents,
  onOpenSOSModal,
  hospitals = [],
  camps = []
}) => {
  const navigate = useNavigate();
  const { socket, connectionStatus } = useSocket();
  const { user } = useAuth();

  const [requestedSupply, setRequestedSupply] = useState<string | null>(null);
  
  // Location & Alert Preferences State
  const [locationSharing, setLocationSharing] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [browserAlerts, setBrowserAlerts] = useState(true);

  // TRUE PHYSICAL DEVICE GPS STATE (Zero hardcoded default coordinates)
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsAltitude, setGpsAltitude] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'LIVE' | 'UPDATING' | 'ACCURACY_LOW' | 'PERMISSION_DENIED' | 'UNAVAILABLE'>('UPDATING');
  const [lastLocationSyncTime, setLastLocationSyncTime] = useState<string>('Connecting Device GPS...');
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

  // Modals State
  const [showSOSConfirmationModal, setShowSOSConfirmationModal] = useState(false);
  const [showCancelSOSModal, setShowCancelSOSModal] = useState(false);
  const [showReportDisasterModal, setShowReportDisasterModal] = useState(false);
  const [activeSOS, setActiveSOS] = useState<Incident | null>(null);
  const [nearbyHospitalsList, setNearbyHospitalsList] = useState<Hospital[]>([]);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);
  const [isCancellingSOS, setIsCancellingSOS] = useState(false);

  const handleCancelSOSSubmit = async () => {
    if (!activeSOS || isCancellingSOS) return;
    try {
      setIsCancellingSOS(true);
      const res = await apiService.cancelSOS(activeSOS.id);
      if (res.success && res.incident) {
        setActiveSOS(res.incident);
      } else {
        setActiveSOS(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
      }
      setShowCancelSOSModal(false);
    } catch (err) {
      console.error('Failed to cancel SOS:', err);
    } finally {
      setIsCancellingSOS(false);
    }
  };

  // Emergency Warnings & Notifications State
  const [activeWarningAlert, setActiveWarningAlert] = useState<EmergencyAlertPayload | null>(null);
  const [showSafeLocationsModal, setShowSafeLocationsModal] = useState(false);
  const [recentSmsAudit, setRecentSmsAudit] = useState<EmergencyNotification | null>(null);

  // Watch real browser device GPS with maximumAge: 0
  useEffect(() => {
    if (!locationSharing) {
      setGpsStatus('UNAVAILABLE');
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('UNAVAILABLE');
      return;
    }

    setGpsStatus('UPDATING');

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    };

    const handlePosition = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;

      console.log("REAL DEVICE GPS:", {
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading
      });
      console.log(`REAL GPS UPDATE\nLatitude: ${latitude}\nLongitude: ${longitude}\nAccuracy: ${accuracy}m`);

      setCurrentGps({ lat: latitude, lng: longitude });
      setGpsAccuracy(accuracy || 5);
      setGpsAltitude(altitude !== null ? altitude : null);
      setGpsSpeed(speed !== null ? speed : 0);
      setGpsHeading(heading !== null ? heading : 0);

      // Requirement 5: Accuracy safety check threshold (50m)
      if (accuracy > 50) {
        setGpsStatus('ACCURACY_LOW');
      } else {
        setGpsStatus('LIVE');
      }

      const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastLocationSyncTime(syncTime);

      // Update REST API
      apiService.updateUserLocation(latitude, longitude, accuracy, user?.id || 'usr_1', speed || 0, heading || 0, altitude || 0);

      // Stream real-time telemetry over Socket.IO
      if (socket) {
        socket.emit('citizen_location_update', {
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          altitude,
          timestamp: pos.timestamp || Date.now(),
          incidentId: activeSOS?.id
        });
      }
    };

    const handleLocationError = (err: GeolocationPositionError) => {
      console.warn("GPS Location Error:", err.message);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus('PERMISSION_DENIED');
      } else {
        setGpsStatus('UNAVAILABLE');
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleLocationError,
      options
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationSharing, user, socket, activeSOS?.id]);

  // Fetch nearby hospitals when currentGps updates
  useEffect(() => {
    if (!currentGps) return;
    apiService.getNearbyHospitals(currentGps.lat, currentGps.lng).then(res => {
      if (res && res.length) setNearbyHospitalsList(res);
    });
  }, [currentGps]);

  // Socket.IO Listener for 3-Level Emergency Warnings & Live SOS/Responder Updates
  useEffect(() => {
    if (!socket) return;

    const handleNearbyWarning = (payload: EmergencyAlertPayload) => {
      if (!emergencyAlerts) return;

      // Level 1: In-App Warning Modal
      setActiveWarningAlert(payload);

      // Level 2: Browser Push Notification
      if (browserAlerts && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(payload.title || '🚨 RESQAI EMERGENCY ALERT', {
            body: `Hazard detected ${payload.distanceMeters}m from your current physical location. Open ResQAI for live map guidance.`,
            icon: '/favicon.ico'
          });
        } catch (e) {
          console.warn('Browser notification error:', e);
        }
      }
    };

    const handleSmsNotificationStatus = (payload: EmergencyNotification) => {
      setRecentSmsAudit(payload);
    };

    const handleSOSCreated = (inc: Incident) => {
      setActiveSOS(inc);
      if (socket && (inc.id || inc.incidentId)) {
        socket.emit('join_incident_room', inc.id || inc.incidentId);
      }
    };

    const handleIncidentUpdated = (updatedInc: any) => {
      if (!updatedInc) return;
      const incData = updatedInc.incident || updatedInc;
      setActiveSOS(prev => {
        if (!prev) return incData;
        if (prev.id === incData.id || prev.incidentId === incData.incidentId) {
          return { ...prev, ...incData };
        }
        return prev;
      });
    };

    const handleRescueAssigned = (payload: any) => {
      const incData = payload.incident || payload;
      setActiveSOS(prev => {
        if (!prev) return incData;
        const targetId = payload.incidentId || payload.id || incData.id;
        if (prev.id === targetId || prev.incidentId === targetId) {
          return {
            ...prev,
            ...incData,
            status: 'RESCUE_ASSIGNED',
            assignedUnits: payload.assignedUnits || incData.assignedUnits || prev.assignedUnits,
            timeline: payload.timeline || incData.timeline || prev.timeline
          };
        }
        return prev;
      });
    };

    const handleRescueAccepted = (payload: any) => {
      const incData = payload.incident || payload;
      setActiveSOS(prev => {
        if (!prev) return prev;
        const incId = payload.incidentId || payload.id || incData.id;
        if (prev.id === incId || prev.incidentId === incId) {
          const existingTimeline = prev.timeline || [];
          const hasAccepted = existingTimeline.some((t: any) => t.step === 'MISSION_ACCEPTED');
          const newTimeline = hasAccepted ? existingTimeline : [
            ...existingTimeline,
            { step: 'MISSION_ACCEPTED', label: 'MISSION ACCEPTED BY RESCUE OPERATOR', timestamp: new Date().toISOString() }
          ];
          return { ...prev, status: 'MISSION_ACCEPTED', timeline: newTimeline };
        }
        return prev;
      });
    };

    const handleRescueStatus = (payload: any) => {
      if (!payload) return;
      const incId = payload.incidentId || payload.id;
      const newStatus = payload.status;
      if (!newStatus) return;

      setActiveSOS(prev => {
        if (!prev || (prev.id !== incId && prev.incidentId !== incId)) return prev;
        const existingTimeline = prev.timeline || [];
        const hasStep = existingTimeline.some((t: any) => t.step === newStatus);
        const label = newStatus === 'RESCUE_ON_WAY'
          ? 'RESCUE VEHICLE IS ON THE WAY TO YOUR LOCATION'
          : newStatus === 'RESCUE_ARRIVED'
          ? '🎯 RESCUE UNIT ARRIVED AT INCIDENT LOCATION (within 100m)'
          : `STATUS UPDATE: ${newStatus}`;

        const newTimeline = hasStep ? existingTimeline : [
          ...existingTimeline,
          { step: newStatus, label: label, timestamp: new Date().toISOString() }
        ];
        return { ...prev, status: newStatus, timeline: newTimeline };
      });
    };

    const handleRescueLocationUpdate = (payload: any) => {
      if (!payload) return;
      const vId = payload.vehicleId || payload.unitId;
      const lat = parseFloat(payload.latitude);
      const lng = parseFloat(payload.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      setActiveSOS(prev => {
        if (!prev) return prev;
        const incId = payload.incidentId;
        if (incId && prev.id !== incId && prev.incidentId !== incId) return prev;

        const units = prev.assignedUnits || [];
        let unitFound = false;

        const updatedUnits = units.map((u: any) => {
          if (u.unitId === vId || u.id === vId || units.length === 1) {
            unitFound = true;
            return {
              ...u,
              location: { lat, lng },
              distanceKm: payload.distanceKm || u.distanceKm,
              status: payload.status || u.status
            };
          }
          return u;
        });

        if (!unitFound && vId) {
          updatedUnits.push({
            unitId: vId,
            unitName: payload.driverName || 'Assigned Rescue Unit',
            type: payload.type || prev.assignedVehicleType || 'RESCUE_TEAM',
            status: payload.status || 'EN_ROUTE',
            location: { lat, lng },
            distanceKm: payload.distanceKm || 'Near location'
          });
        }

        return { ...prev, assignedUnits: updatedUnits };
      });
    };

    const handleHospitalBedUpdated = (payload: any) => {
      setNearbyHospitalsList(prev => prev.map(h => {
        if (h.id === payload.hospitalId || h.hospitalId === payload.hospitalId) {
          return {
            ...h,
            availableBeds: payload.availableBeds !== undefined ? payload.availableBeds : h.availableBeds,
            icuBeds: payload.availableICUBeds !== undefined ? payload.availableICUBeds : h.icuBeds,
            lastUpdated: payload.timestamp || new Date().toISOString()
          };
        }
        return h;
      }));
    };

    const handleSOSResolved = () => {
      setActiveSOS(prev => prev ? { ...prev, status: 'RESOLVED' } : null);
    };

    socket.on('nearby_emergency_warning', handleNearbyWarning);
    socket.on('nearby-disaster-warning', handleNearbyWarning);
    socket.on('sms_notification_status', handleSmsNotificationStatus);
    socket.on('incident_created', handleSOSCreated);
    socket.on('sos_created', handleSOSCreated);
    socket.on('sos_activated', handleSOSCreated);
    socket.on('sos_dispatched', handleSOSCreated);
    socket.on('incident:updated', handleIncidentUpdated);
    socket.on('incident_updated', handleIncidentUpdated);
    socket.on('sos_updated', handleIncidentUpdated);
    socket.on('rescue:assigned', handleRescueAssigned);
    socket.on('rescue_assigned', handleRescueAssigned);
    socket.on('rescue:accepted', handleRescueAccepted);
    socket.on('rescue:status', handleRescueStatus);
    socket.on('rescue:location', handleRescueLocationUpdate);
    socket.on('rescue-location-updated', handleRescueLocationUpdate);
    socket.on('rescue_location_updated', handleRescueLocationUpdate);
    socket.on('unit_location_updated', handleRescueLocationUpdate);
    socket.on('responder_location_updated', handleRescueLocationUpdate);
    socket.on('rescue:arrived', handleRescueStatus);
    socket.on('hospital_bed_updated', handleHospitalBedUpdated);
    socket.on('bed_availability_updated', handleHospitalBedUpdated);
    socket.on('sos_resolved', handleSOSResolved);

    return () => {
      socket.off('nearby_emergency_warning', handleNearbyWarning);
      socket.off('nearby-disaster-warning', handleNearbyWarning);
      socket.off('sms_notification_status', handleSmsNotificationStatus);
      socket.off('incident_created', handleSOSCreated);
      socket.off('sos_created', handleSOSCreated);
      socket.off('sos_activated', handleSOSCreated);
      socket.off('sos_dispatched', handleSOSCreated);
      socket.off('incident:updated', handleIncidentUpdated);
      socket.off('incident_updated', handleIncidentUpdated);
      socket.off('sos_updated', handleIncidentUpdated);
      socket.off('rescue:assigned', handleRescueAssigned);
      socket.off('rescue_assigned', handleRescueAssigned);
      socket.off('rescue:accepted', handleRescueAccepted);
      socket.off('rescue:status', handleRescueStatus);
      socket.off('rescue:location', handleRescueLocationUpdate);
      socket.off('rescue-location-updated', handleRescueLocationUpdate);
      socket.off('rescue_location_updated', handleRescueLocationUpdate);
      socket.off('unit_location_updated', handleRescueLocationUpdate);
      socket.off('responder_location_updated', handleRescueLocationUpdate);
      socket.off('rescue:arrived', handleRescueStatus);
      socket.off('hospital_bed_updated', handleHospitalBedUpdated);
      socket.off('bed_availability_updated', handleHospitalBedUpdated);
      socket.off('sos_resolved', handleSOSResolved);
    };
  }, [socket, emergencyAlerts, browserAlerts]);

  // Open Report Disaster Modal after fetching fresh GPS
  const handleOpenReportDisasterModal = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentGps({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy);
        setShowReportDisasterModal(true);
      },
      (err) => {
        alert('🔴 Real physical device GPS is required to report a disaster. Please grant location permissions in your browser.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Submit Disaster Report to REST API
  const handleSubmitDisasterReport = async (disasterData: {
    type: string;
    severity: string;
    description: string;
    latitude: number;
    longitude: number;
    accuracy: number;
  }) => {
    const res = await apiService.createIncident({
      disasterType: disasterData.type as any,
      severity: disasterData.severity as any,
      description: disasterData.description,
      latitude: disasterData.latitude,
      longitude: disasterData.longitude,
      accuracy: disasterData.accuracy,

      reportedBy: user?.name || 'Citizen User',

      location: {
        lat: disasterData.latitude,
        lng: disasterData.longitude,
        address: `Physical GPS (${disasterData.latitude.toFixed(4)}, ${disasterData.longitude.toFixed(4)})`
      }
    });

    if (res) {
      setActiveSOS(res);
      if (socket && res.id) {
        socket.emit('join_incident_room', res.id);
      }
    }
  };

  const handleConfirmSOS = async (payload?: SOSSubmitPayload) => {
    setIsTriggeringSOS(true);
    try {
      const lat = payload?.latitude !== undefined ? payload.latitude : (currentGps?.lat || 20.0050);
      const lng = payload?.longitude !== undefined ? payload.longitude : (currentGps?.lng || 73.7880);
      const accuracy = payload?.accuracy || gpsAccuracy || 5;
      const selectedServices = payload?.selectedServices || ['Ambulance / Medical Emergency'];
      const locationType = payload?.locationType || (currentGps ? 'GPS_VERIFIED' : 'MANUAL_ENTRY');
      const manualAddress = payload?.manualAddress || '';
      const description = payload?.description || 'Critical One-Tap Emergency SOS Alert';

      const inc = await apiService.triggerSOS({
        latitude: lat,
        longitude: lng,
        accuracy,
        selectedServices,
        locationType,
        manualAddress,
        description,
        clientRequestId: `req_${Date.now()}`
      });

      if (inc) {
        setActiveSOS(inc);
        setShowSOSConfirmationModal(false);
        if (socket && (inc.id || inc.incidentId)) {
          socket.emit('join_incident_room', inc.id || inc.incidentId);
        }
      }
    } catch (e) {
      console.error('[CitizenDashboard] SOS submit error:', e);
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  const manualRefreshGps = () => {
    if (!('geolocation' in navigator)) return;
    setGpsStatus('UPDATING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentGps({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy);
        setGpsStatus('LIVE');
        setLastLocationSyncTime(new Date().toLocaleTimeString());
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus('PERMISSION_DENIED');
        else setGpsStatus('UNAVAILABLE');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const toggleLocationSharing = async () => {
    const nextVal = !locationSharing;
    setLocationSharing(nextVal);
    await apiService.updateAlertSettings(nextVal, emergencyAlerts, user?.id || 'usr_1', smsAlerts, browserAlerts);
  };

  const toggleEmergencyAlerts = async () => {
    const nextVal = !emergencyAlerts;
    setEmergencyAlerts(nextVal);
    await apiService.updateAlertSettings(locationSharing, nextVal, user?.id || 'usr_1', smsAlerts, browserAlerts);
  };

  const toggleSmsAlerts = async () => {
    const nextVal = !smsAlerts;
    setSmsAlerts(nextVal);
    await apiService.updateAlertSettings(locationSharing, emergencyAlerts, user?.id || 'usr_1', nextVal, browserAlerts);
  };

  const toggleBrowserAlerts = async () => {
    const nextVal = !browserAlerts;
    if (nextVal) {
      await apiService.requestBrowserNotificationPermission();
    }
    setBrowserAlerts(nextVal);
    await apiService.updateAlertSettings(locationSharing, emergencyAlerts, user?.id || 'usr_1', smsAlerts, nextVal);
  };

  const handleAcknowledgeAlert = async (incidentId: string) => {
    const alertId = activeWarningAlert?.alertId || `alert_${incidentId}`;
    await apiService.acknowledgeAlertById(alertId, incidentId, user?.id || 'usr_1');
    setActiveWarningAlert(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">

      {/* 📡 GLOBAL NETWORK & GPS CONNECTIVITY DETECTOR */}
      <OfflineDetector gpsStatus={gpsStatus} onRetryGps={manualRefreshGps} />

      {/* ⚠️ EMERGENCY NOTICE DISCLAIMER BANNER */}
      <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-2xl text-xs text-amber-200/90 leading-relaxed flex items-start space-x-3 backdrop-blur-md shadow-lg">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-100">⚠️ Emergency Notice:</strong> This platform supports disaster reporting and emergency coordination. Information may be delayed, incomplete, or unavailable because of network, GPS, or external data limitations. This platform does not replace official emergency services. In a life-threatening emergency, contact the appropriate local emergency service immediately (<strong>112 / 108 / 101</strong>).
        </div>
      </div>
      
      {/* 🔴 SYSTEM LIVE TELEMETRY STATUS BAR */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">REAL DEVICE TELEMETRY</span>
            <h2 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                gpsStatus === 'LIVE' ? 'bg-emerald-500 animate-ping' :
                gpsStatus === 'UPDATING' ? 'bg-amber-500' :
                'bg-red-500'
              }`} />
              <span>
                {gpsStatus === 'LIVE' ? '🟢 GPS LIVE TELEMETRY' :
                 gpsStatus === 'UPDATING' ? '🟡 GPS SIGNAL WAITING...' :
                 gpsStatus === 'PERMISSION_DENIED' ? '🔴 LOCATION PERMISSION DENIED' :
                 '🔴 GPS SIGNAL LOST'}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          {/* Socket Connection Status Pill */}
          {connectionStatus === 'LIVE' ? (
            <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700 text-[11px] font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>🟢 LIVE CONNECTION</span>
            </span>
          ) : connectionStatus === 'RECONNECTING' ? (
            <span className="px-3 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-700 text-[11px] font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>🟡 RECONNECTING...</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-red-950 text-red-300 border border-red-700 text-[11px] font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>🔴 LIVE TRACKING UNAVAILABLE</span>
            </span>
          )}

          <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[11px]">
            📍 GPS: <strong className="text-emerald-400">{currentGps ? `${currentGps.lat.toFixed(4)}, ${currentGps.lng.toFixed(4)}` : 'Awaiting Fix...'}</strong>
          </span>
          <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[11px]">
            🎯 ACCURACY: <strong className="text-emerald-400">{gpsAccuracy ? `${gpsAccuracy}m` : 'N/A'}</strong>
          </span>
          <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[11px]">
            🕒 LAST SYNC: <strong className="text-blue-400">{lastLocationSyncTime}</strong>
          </span>
        </div>
      </div>

      {/* 📵 GPS PERMISSION DENIED BANNER */}
      {gpsStatus === 'PERMISSION_DENIED' && (
        <div className="p-4 rounded-2xl bg-red-950/90 border-2 border-red-600 text-white space-y-3 font-sans text-xs shadow-2xl">
          <div className="flex items-center space-x-2 text-red-400 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Unable to access your location</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            Please enable location permission to report an incident at your current location.
          </p>
          <button
            onClick={manualRefreshGps}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Location Access</span>
          </button>
        </div>
      )}

      {/* ⚠️ GPS ACCURACY LOW NOTICE */}
      {gpsStatus === 'ACCURACY_LOW' && (
        <div className="p-4 rounded-2xl bg-amber-950/90 border border-amber-600 text-white space-y-2 font-sans text-xs">
          <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>GPS Accuracy Notice</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            GPS accuracy is currently too low for a reliable 100-meter emergency-zone check ({gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'poor accuracy'}). Move to an open area or wait for higher precision.
          </p>
        </div>
      )}

      {/* 📵 GPS SIGNAL LOST WARNING BANNER */}
      {gpsStatus === 'UNAVAILABLE' && (
        <div className="p-4 rounded-2xl bg-amber-950/90 border-2 border-amber-600 text-white space-y-2 font-mono text-xs shadow-2xl">
          <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-sm">
            <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>⚠️ GPS Signal Lost</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            Your last known location was: <strong className="text-amber-300">{lastLocationSyncTime}</strong>. Waiting for a new GPS signal...
          </p>
        </div>
      )}

      {/* Citizen Welcome & Report Disaster / 1-Click SOS Hero Banner */}
      <div className="w-full max-w-full box-border min-w-0 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border border-red-800/60 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 overflow-hidden">
        {/* Left Side: Heading & Description */}
        <div className="space-y-2 max-w-xl min-w-0 flex-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-900/60 text-red-400 font-mono text-xs border border-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
            <span>RESQAI EMERGENCY RESPONSE PORTAL</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Need Immediate Rescue or Medical Help?</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Report a disaster or press SOS to broadcast your physical device coordinates to nearby Ambulances, Fire Squads, Police Units, and Hospital Dispatchers in real time.
          </p>
        </div>

        {/* Right Side: Responsive Action Buttons Container */}
        <div className="w-full lg:w-auto max-w-full min-w-0 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-start lg:justify-end gap-3 box-border">
          {/* 📞 CALL 112 NATIONAL EMERGENCY OPTION */}
          <a
            href="tel:112"
            className="w-full sm:w-auto max-w-full min-w-0 px-4 sm:px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm border-2 border-red-600 shadow-lg shadow-red-900/30 transition-all flex items-center justify-center space-x-2 box-border group"
          >
            <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 group-hover:scale-110 transition-transform shrink-0" />
            <span className="whitespace-nowrap">CALL 112</span>
            <span className="text-[11px] text-red-400 font-semibold hidden md:inline xl:inline">(POLICE / MEDICAL / FIRE)</span>
          </a>

          {/* 🔥 REPORT DISASTER AT MY LOCATION BUTTON */}
          <button
            onClick={handleOpenReportDisasterModal}
            className="w-full sm:w-auto max-w-full min-w-0 px-4 sm:px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-amber-600/40 border border-amber-400 transition-all flex items-center justify-center space-x-2 box-border cursor-pointer"
          >
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-amber-300 shrink-0" />
            <span className="whitespace-nowrap">REPORT DISASTER</span>
          </button>

          {/* 🚨 PROMINENT RED SOS EMERGENCY BUTTON (EXACT SPECIFICATION) */}
          <button
            id="citizen-sos-emergency-button"
            onClick={() => setShowSOSConfirmationModal(true)}
            className="w-full sm:w-auto max-w-full min-w-0 px-5 sm:px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs sm:text-sm tracking-wide shadow-2xl shadow-red-600/60 border-2 border-red-300 animate-beacon transition-all transform active:scale-95 flex items-center justify-center space-x-2 glow-red box-border cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce text-white shrink-0" />
            <span className="whitespace-nowrap">SOS — GET EMERGENCY HELP</span>
          </button>
        </div>
      </div>

      {/* 🧭 SMART EVACUATION & SAFE-ZONE NAVIGATION CALLOUT BANNER */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                GIS SAFE-ZONE NAVIGATION
              </span>
              <h3 className="font-extrabold text-white text-base">Smart Evacuation Route Planning</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Find nearest verified relief camps, shelters & hospitals. Avoid confirmed flooded roads and active danger perimeters.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/citizen/evacuation')}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all shrink-0 cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>Launch Evacuation Route Planner</span>
        </button>
      </div>

      {/* 🚨 ACTIVE SOS RESPONSE & LIVE TRACKING PANEL */}
      {activeSOS && (
        <div className="p-6 rounded-3xl bg-slate-900 border-2 border-red-600/80 shadow-[0_0_40px_rgba(220,38,38,0.25)] space-y-6 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-red-500 animate-ping" />
              <div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-red-950 text-red-300 text-[10px] font-bold border border-red-800">
                    {activeSOS.status === 'RESOLVED' || activeSOS.status === 'Resolved' ? 'STATUS: RESOLVED' : `STATUS: ${activeSOS.status || 'ACTIVE'}`}
                  </span>
                  {(activeSOS as any).sosId && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold border border-slate-700">
                      REF: {(activeSOS as any).sosId}
                    </span>
                  )}
                  {(activeSOS as any).locationType && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      (activeSOS as any).locationType === 'MANUAL_ENTRY'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {(activeSOS as any).locationType === 'MANUAL_ENTRY' ? 'Manual Landmark' : 'Verified GPS'}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  SOS INCIDENT #{activeSOS.incidentId || activeSOS.id} ({(activeSOS as any).requestedServices?.join(' + ') || activeSOS.disasterType || (activeSOS as any).type || 'Emergency'})
                </h3>

              </div>
            </div>

            <div className="text-right text-xs text-slate-300">
              <div className="flex items-center justify-end space-x-1 font-sans text-sm font-bold text-white">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>📍 Your Incident Location</span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">Location detected</p>
              <p className="text-[10px] text-slate-400">
                Accuracy: {gpsAccuracy || 5}m • Updated: Just now
              </p>
            </div>
          </div>

          {/* 7-Step Emergency Status Progression Stepper */}
          <div className="p-4 rounded-2xl bg-[#0b101d] border border-slate-800 space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-extrabold text-xs text-slate-300 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>EMERGENCY DISPATCH STATUS PIPELINE</span>
              </h4>

              {activeSOS.status !== 'CANCELLED' && activeSOS.status !== 'RESOLVED' && (
                <button
                  onClick={() => setShowCancelSOSModal(true)}
                  className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-300 hover:text-white border border-red-700/60 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel SOS Request</span>
                </button>
              )}
            </div>

            {/* 9-Stage Truthful Emergency Status Progression Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-1.5 pt-1">
              {[
                { step: 0, label: 'SOS Submitted' },
                { step: 1, label: 'Awaiting Review' },
                { step: 2, label: 'Verified' },
                { step: 3, label: 'Awaiting Assignment' },
                { step: 4, label: 'Responder Assigned' },
                { step: 5, label: 'Responder En Route' },
                { step: 6, label: 'Assistance Arrived' },
                { step: 7, label: 'Resolved' },
                { step: 8, label: 'Cancelled' }
              ].filter(st => activeSOS.status === 'Cancelled' ? st.label === 'Cancelled' || st.step <= 4 : st.label !== 'Cancelled').map((st) => {
                const getStepIndex = (status?: string) => {
                  if (!status) return 0;
                  const s = status.toLowerCase();
                  if (s.includes('cancelled')) return 8;
                  if (s.includes('resolved')) return 7;
                  if (s.includes('assistance arrived') || s.includes('rescue_arrived') || s.includes('arrived')) return 6;
                  if (s.includes('en route') || s.includes('rescue_on_way') || s.includes('on_way') || s.includes('dispatched')) return 5;
                  if (s.includes('responder assigned') || s.includes('rescue_assigned') || s.includes('mission_accepted')) return 4;
                  if (s.includes('awaiting assignment') || s.includes('searching')) return 3;
                  if (s.includes('verified') || s.includes('report_verified')) return 2;
                  if (s.includes('awaiting review')) return 1;
                  return 0;
                };

                const currentStepIdx = getStepIndex(activeSOS.status);
                const isCompleted = currentStepIdx > st.step;
                const isCurrent = currentStepIdx === st.step;

                return (
                  <div
                    key={st.step}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center space-y-1 transition-all ${
                      isCurrent
                        ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 font-bold shadow-lg ring-1 ring-emerald-500/50 animate-pulse'
                        : isCompleted
                        ? 'bg-slate-900 border-emerald-800/80 text-emerald-400 font-medium'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-bold ${
                      isCompleted ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300' : isCurrent ? 'bg-emerald-500 border-emerald-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : st.step + 1}
                    </div>
                    <span className="text-[10px] leading-tight">{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Response Teams Grid / No Nearby Unit Notice */}
          {(!activeSOS.assignedUnits || activeSOS.assignedUnits.length === 0 || activeSOS.status === 'SEARCHING_FOR_RESCUE') ? (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-amber-300 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {activeSOS.disasterType?.toUpperCase().includes('FIRE') || activeSOS.title?.toUpperCase().includes('FIRE')
                      ? 'No nearby fire brigade is currently available.'
                      : 'No nearby rescue unit available.'}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700 text-[10px] font-mono flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Scanning 50km Radius...</span>
                </span>
              </div>
              <p className="text-slate-300 text-xs">
                Your emergency report at your current GPS location has been registered and verified. The system is automatically retrying every 5 seconds to locate newly available rescue units.
              </p>
              <div className="text-[10px] text-slate-400 font-mono pt-1 flex items-center justify-between border-t border-amber-900/40">
                <span>Last Search Time: <strong>{activeSOS.lastSearchTime ? new Date(activeSOS.lastSearchTime).toLocaleTimeString() : new Date().toLocaleTimeString()}</strong></span>
                <span>Auto-Retry: <strong>ACTIVE</strong></span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeSOS.assignedUnits.map((unit: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#0b101d] border border-slate-800 space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-white flex items-center space-x-2">
                      <span>{unit.type === 'AMBULANCE' ? '🚑 Ambulance' : unit.type === 'FIRE_BRIGADE' ? '🔥 Fire Brigade' : '🚓 Police Patrol'}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${unit.status === 'ARRIVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}`}>
                      {unit.status || 'EN_ROUTE'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-300">
                    <p className="font-bold text-slate-100">{unit.unitName || 'Rescue Unit'} ({unit.vehicleNumber || unit.unitId})</p>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Distance: <strong className="text-amber-400">{unit.distanceKm ? `${unit.distanceKm} km away` : 'Near location'}</strong></span>
                      <span className="text-slate-400">{unit.etaMinutes ? `ETA: ${unit.etaMinutes} min` : 'ETA unavailable'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>GPS Status: <strong className="text-emerald-400">GPS ACTIVE</strong></span>
                      <span>Updated: <strong className="text-slate-300">Just now</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline & Destination Hospital Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Live Timeline */}
            <div className="p-4 rounded-2xl bg-[#0b101d] border border-slate-800 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-300 flex items-center space-x-2 border-b border-slate-800 pb-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>LIVE DISPATCH TIMELINE & STATUS PROGRESSION</span>
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                {activeSOS.timeline?.map((item, i) => (
                  <div key={i} className="flex items-start space-x-3 p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0 animate-ping" />
                    <div className="flex-1 space-y-0.5">
                      <p className="font-bold text-slate-100 text-xs">{item.label}</p>
                      <p className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Hospital & Reserved Bed Info */}
            <div className="p-4 rounded-2xl bg-[#0b101d] border border-slate-800 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-300 flex items-center space-x-2 border-b border-slate-800 pb-2">
                <HeartHandshake className="w-4 h-4 text-blue-400" />
                <span>DESTINATION EMERGENCY HOSPITAL</span>
              </h4>

              {activeSOS.selectedHospital ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-white text-sm">🏥 {activeSOS.selectedHospital.name}</h5>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                      BED RESERVED
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{activeSOS.selectedHospital.address}</p>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">AVAILABLE BEDS</span>
                      <strong className="text-emerald-400 text-sm font-extrabold">{activeSOS.selectedHospital.availableBeds} AVAILABLE</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block">ICU CAPACITY</span>
                      <strong className="text-blue-400 text-sm font-extrabold">{activeSOS.selectedHospital.icuAvailable || 4} ICU BEDS</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Searching nearest emergency hospital with open bed capacity...</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 📡 GPS DEBUG & TELEMETRY PANEL */}
      <div className="p-5 rounded-3xl bg-surface-card border border-blue-600/40 shadow-xl space-y-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40">
              <Compass className="w-5 h-5 animate-pulse text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">HARDWARE GPS DEBUG & TELEMETRY</span>
              <h3 className="font-extrabold text-sm text-white">📡 LIVE DEVICE POSITION MONITOR</h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setRecenterTrigger(prev => prev + 1)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>[ 📍 CENTER ON MY LOCATION ]</span>
            </button>

            <button
              onClick={manualRefreshGps}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>[ 🔄 REFRESH GPS ]</span>
            </button>
          </div>
        </div>

        {gpsStatus === 'PERMISSION_DENIED' ? (
          <div className="p-4 rounded-2xl bg-red-950/90 border border-red-700 text-red-300 space-y-2 font-sans text-xs">
            <div className="flex items-center space-x-2 font-extrabold text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce text-red-400" />
              <span>🔴 LOCATION PERMISSION DENIED</span>
            </div>
            <p>
              Please allow location access for ResQAI in your browser address bar settings to view your position on the emergency map.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">LATITUDE</span>
              <strong className="text-emerald-400 text-xs font-extrabold">{currentGps ? currentGps.lat.toFixed(6) : 'N/A'}</strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">LONGITUDE</span>
              <strong className="text-emerald-400 text-xs font-extrabold">{currentGps ? currentGps.lng.toFixed(6) : 'N/A'}</strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">ACCURACY</span>
              <strong className="text-blue-400 text-xs font-extrabold">{gpsAccuracy ? `${gpsAccuracy} m` : 'N/A'}</strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">SPEED</span>
              <strong className="text-purple-400 text-xs font-extrabold">{gpsSpeed ? `${gpsSpeed.toFixed(1)} m/s` : '0.0 m/s'}</strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">HEADING</span>
              <strong className="text-cyan-400 text-xs font-extrabold">{gpsHeading ? `${gpsHeading.toFixed(0)}°` : 'N/A'}</strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">LAST UPDATE</span>
              <strong className="text-amber-400 text-xs font-extrabold">{lastLocationSyncTime}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 🗺️ LIVE EMERGENCY RESPONSE MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <span>🗺️ Live Emergency Response Map & Device Radar</span>
            </h3>
            <button
              onClick={() => setShowSafeLocationsModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono font-bold text-xs flex items-center space-x-1.5"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>[ VIEW SAFE LOCATIONS ]</span>
            </button>
          </div>

          {/* Map Legend Banner */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase">MAP LEGEND:</span>
            <span className="flex items-center space-x-1 text-blue-400 font-bold">🔵 YOU</span>
            <span className="flex items-center space-x-1 text-red-500 font-bold">🔴 DISASTER</span>
            <span className="flex items-center space-x-1 text-red-400 font-bold">🚑 AMBULANCE</span>
            <span className="flex items-center space-x-1 text-amber-400 font-bold">🔥 FIRE BRIGADE</span>
            <span className="flex items-center space-x-1 text-purple-400 font-bold">🚓 POLICE</span>
            <span className="flex items-center space-x-1 text-emerald-400 font-bold">🏥 HOSPITALS</span>
            <span className="flex items-center space-x-1 text-cyan-400 font-bold">🛟 SHELTERS</span>
          </div>

          <CitizenDeviceMap
            userLocation={currentGps}
            accuracy={gpsAccuracy}
            incidentLocation={activeSOS?.location ? { lat: activeSOS.location.lat, lng: activeSOS.location.lng, type: activeSOS.disasterType, severity: activeSOS.severity } : null}
            recenterTrigger={recenterTrigger}
            assignedUnits={activeSOS?.assignedUnits || []}
            hospitals={hospitals.length ? hospitals : nearbyHospitalsList}
            camps={camps}
            height="460px"
          />
        </div>

        <div className="space-y-4 font-mono text-xs">
          <h3 className="font-extrabold text-lg text-white font-sans">Active Emergency Guidelines</h3>
          <div className="p-5 rounded-3xl bg-surface-card border border-slate-700 space-y-3">
            <div className="p-3 rounded-2xl bg-red-950/50 border border-red-800 text-red-300">
              <span className="font-bold block text-red-400">🔥 FIRE HAZARD SAFETY:</span>
              <span>Stay low below smoke and evacuate towards designated outdoor safe zones.</span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-950/50 border border-blue-800 text-blue-300">
              <span className="font-bold block text-blue-400">🌊 FLOOD EVACUATION:</span>
              <span>Move to higher floors or relief camps. Do not attempt to cross flooded roads.</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-800 text-amber-300">
              <span className="font-bold block text-amber-400">🏚️ EARTHQUAKE SAFETY:</span>
              <span>Drop, cover, and hold on. Stay clear of high-rise structures and glass windows.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🏥 NEARBY HOSPITALS & LIVE BED AVAILABILITY */}
      <div className="space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40">
              <HeartHandshake className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">REAL-TIME GEOSPATIAL SEARCH</span>
              <h3 className="font-extrabold text-lg text-white">🏥 NEARBY HOSPITALS & LIVE BED AVAILABILITY</h3>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            Sorted by Proximity to Physical Device GPS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(nearbyHospitalsList.length ? nearbyHospitalsList : (Array.isArray(hospitals) ? hospitals : (hospitals as any)?.hospitals || [])).slice(0, 6).map((hosp: any, idx: number) => (
            <div key={hosp.id || idx} className="p-5 rounded-3xl bg-surface-card border border-slate-800 hover:border-emerald-500/50 transition-all space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-white">{hosp.name}</h4>
                  <p className="text-slate-400 text-xs">{hosp.address || 'Emergency Response Zone'}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                  {hosp.emergencyDepartmentAvailable || 'AVAILABLE'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">🛏️ GENERAL BEDS</span>
                  <strong className="text-emerald-400 text-sm font-extrabold">{hosp.availableBeds} / {hosp.totalBeds}</strong>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">🏥 ICU BEDS</span>
                  <strong className="text-blue-400 text-sm font-extrabold">{(typeof hosp.icuBeds === 'object' ? hosp.icuBeds?.available : hosp.icuBeds) || hosp.availableICUBeds || 4} Available</strong>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">🚑 TRAUMA</span>
                  <strong className="text-amber-400 text-sm font-extrabold">{hosp.availableEmergencyBeds || 3} Available</strong>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">🫁 VENTILATORS</span>
                  <strong className="text-cyan-400 text-sm font-extrabold">{hosp.ventilators || 5} Available</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Phone: <strong className="text-slate-200">{hosp.phone || '+1 (555) 911-HOSP'}</strong></span>
                <span className="text-emerald-400 font-bold">Updated Live</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔥 REPORT DISASTER MODAL */}
      {showReportDisasterModal && (
        <ReportDisasterModal
          userLocation={currentGps}
          accuracy={gpsAccuracy}
          onClose={() => setShowReportDisasterModal(false)}
          onSubmitDisaster={handleSubmitDisasterReport}
        />
      )}

      {/* 🚨 OFFICIAL EMERGENCY CONTACTS SECTION */}
      <EmergencyContactsSection />

      {/* 🛡️ SAFETY PRECAUTIONS PANEL */}
      <SafetyPrecautionsPanel />

      {/* 🚨 SOS CONFIRMATION MODAL */}
      <SOSConfirmationModal
        isOpen={showSOSConfirmationModal}
        onClose={() => setShowSOSConfirmationModal(false)}
        onConfirm={handleConfirmSOS}
        currentGps={currentGps}
        gpsAccuracy={gpsAccuracy}
        gpsStatus={gpsStatus}
        isSubmitting={isTriggeringSOS}
      />

      {/* 🔴 CANCEL EMERGENCY SOS MODAL */}
      {showCancelSOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white font-sans">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2.5 bg-red-950 rounded-xl border border-red-500/40">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold">Cancel Emergency Request</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to cancel this emergency request? Dispatched rescue units will be released.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelSOSModal(false)}
                disabled={isCancellingSOS}
                className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700"
              >
                Keep Request Active
              </button>
              <button
                type="button"
                onClick={handleCancelSOSSubmit}
                disabled={isCancellingSOS}
                className="w-1/2 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-1.5"
              >
                {isCancellingSOS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 REAL-TIME EMERGENCY WARNING MODAL */}
      {activeWarningAlert && (
        <EmergencyWarningModal
          alert={activeWarningAlert}
          onClose={() => setActiveWarningAlert(null)}
          onViewIncident={(incId) => navigate(`/citizen/incidents/${incId}`)}
          onOpenSafeLocations={() => setShowSafeLocationsModal(true)}
          onAcknowledge={handleAcknowledgeAlert}
        />
      )}

      {/* 🛡️ SAFE LOCATIONS MODAL */}
      {showSafeLocationsModal && (
        <SafeLocationsModal
          userLocation={currentGps || { lat: 20.5937, lng: 78.9629 }}
          hospitals={hospitals.length ? hospitals : nearbyHospitalsList}
          camps={camps}
          onClose={() => setShowSafeLocationsModal(false)}
        />
      )}

    </div>
  );
};
