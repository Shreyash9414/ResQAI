import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { 
  EvacuationDestination, 
  EvacuationRouteResponse, 
  EvacuationHazardsFeed, 
  EvacuationAdvisory 
} from '../../types';
import { EvacuationMap } from '../../components/evacuation/EvacuationMap';
import { ReportRoadHazardModal } from '../../components/evacuation/ReportRoadHazardModal';
import { 
  Navigation, 
  MapPin, 
  ShieldAlert, 
  AlertTriangle, 
  Compass, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Info, 
  PhoneCall, 
  Clock, 
  Layers, 
  Car, 
  Footprints, 
  Building2, 
  HeartHandshake, 
  ShieldCheck, 
  Loader2,
  AlertOctagon
} from 'lucide-react';

export const CitizenEvacuationPage: React.FC = () => {
  const { socket, connectionStatus } = useSocket();
  const { user } = useAuth();

  // GPS State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'INITIALIZING' | 'ACQUIRED' | 'DENIED' | 'UNAVAILABLE'>('INITIALIZING');
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);

  // Evacuation Data State
  const [destinations, setDestinations] = useState<EvacuationDestination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<EvacuationDestination | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<'ALL' | 'RELIEF_SHELTER' | 'HOSPITAL'>('ALL');
  const [routeData, setRouteData] = useState<EvacuationRouteResponse | null>(null);
  const [hazards, setHazards] = useState<EvacuationHazardsFeed>({
    disasterZones: [],
    roadClosures: [],
    advisories: [],
    lastUpdated: new Date().toISOString()
  });

  // UI / Status State
  const [travelMode, setTravelMode] = useState<'driving' | 'walking'>('driving');
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Acquire Real Device GPS
  const acquireDeviceGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('UNAVAILABLE');
      setErrorMessage('Geolocation is not supported by your browser or device.');
      return;
    }

    setGpsStatus('INITIALIZING');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsLocation({ lat: latitude, lng: longitude });
        setGpsAccuracy(Math.round(accuracy));
        setGpsStatus('ACQUIRED');
        setErrorMessage(null);
      },
      (error) => {
        console.warn('GPS permission / acquisition issue:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('DENIED');
          setErrorMessage('Location permission was denied. Please allow GPS access in your browser settings to calculate emergency evacuation routes.');
        } else {
          setGpsStatus('UNAVAILABLE');
          setErrorMessage('Unable to determine location from GPS sensors. Click "Retry GPS" or check network.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  // Initial GPS request on mount
  useEffect(() => {
    acquireDeviceGPS();

    // Setup live watch
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsAccuracy(Math.round(pos.coords.accuracy));
          setGpsStatus('ACQUIRED');
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
      setGpsWatchId(id);
    }

    return () => {
      if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
    };
  }, [acquireDeviceGPS]);

  // 2. Fetch Hazards Feed
  const fetchHazards = useCallback(async () => {
    const feed = await apiService.getEvacuationHazards();
    setHazards(feed);
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  useEffect(() => {
    fetchHazards();
  }, [fetchHazards]);

  // 3. Fetch Nearby Safe Destinations when GPS is acquired
  const fetchNearbyDestinations = useCallback(async (lat: number, lng: number) => {
    try {
      setIsLoadingDestinations(true);
      const res = await apiService.getNearbyDestinations(lat, lng, 60);
      setDestinations(res.destinations);

      // Auto-select nearest destination if none is selected
      if (res.destinations.length > 0 && !selectedDestination) {
        setSelectedDestination(res.destinations[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch destinations:', err);
    } finally {
      setIsLoadingDestinations(false);
    }
  }, [selectedDestination]);

  useEffect(() => {
    if (gpsLocation) {
      fetchNearbyDestinations(gpsLocation.lat, gpsLocation.lng);
    }
  }, [gpsLocation, fetchNearbyDestinations]);

  // 4. Calculate Route when origin, destination, or travel mode changes
  const calculateRoute = useCallback(async () => {
    if (!gpsLocation || !selectedDestination) return;

    try {
      setIsCalculatingRoute(true);
      setErrorMessage(null);

      const res = await apiService.calculateEvacuationRoute(
        gpsLocation,
        {
          lat: selectedDestination.location.lat,
          lng: selectedDestination.location.lng,
          name: selectedDestination.name,
          id: selectedDestination.id
        },
        travelMode
      );

      if (res.success && res.route) {
        setRouteData(res.route);
      } else {
        setErrorMessage(res.message || 'Routing provider unavailable. Review official advisory.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to compute route.');
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [gpsLocation, selectedDestination, travelMode]);

  useEffect(() => {
    if (gpsLocation && selectedDestination) {
      calculateRoute();
    }
  }, [gpsLocation, selectedDestination, travelMode, calculateRoute]);

  // 5. Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!socket) return;

    const handleRoadReportUpdate = () => {
      fetchHazards();
      calculateRoute();
    };

    const handleAdvisoryPublished = () => {
      fetchHazards();
    };

    socket.on('evacuation:roadReportVerified', handleRoadReportUpdate);
    socket.on('evacuation:roadReportCreated', handleRoadReportUpdate);
    socket.on('evacuation:advisoryPublished', handleAdvisoryPublished);
    socket.on('evacuation:hazardUpdated', handleRoadReportUpdate);

    return () => {
      socket.off('evacuation:roadReportVerified', handleRoadReportUpdate);
      socket.off('evacuation:roadReportCreated', handleRoadReportUpdate);
      socket.off('evacuation:advisoryPublished', handleAdvisoryPublished);
      socket.off('evacuation:hazardUpdated', handleRoadReportUpdate);
    };
  }, [socket, fetchHazards, calculateRoute]);

  // Filtered destinations list
  const filteredDestinations = useMemo(() => {
    if (destinationFilter === 'ALL') return destinations;
    return destinations.filter(d => d.destinationType === destinationFilter);
  }, [destinations, destinationFilter]);

  // Active Disaster Advisory
  const activeAdvisory = hazards.advisories.find(a => a.status === 'ACTIVE');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Smart Evacuation & Safe-Zone Navigation
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                GIS REAL-TIME
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated road-hazard avoidance, live shelter availability, and official NDRF safety routing
            </p>
          </div>
        </div>

        {/* GPS Status & Refresh Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsStatus === 'ACQUIRED'
                  ? 'bg-emerald-500 animate-ping'
                  : gpsStatus === 'DENIED'
                  ? 'bg-red-500'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-slate-300">
              {gpsStatus === 'ACQUIRED' && gpsLocation
                ? `GPS: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)} (±${gpsAccuracy}m)`
                : gpsStatus === 'DENIED'
                ? 'GPS Denied'
                : 'Locating Device...'}
            </span>
          </div>

          <button
            onClick={acquireDeviceGPS}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
            title="Recalculate location from device GPS"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Refresh GPS</span>
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white border border-amber-500/40 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-lg shadow-amber-950/40"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Report Road Blockage</span>
          </button>
        </div>
      </div>

      {/* GPS Denied Warning Notice if applicable */}
      {gpsStatus === 'DENIED' && (
        <div className="p-4 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start space-x-3 shadow-xl">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-red-100 mb-1">GPS Permission is Blocked in Browser</h4>
            <p className="leading-relaxed">
              ResQAI requires active device coordinates to compute collision-free evacuation routes and locate your nearest verified shelter. Please tap the lock / site settings icon in your address bar and enable Location permission, then click &quot;Refresh GPS&quot;.
            </p>
          </div>
        </div>
      )}

      {/* Active Disaster Evacuation Advisory Alert if present */}
      {activeAdvisory && (
        <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start space-x-3 shadow-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-extrabold text-sm text-amber-100 uppercase tracking-wide">
                📢 {activeAdvisory.severity}: {activeAdvisory.title}
              </span>
              <span className="text-[10px] bg-amber-900/80 text-amber-300 px-2 py-0.5 rounded border border-amber-700">
                Issued by {activeAdvisory.publishedBy.operatorName}
              </span>
            </div>
            <p className="text-amber-200/90 mb-2 leading-relaxed">
              Target Zone: {activeAdvisory.affectedArea.name} ({activeAdvisory.affectedArea.radiusMeters}m perimeter). All residents are instructed to move immediately along verified evacuation corridors toward designated safe shelters.
            </p>
            {activeAdvisory.instructions && activeAdvisory.instructions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-amber-100 font-mono bg-amber-900/30 p-2.5 rounded-xl border border-amber-800/40">
                {activeAdvisory.instructions.map((ins, i) => (
                  <div key={i} className="flex items-center space-x-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{ins}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-[11px] text-amber-300 font-semibold flex items-center space-x-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Emergency Command Helpline: {activeAdvisory.contactHotline}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Map + Destination & Route Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive GIS Evacuation Map (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <EvacuationMap
            citizenLocation={gpsLocation}
            destinations={filteredDestinations}
            selectedDestination={selectedDestination}
            onSelectDestination={(dest) => setSelectedDestination(dest)}
            routeData={routeData}
            hazards={hazards}
            height="580px"
            isRecalculating={isCalculatingRoute}
          />

          {/* Route Status Summary & Avoided Hazards Bar */}
          {routeData && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wide border flex items-center space-x-1.5 ${
                      routeData.status === 'Recommended'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                        : routeData.status === 'Caution'
                        ? 'bg-amber-950/80 text-amber-400 border-amber-500/50'
                        : routeData.status === 'Blocked'
                        ? 'bg-red-950/80 text-red-400 border-red-500/50'
                        : 'bg-purple-950/80 text-purple-400 border-purple-500/50'
                    }`}
                  >
                    <span>ROUTE STATUS: {routeData.status}</span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    {routeData.summary}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setTravelMode('driving')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      travelMode === 'driving'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Driving</span>
                  </button>
                  <button
                    onClick={() => setTravelMode('walking')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      travelMode === 'walking'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Walking</span>
                  </button>
                </div>
              </div>

              {/* Avoided hazards and caution notes */}
              {routeData.warnings && routeData.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {routeData.warnings.map((warn, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2"
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* External Navigation Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-slate-400">
                  Calculated at: <span className="font-mono text-slate-300">{new Date(routeData.lastCalculated).toLocaleTimeString()}</span> · Road Network: OSRM
                </div>

                <div className="flex items-center space-x-2">
                  {routeData.externalNavigation?.googleMapsUrl && (
                    <a
                      href={routeData.externalNavigation.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}

                  {routeData.externalNavigation?.openStreetMapUrl && (
                    <a
                      href={routeData.externalNavigation.openStreetMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
                    >
                      <span>OpenStreetMap</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alternative Bypass Route Toggle Card */}
          {routeData && (routeData as any).alternativeRoute && (
            <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/50 space-y-2 text-xs shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center space-x-1.5">
                  <Navigation className="w-4 h-4 text-indigo-400" />
                  <span>ALTERNATIVE ROAD NETWORK BYPASS AVAILABLE</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-200 text-[10px] font-bold">
                  {(routeData as any).alternativeRoute.distanceKm} km • ~{(routeData as any).alternativeRoute.durationMins} mins
                </span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {(routeData as any).alternativeRoute.summary}
              </p>
              <button
                onClick={() => {
                  const alt = (routeData as any).alternativeRoute;
                  setRouteData({
                    ...routeData,
                    coordinates: alt.coordinates,
                    distanceKm: alt.distanceKm,
                    durationMins: alt.durationMins,
                    status: alt.status,
                    summary: alt.summary,
                    turnSteps: alt.turnSteps || routeData.turnSteps
                  });
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow"
              >
                Switch to Alternative Bypass Path
              </button>
            </div>
          )}

          {/* CRITICAL SAFETY DISCLAIMER */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-red-500/30 text-slate-300 text-xs space-y-2 shadow-xl">
            <div className="flex items-center space-x-2 text-red-400 font-bold uppercase text-[11px] tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>OFFICIAL EMERGENCY EVACUATION SAFETY MANDATE</span>
            </div>
            <p className="text-slate-300/90 text-xs leading-relaxed">
              <strong>Never assume any route is guaranteed safe</strong> merely because a routing algorithm renders a clear path. Rapidly rising floodwaters, structural bridge fissures, electrical power-line falls, or toxic smoke clouds may occur before routing maps update. <strong>Always obey on-ground directives from NDRF, SDRF, Police, and Civil Defense forces.</strong> If blocked or trapped, remain at high ground and contact emergency services immediately.
            </p>
          </div>
        </div>

        {/* Right Column: Safe Destinations Selection & Step Instructions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Destination Filter Tabs */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Nearby Safe Destinations</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {filteredDestinations.length} verified
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium mb-3">
              <button
                onClick={() => setDestinationFilter('ALL')}
                className={`py-1.5 rounded-lg transition-all ${
                  destinationFilter === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDestinationFilter('RELIEF_SHELTER')}
                className={`py-1.5 rounded-lg transition-all ${
                  destinationFilter === 'RELIEF_SHELTER'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Shelters
              </button>
              <button
                onClick={() => setDestinationFilter('HOSPITAL')}
                className={`py-1.5 rounded-lg transition-all ${
                  destinationFilter === 'HOSPITAL'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hospitals
              </button>
            </div>

            {/* Destination Cards List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {isLoadingDestinations ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Discovering verified safe safe-zones...</span>
                </div>
              ) : filteredDestinations.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No verified destinations found within safe proximity. Contact emergency helpline.
                </div>
              ) : (
                filteredDestinations.map((dest) => {
                  const isSelected = selectedDestination?.id === dest.id;
                  const isShelter = dest.destinationType === 'RELIEF_SHELTER';

                  return (
                    <div
                      key={dest.id}
                      onClick={() => setSelectedDestination(dest)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? isShelter
                            ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50'
                            : 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{isShelter ? '⛺' : '🏥'}</span>
                          <div>
                            <h4 className="font-bold text-white text-xs leading-snug">{dest.name}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">{dest.address}</p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold flex-shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Distance & Time Metrics */}
                      <div className="grid grid-cols-3 gap-2 mt-2.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Distance</span>
                          <span className="font-bold text-slate-200">{dest.distanceKm} km</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Drive Time</span>
                          <span className="font-bold text-amber-300">{dest.estimatedDriveTimeMins} min</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Capacity</span>
                          {isShelter ? (
                            <span className="font-bold text-emerald-400">
                              {dest.availableCapacity ?? 'Open'} beds
                            </span>
                          ) : (
                            <span
                              className={`font-bold ${
                                dest.ambulanceReceivingStatus === 'ACCEPTING'
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {dest.availableBeds ?? 'Beds'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact / Service Badges */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1.5">
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Verified Shelter</span>
                        </span>
                        {dest.managerContact && (
                          <span className="text-slate-300 font-mono">
                            📞 {dest.managerContact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Turn-by-Turn Guidance Steps if available */}
          {routeData && routeData.turnSteps && routeData.turnSteps.length > 0 && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-800">
                <Compass className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Navigation Waypoint Steps</h3>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {routeData.turnSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-slate-200 font-medium leading-snug">{step.instruction}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {step.distanceMeters > 1000
                          ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                          : `${step.distanceMeters} m`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Precautions Accordion / List */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2.5">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Evacuation Checklist</h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Documents & Meds:</strong> Carry essential identity docs and personal medications in a waterproof pouch.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Never cross moving water:</strong> 6 inches of rapid current can knock an adult; 12 inches can sweep away cars.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Power Down:</strong> Switch off main circuit breakers and gas valves before leaving premises.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Emergency Hotline:</strong> Dial <strong>112</strong> (National ERSS) or <strong>1078</strong> (NDRF Disaster Line).</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Road Hazard Report Modal */}
      <ReportRoadHazardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentGps={gpsLocation}
        onReportSubmitted={() => {
          fetchHazards();
          calculateRoute();
        }}
      />
    </div>
  );
};
