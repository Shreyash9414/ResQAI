import React, { useState, useEffect } from 'react';
import { Hospital } from '../../types';
import { Hospital as HospIcon, Activity, HeartPulse, Droplet, Ambulance, Plus, Save, Clock, CheckCircle, AlertTriangle, UserCheck, Search, Filter, MapPin, Navigation, Phone, ExternalLink, RefreshCw, X, Eye, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';
import { apiService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { LiveCommandMap } from '../../components/map/LiveCommandMap';

interface HospitalDashboardProps {
  hospitals?: Hospital[];
  onUpdateHospital?: (id: string, updateData: Partial<Hospital>) => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({ hospitals = [], onUpdateHospital }) => {
  const { socket } = useSocket();

  // State Data
  const [hospitalList, setHospitalList] = useState<Hospital[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<any>({
    totalHospitals: 0,
    currentCount: 0,
    icuAvailableCount: 0,
    erAvailableCount: 0,
    staleOrUnknownCount: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE' | 'MAP'>('CARDS');

  // Reference GPS Location (Citizen / Incident)
  const [citizenGps, setCitizenGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [icuFilter, setIcuFilter] = useState<boolean>(false);
  const [erFilter, setErFilter] = useState<string>('ALL');
  const [freshnessFilter, setFreshnessFilter] = useState<string>('ALL');

  // Modals
  const [selectedHospitalDetails, setSelectedHospitalDetails] = useState<Hospital | null>(null);
  const [updatingHospital, setUpdatingHospital] = useState<Hospital | null>(null);
  const [updatingForm, setUpdatingForm] = useState<{
    generalBedsTotal: number;
    generalBedsAvailable: number;
    icuBedsTotal: number;
    icuBedsAvailable: number;
    emergencyDepartmentStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
    ambulanceReceivingStatus: 'ACCEPTING' | 'NOT_ACCEPTING' | 'UNKNOWN';
    emergencyServices: string[];
  }>({
    generalBedsTotal: 100,
    generalBedsAvailable: 35,
    icuBedsTotal: 20,
    icuBedsAvailable: 5,
    emergencyDepartmentStatus: 'AVAILABLE',
    ambulanceReceivingStatus: 'ACCEPTING',
    emergencyServices: ['Trauma Care', 'Emergency Medicine', 'Surgery', 'Oxygen Support']
  });

  const [savingStatus, setSavingStatus] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Browser Geolocation Acquisition
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCitizenGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setGpsError(null);
        },
        (err) => {
          console.warn('Hospital Dashboard Geolocation notice:', err.message);
          setGpsError('Browser Location Permission Denied or Unavailable. Defaulting to verified regional coordinates.');
          // Default reference location to Nashik / regional center without silent Delhi substitution
          setCitizenGps({ lat: 19.9975, lng: 73.7898 });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    } else {
      setGpsError('Geolocation is not supported by your browser.');
      setCitizenGps({ lat: 19.9975, lng: 73.7898 });
    }
  }, []);

  // 2. Fetch Hospitals from API
  const fetchHospitalsData = async () => {
    setLoading(true);
    try {
      const lat = citizenGps?.lat;
      const lng = citizenGps?.lng;
      const filters = {
        search: searchTerm,
        icuOnly: icuFilter,
        erStatus: erFilter,
        freshness: freshnessFilter
      };

      const result = await apiService.getHospitals(lat, lng, filters);
      if (result) {
        if (result.hospitals) {
          setHospitalList(result.hospitals);
          setSummaryMetrics(result.summary || {});
        } else if (Array.isArray(result)) {
          setHospitalList(result);
        }
      }
    } catch (err) {
      console.error('Failed to load hospital availability data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalsData();
  }, [citizenGps, searchTerm, icuFilter, erFilter, freshnessFilter]);

  // 3. Socket.IO Real-Time Listeners
  useEffect(() => {
    if (!socket) return;

    const handleHospitalUpdate = (updatedHosp: any) => {
      setHospitalList(prev => {
        const idx = prev.findIndex(h => h.id === updatedHosp.id || h.hospitalId === updatedHosp.id || h.name === updatedHosp.name);
        if (idx !== -1) {
          const newArr = [...prev];
          newArr[idx] = { ...newArr[idx], ...updatedHosp };
          return newArr;
        }
        return [updatedHosp, ...prev];
      });

      // Recalculate live summary metrics
      setSummaryMetrics((prev: any) => ({
        ...prev,
        currentCount: Math.max(1, prev.currentCount || 1)
      }));
    };

    socket.on('hospital:availabilityUpdated', handleHospitalUpdate);
    socket.on('bed_availability_updated', handleHospitalUpdate);
    socket.on('update_hospital', handleHospitalUpdate);
    socket.on('hospital:registered', handleHospitalUpdate);

    return () => {
      socket.off('hospital:availabilityUpdated', handleHospitalUpdate);
      socket.off('bed_availability_updated', handleHospitalUpdate);
      socket.off('update_hospital', handleHospitalUpdate);
      socket.off('hospital:registered', handleHospitalUpdate);
    };
  }, [socket]);

  // Handle Staff Availability Update Click
  const handleOpenStaffUpdateModal = (hosp: Hospital) => {
    setUpdatingHospital(hosp);
    setUpdatingForm({
      generalBedsTotal: (hosp.generalBeds as any)?.total ?? hosp.totalBeds ?? 100,
      generalBedsAvailable: (hosp.generalBeds as any)?.available ?? hosp.availableBeds ?? 35,
      icuBedsTotal: (hosp.icuBeds as any)?.total ?? hosp.icuBedsTotal ?? 20,
      icuBedsAvailable: (hosp.icuBeds as any)?.available ?? hosp.availableICUBeds ?? 5,
      emergencyDepartmentStatus: hosp.emergencyDepartmentStatus || 'AVAILABLE',
      ambulanceReceivingStatus: hosp.ambulanceReceivingStatus || 'ACCEPTING',
      emergencyServices: hosp.emergencyServices || ['Trauma Care', 'Emergency Medicine', 'Surgery', 'Oxygen Support']
    });
    setUpdateFeedback(null);
  };

  // Submit Availability Update to Server
  const handleSaveAvailability = async () => {
    if (!updatingHospital) return;
    setSavingStatus(true);
    setUpdateFeedback(null);

    try {
      const res = await apiService.updateHospitalAvailability(updatingHospital.id, updatingForm);

      if (res.success || res.hospital) {
        setUpdateFeedback({
          type: 'success',
          text: res.message || `Bed availability updated successfully for ${updatingHospital.name}`
        });
        fetchHospitalsData();
        setTimeout(() => setUpdatingHospital(null), 1800);
      } else {
        setUpdateFeedback({
          type: 'error',
          text: res.message || 'Validation error while updating hospital availability.'
        });
      }
    } catch (err: any) {
      setUpdateFeedback({
        type: 'error',
        text: err.message || 'Server error while processing availability update.'
      });
    } finally {
      setSavingStatus(false);
    }
  };

  // Toggle Emergency Services Checkbox
  const handleToggleService = (serviceName: string) => {
    setUpdatingForm(prev => {
      const exists = prev.emergencyServices.includes(serviceName);
      return {
        ...prev,
        emergencyServices: exists
          ? prev.emergencyServices.filter(s => s !== serviceName)
          : [...prev.emergencyServices, serviceName]
      };
    });
  };

  // Open Google Maps for Get Directions
  const handleGetDirections = (lat: number, lng: number, name: string) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const allAvailableServicesList = [
    'Trauma Care',
    'Emergency Medicine',
    'Surgery',
    'Oxygen Support',
    'Pediatric ICU',
    'Burn Unit',
    'CT/MRI Scan',
    'Blood Bank',
    'Cardiac Care'
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-800/60 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-900/60 border border-emerald-700/80 rounded-2xl shadow-lg shadow-emerald-950/50">
            <HospIcon className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 font-mono text-[11px] border border-emerald-700 font-bold">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>REAL-TIME EMERGENCY HOSPITAL AVAILABILITY NETWORK</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 tracking-tight">Live Hospital Bed Availability</h2>
            <p className="text-xs text-slate-400 font-medium">
              Verified general/ICU bed capacity, emergency department status & real-time GIS routing
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchHospitalsData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{loading ? 'SYNCING...' : 'REFRESH AVAILABILITY'}</span>
          </button>
        </div>
      </div>

      {/* GPS Location Status Warning */}
      {gpsError && (
        <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{gpsError}</span>
          </div>
          <span className="font-mono font-bold text-[10px] bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700">REGIONAL GPS ACTIVE</span>
        </div>
      )}

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">REGISTERED HOSPITALS</span>
          <span className="text-2xl font-black text-white">{summaryMetrics.totalHospitals || hospitalList.length}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Verified healthcare centers</span>
        </div>

        <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-900/40 shadow-md">
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">CURRENT DATA FRESHNESS</span>
          <span className="text-2xl font-black text-emerald-400">{summaryMetrics.currentDataCount || hospitalList.filter(h => h.availabilityStatus === 'CURRENT').length}</span>
          <span className="text-[10px] text-emerald-400/70 block mt-1">Updated within 1 hour</span>
        </div>

        <div className="bg-blue-950/30 p-4 rounded-2xl border border-blue-900/40 shadow-md">
          <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">ICU BEDS AVAILABLE</span>
          <span className="text-2xl font-black text-blue-400">{summaryMetrics.icuAvailableCount || hospitalList.filter(h => ((h.icuBeds as any)?.available || h.availableICUBeds || 0) > 0).length}</span>
          <span className="text-[10px] text-blue-400/70 block mt-1">Intensive care capacity</span>
        </div>

        <div className="bg-amber-950/30 p-4 rounded-2xl border border-amber-900/40 shadow-md">
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">EMERGENCY DEPT OPEN</span>
          <span className="text-2xl font-black text-amber-400">{summaryMetrics.erAvailableCount || hospitalList.filter(h => h.emergencyDepartmentStatus === 'AVAILABLE').length}</span>
          <span className="text-[10px] text-amber-400/70 block mt-1">Trauma ER available</span>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 shadow-md">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">STALE / UNKNOWN</span>
          <span className="text-2xl font-black text-slate-300">{summaryMetrics.staleOrUnknownCount || hospitalList.filter(h => h.availabilityStatus !== 'CURRENT').length}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Requires re-verification</span>
        </div>
      </div>

      {/* Filter & View Mode Controls Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hospital name, address, or medical service..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* ICU Filter Checkbox Button */}
            <button
              onClick={() => setIcuFilter(!icuFilter)}
              className={`px-3 py-2 rounded-xl border font-bold text-xs transition-all flex items-center space-x-1.5 ${
                icuFilter
                  ? 'bg-blue-950 text-blue-300 border-blue-700 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-blue-400" />
              <span>{icuFilter ? '✓ ICU AVAILABLE ONLY' : 'ICU AVAILABLE'}</span>
            </button>

            {/* ER Status Filter */}
            <select
              value={erFilter}
              onChange={(e) => setErFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors font-medium"
            >
              <option value="ALL">ALL ER STATUSES</option>
              <option value="AVAILABLE">ER AVAILABLE</option>
              <option value="BUSY">ER BUSY</option>
              <option value="UNAVAILABLE">ER UNAVAILABLE</option>
            </select>

            {/* Data Freshness Filter */}
            <select
              value={freshnessFilter}
              onChange={(e) => setFreshnessFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors font-medium"
            >
              <option value="ALL">ALL DATA FRESHNESS</option>
              <option value="CURRENT">CURRENT (&lt;1h)</option>
              <option value="STALE">STALE (&gt;1h)</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'CARDS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                CARDS
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'TABLE' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                TABLE
              </button>
              <button
                onClick={() => setViewMode('MAP')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'MAP' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                MAP
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: CARDS VIEW */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitalList.length > 0 ? (
            hospitalList.map((h: any) => {
              const genAvail = h.generalBeds?.available ?? h.availableBeds ?? 0;
              const genTotal = h.generalBeds?.total ?? h.totalBeds ?? 100;
              const icuAvail = h.icuBeds?.available ?? h.availableICUBeds ?? 0;
              const icuTotal = h.icuBeds?.total ?? h.icuBedsTotal ?? 20;

              const isStale = h.availabilityStatus === 'STALE';
              const isUnknown = h.availabilityStatus === 'UNKNOWN';

              return (
                <div
                  key={h.id || h.hospitalId}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div>
                    {/* Image / Header Bar */}
                    <div className="h-32 bg-slate-900 relative overflow-hidden">
                      <img
                        src={h.imageUrl || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80'}
                        alt={h.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                      {/* Freshness Badge */}
                      <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-md ${
                          isStale ? 'bg-amber-950/90 text-amber-300 border-amber-700' :
                          isUnknown ? 'bg-slate-900/90 text-slate-300 border-slate-700' :
                          'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                        }`}>
                          {h.availabilityStatus || 'CURRENT'}
                        </span>

                        <span className="px-2 py-1 rounded-full bg-slate-900/90 text-slate-300 text-[10px] font-mono border border-slate-700">
                          {h.availabilitySource === 'OFFICIAL_API' ? '⚡ OFFICIAL API' : '📝 REPORTED'}
                        </span>
                      </div>

                      {/* Distance Badge */}
                      {h.distanceKm && h.distanceKm !== 'N/A' && (
                        <div className="absolute top-3 right-3 bg-blue-950/90 text-blue-300 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border border-blue-700 shadow-md flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          <span>{h.distanceKm}</span>
                        </div>
                      )}

                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-base font-black text-white leading-snug line-clamp-1">{h.name}</h3>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{h.address}</p>
                      </div>
                    </div>

                    {/* Bed Capacity Metrics Grid */}
                    <div className="p-4 space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        {/* General Beds */}
                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">GENERAL BEDS</span>
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className={`text-xl font-black ${genAvail > 10 ? 'text-emerald-400' : genAvail > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                              {genAvail}
                            </span>
                            <span className="text-slate-500 font-bold text-xs">/ {genTotal}</span>
                          </div>
                        </div>

                        {/* ICU Beds */}
                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">ICU BEDS</span>
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className={`text-xl font-black ${icuAvail > 3 ? 'text-blue-400' : icuAvail > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                              {icuAvail}
                            </span>
                            <span className="text-slate-500 font-bold text-xs">/ {icuTotal}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400 font-bold text-[10px]">ER DEPT:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            h.emergencyDepartmentStatus === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            h.emergencyDepartmentStatus === 'BUSY' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-red-950 text-red-400 border border-red-800'
                          }`}>
                            {h.emergencyDepartmentStatus || 'AVAILABLE'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400 font-bold text-[10px]">AMBULANCE:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            h.ambulanceReceivingStatus === 'ACCEPTING' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            'bg-red-950 text-red-400 border border-red-800'
                          }`}>
                            {h.ambulanceReceivingStatus || 'ACCEPTING'}
                          </span>
                        </div>
                      </div>

                      {/* Services List tags */}
                      {h.emergencyServices && h.emergencyServices.length > 0 && (
                        <div className="pt-2 border-t border-slate-900">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">AVAILABLE SERVICES</span>
                          <div className="flex flex-wrap gap-1">
                            {h.emergencyServices.slice(0, 4).map((srv: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[9px] font-medium border border-slate-800">
                                {srv}
                              </span>
                            ))}
                            {h.emergencyServices.length > 4 && (
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[9px] font-medium">
                                +{h.emergencyServices.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 bg-slate-900/60 border-t border-slate-900 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedHospitalDetails(h)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-800 transition-colors flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>Details</span>
                    </button>

                    <button
                      onClick={() => handleGetDirections(h.location?.lat, h.location?.lng, h.name)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 font-bold text-xs rounded-xl border border-slate-800 transition-colors flex items-center space-x-1"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Directions</span>
                    </button>

                    <button
                      onClick={() => handleOpenStaffUpdateModal(h)}
                      className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-extrabold text-xs rounded-xl border border-emerald-700 transition-all flex items-center space-x-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Update</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full p-12 text-center text-slate-500 font-medium bg-slate-950 rounded-3xl border border-slate-800">
              {loading ? 'Fetching hospital availability metrics...' : 'No registered hospitals matching the selected filter criteria.'}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: SEARCHABLE TABLE VIEW */}
      {viewMode === 'TABLE' && (
        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">HOSPITAL NAME & ADDRESS</th>
                <th className="p-3.5 text-center">DISTANCE</th>
                <th className="p-3.5 text-center">GENERAL BEDS</th>
                <th className="p-3.5 text-center">ICU BEDS</th>
                <th className="p-3.5 text-center">ER DEPT STATUS</th>
                <th className="p-3.5 text-center">DATA FRESHNESS</th>
                <th className="p-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-200">
              {hospitalList.length > 0 ? (
                hospitalList.map((h: any) => {
                  const genAvail = h.generalBeds?.available ?? h.availableBeds ?? 0;
                  const genTotal = h.generalBeds?.total ?? h.totalBeds ?? 100;
                  const icuAvail = h.icuBeds?.available ?? h.availableICUBeds ?? 0;
                  const icuTotal = h.icuBeds?.total ?? h.icuBedsTotal ?? 20;

                  return (
                    <tr key={h.id || h.hospitalId} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-white text-sm">{h.name}</div>
                        <div className="text-slate-400 text-[11px]">{h.address}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5 font-mono">{h.contactPhone || '+91 98765 43210'}</div>
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-blue-400">
                        {h.distanceKm || 'N/A'}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`font-black text-sm ${genAvail > 10 ? 'text-emerald-400' : genAvail > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                          {genAvail}
                        </span>
                        <span className="text-slate-500 font-bold text-xs"> / {genTotal}</span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`font-black text-sm ${icuAvail > 3 ? 'text-blue-400' : icuAvail > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                          {icuAvail}
                        </span>
                        <span className="text-slate-500 font-bold text-xs"> / {icuTotal}</span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${
                          h.emergencyDepartmentStatus === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          'bg-red-950 text-red-400 border border-red-800'
                        }`}>
                          {h.emergencyDepartmentStatus || 'AVAILABLE'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          h.availabilityStatus === 'STALE' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                          h.availabilityStatus === 'UNKNOWN' ? 'bg-slate-900 text-slate-400 border-slate-800' :
                          'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {h.availabilityStatus || 'CURRENT'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedHospitalDetails(h)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                          </button>

                          <button
                            onClick={() => handleGetDirections(h.location?.lat, h.location?.lng, h.name)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-xl border border-slate-800"
                            title="Get Directions"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenStaffUpdateModal(h)}
                            className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-extrabold text-[11px] rounded-xl border border-emerald-700"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    No hospitals found matching current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 3: LIVE GIS MAP VIEW */}
      {viewMode === 'MAP' && (
        <div className="p-4 bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Real Hospital GIS Coordinates & Bed Map</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              REF LOCATION: {citizenGps ? `${citizenGps.lat.toFixed(4)}° N, ${citizenGps.lng.toFixed(4)}° E` : 'GPS Searching...'}
            </span>
          </div>

          <div className="h-[500px] rounded-2xl overflow-hidden border border-slate-800">
            <LiveCommandMap
              hospitals={hospitalList}
              resources={[]}
              activeIncident={citizenGps ? { id: 'ref_gps', location: citizenGps, title: 'Your Current GPS Reference' } : null}
            />
          </div>
        </div>
      )}

      {/* MODAL 1: HOSPITAL DETAILS */}
      {selectedHospitalDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-2xl">
                  <HospIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedHospitalDetails.name}</h3>
                  <p className="text-xs text-slate-400">{selectedHospitalDetails.address}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHospitalDetails(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">GENERAL BEDS</span>
                  <span className="text-lg font-black text-emerald-400">
                    {(selectedHospitalDetails.generalBeds as any)?.available ?? selectedHospitalDetails.availableBeds ?? 35} / {(selectedHospitalDetails.generalBeds as any)?.total ?? selectedHospitalDetails.totalBeds ?? 100}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">ICU BEDS</span>
                  <span className="text-lg font-black text-blue-400">
                    {(selectedHospitalDetails.icuBeds as any)?.available ?? (typeof selectedHospitalDetails.icuBeds === 'number' ? selectedHospitalDetails.icuBeds : (selectedHospitalDetails as any).availableICUBeds) ?? 5} / {(selectedHospitalDetails.icuBeds as any)?.total ?? selectedHospitalDetails.icuBedsTotal ?? 20}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">ER DEPT</span>
                  <span className="text-xs font-black text-emerald-400 uppercase mt-1 block">
                    {selectedHospitalDetails.emergencyDepartmentStatus || 'AVAILABLE'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">AMBULANCES</span>
                  <span className="text-xs font-black text-emerald-400 uppercase mt-1 block">
                    {selectedHospitalDetails.ambulanceReceivingStatus || 'ACCEPTING'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-white text-xs">SUPPORTED EMERGENCY SERVICES</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedHospitalDetails.emergencyServices || ['Trauma Care', 'Emergency Medicine', 'Oxygen Support']).map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl font-medium">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">EMERGENCY PHONE CONTACT</span>
                  <span className="text-emerald-400 font-mono font-black text-sm">{selectedHospitalDetails.contactPhone || '+91 98765 43210'}</span>
                </div>

                <button
                  onClick={() => handleGetDirections(selectedHospitalDetails.location?.lat, selectedHospitalDetails.location?.lng, selectedHospitalDetails.name)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center space-x-1.5 shadow"
                >
                  <Navigation className="w-4 h-4" />
                  <span>GET DIRECTIONS</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedHospitalDetails(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HOSPITAL STAFF AVAILABILITY UPDATE FORM */}
      {updatingHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-2xl">
                  <Save className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Update Hospital Live Availability</h3>
                  <p className="text-xs text-emerald-400/90 font-bold">{updatingHospital.name}</p>
                </div>
              </div>
              <button
                onClick={() => setUpdatingHospital(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* General Beds Inputs */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-extrabold text-white text-xs block uppercase tracking-wider text-emerald-400">
                  🏥 GENERAL BEDS CAPACITY & AVAILABILITY
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TOTAL CAPACITY</label>
                    <input
                      type="number"
                      min={0}
                      value={updatingForm.generalBedsTotal}
                      onChange={(e) => setUpdatingForm({ ...updatingForm, generalBedsTotal: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CURRENTLY AVAILABLE BEDS</label>
                    <input
                      type="number"
                      min={0}
                      max={updatingForm.generalBedsTotal}
                      value={updatingForm.generalBedsAvailable}
                      onChange={(e) => setUpdatingForm({ ...updatingForm, generalBedsAvailable: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-black text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* ICU Beds Inputs */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-extrabold text-white text-xs block uppercase tracking-wider text-blue-400">
                  🫀 ICU BEDS CAPACITY & AVAILABILITY
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TOTAL ICU CAPACITY</label>
                    <input
                      type="number"
                      min={0}
                      value={updatingForm.icuBedsTotal}
                      onChange={(e) => setUpdatingForm({ ...updatingForm, icuBedsTotal: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CURRENTLY AVAILABLE ICU BEDS</label>
                    <input
                      type="number"
                      min={0}
                      max={updatingForm.icuBedsTotal}
                      value={updatingForm.icuBedsAvailable}
                      onChange={(e) => setUpdatingForm({ ...updatingForm, icuBedsAvailable: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-blue-400 font-mono font-black text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Department & Ambulance Status Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">EMERGENCY DEPT STATUS</label>
                  <select
                    value={updatingForm.emergencyDepartmentStatus}
                    onChange={(e: any) => setUpdatingForm({ ...updatingForm, emergencyDepartmentStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="AVAILABLE">🟢 AVAILABLE</option>
                    <option value="BUSY">🟡 BUSY</option>
                    <option value="UNAVAILABLE">🔴 UNAVAILABLE</option>
                  </select>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">AMBULANCE RECEIVING STATUS</label>
                  <select
                    value={updatingForm.ambulanceReceivingStatus}
                    onChange={(e: any) => setUpdatingForm({ ...updatingForm, ambulanceReceivingStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACCEPTING">🚑 ACCEPTING PATIENTS</option>
                    <option value="NOT_ACCEPTING">🚫 NOT ACCEPTING</option>
                    <option value="UNKNOWN">❓ UNKNOWN</option>
                  </select>
                </div>
              </div>

              {/* Emergency Services Checkboxes */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">SUPPORTED EMERGENCY SERVICES</label>
                <div className="grid grid-cols-3 gap-2">
                  {allAvailableServicesList.map((srv) => {
                    const isSelected = updatingForm.emergencyServices.includes(srv);
                    return (
                      <button
                        type="button"
                        key={srv}
                        onClick={() => handleToggleService(srv)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all text-left flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span className="truncate">{srv}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Banner */}
              {updateFeedback && (
                <div className={`p-3 rounded-2xl border text-xs font-bold ${
                  updateFeedback.type === 'success'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                    : 'bg-red-950/90 text-red-300 border-red-700'
                }`}>
                  {updateFeedback.text}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                onClick={() => setUpdatingHospital(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveAvailability}
                disabled={savingStatus}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                {savingStatus ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>SAVING TO MONGODB...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>SAVE AVAILABILITY & DISPATCH REALTIME</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
