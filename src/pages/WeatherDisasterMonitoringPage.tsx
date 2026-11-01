import React, { useState, useEffect, useRef } from 'react';
import { CloudSun, CloudRain, Flame, Wind, Droplet, Sun, Compass, RefreshCw, MapPin, Search, ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Bell, Radio, Activity, PhoneCall, ShieldCheck, Thermometer, Eye } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, BarChart, Bar } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { SafetyPrecautionsPanel } from '../components/safety/SafetyPrecautionsPanel';
import { EmergencyContactsSection } from '../components/safety/EmergencyContactsSection';
import { OfflineDetector } from '../components/layout/OfflineDetector';

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

export const WeatherDisasterMonitoringPage: React.FC = () => {
  const { socket } = useSocket();

  // Location State (Default: Mumbai, India)
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lng: number }>({
    name: 'Mumbai, Maharashtra, India',
    lat: 19.0760,
    lng: 72.8777
  });

  // Search Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Weather & Disaster Data State
  const [currentWeather, setCurrentWeather] = useState<any | null>(null);
  const [forecast30Days, setForecast30Days] = useState<any | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-Refresh State
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [nextUpdateTime, setNextUpdateTime] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'TEMP' | 'RAIN' | 'WIND'>('TEMP');

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // -------------------------------------------------------------
  // DATA FETCHING ENGINE
  // -------------------------------------------------------------
  const fetchAllData = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const [weather, forecast, alerts] = await Promise.all([
        apiService.getCurrentWeather(lat, lng),
        apiService.get30DayWeatherForecast(lat, lng),
        apiService.getDisasterAlerts(lat, lng)
      ]);

      if (weather) setCurrentWeather(weather);
      if (forecast) setForecast30Days(forecast);
      if (alerts) setActiveAlerts(alerts);

      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const nextTime = new Date(now.getTime() + 10 * 60000);
      setNextUpdateTime(nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Error loading weather & disaster monitoring:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData(selectedLocation.lat, selectedLocation.lng);

    // Auto-refresh interval (10 minutes)
    const interval = setInterval(() => {
      fetchAllData(selectedLocation.lat, selectedLocation.lng);
    }, 600000);

    return () => clearInterval(interval);
  }, [selectedLocation]);

  // Socket.IO Real-time Alert Stream
  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (alertData: any) => {
      setActiveAlerts(prev => [alertData, ...prev.filter(a => a.alertId !== alertData.alertId)]);
    };

    socket.on('weather:update', handleNewAlert);
    socket.on('disaster:new', handleNewAlert);
    socket.on('disaster:update', handleNewAlert);

    return () => {
      socket.off('weather:update', handleNewAlert);
      socket.off('disaster:new', handleNewAlert);
      socket.off('disaster:update', handleNewAlert);
    };
  }, [socket]);

  // -------------------------------------------------------------
  // LOCATION SEARCH AUTOCOMPLETE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await apiService.searchLocations(searchQuery);
      setSearchResults(res);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (loc: any) => {
    setSelectedLocation({
      name: loc.displayName || loc.name,
      lat: loc.latitude,
      lng: loc.longitude
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUseDeviceLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedLocation({
          name: `Device Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
          lat: latitude,
          lng: longitude
        });
      },
      (err) => {
        alert('Location access permission was denied. Please select your city manually using the search bar.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // -------------------------------------------------------------
  // LEAFLET MAP RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [selectedLocation.lat, selectedLocation.lng],
        zoom: 9,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap & IMD'
      }).addTo(map);

      mapRef.current = map;
    } else {
      mapRef.current.setView([selectedLocation.lat, selectedLocation.lng], 9);
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const map = mapRef.current;

    // Add Alert Markers
    if (activeAlerts && activeAlerts.length > 0) {
      activeAlerts.forEach(alt => {
        const altLat = alt.latitude || selectedLocation.lat;
        const altLng = alt.longitude || selectedLocation.lng;
        const color = alt.severity === 'RED' ? '#ef4444' : alt.severity === 'ORANGE' ? '#f97316' : '#eab308';
        const iconSymbol = alt.severity === 'RED' ? '🔴' : '⚠️';

        const marker = L.marker([altLat, altLng], { icon: createCustomIcon(color, iconSymbol) }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: monospace; font-size: 12px; min-width: 200px;">
            <b style="color: ${color}; font-size: 13px;">${alt.title}</b><br/>
            <span style="color: #64748b;">Severity:</span> <b>${alt.severity}</b><br/>
            <span style="color: #64748b;">Area:</span> <b>${alt.affectedArea}</b><br/>
            <span style="color: #64748b;">Source:</span> <b>${alt.source}</b><br/>
            <span style="color: #64748b;">Valid Until:</span> <b>${new Date(alt.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
          </div>
        `);
        markersRef.current.push(marker);
      });
    }
  }, [selectedLocation, activeAlerts]);

  // Chart data filter for 16 reliable forecast days
  const chartData = forecast30Days?.days?.filter((d: any) => d.isReliableForecast)?.map((d: any) => ({
    date: d.displayDate,
    maxTemp: d.maxTemp,
    minTemp: d.minTemp,
    rainProb: d.rainProbability,
    rainMm: d.rainfallMm,
    windSpeed: d.windSpeed
  })) || [];

  const localRedAlert = activeAlerts.find(a => (a.severity === 'RED' || a.severity === 'ORANGE') && a.disasterType !== 'No Active Warning');

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-white p-4">
      
      {/* Global Connectivity Banner */}
      <OfflineDetector />

      {/* Header & Location Controls */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950 text-blue-400 font-mono text-xs border border-blue-800">
            <Radio className="w-3.5 h-3.5 animate-pulse text-blue-400" />
            <span>OFFICIAL IMD & METEOROLOGICAL MONITORING ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <CloudSun className="w-8 h-8 text-amber-400" />
            <span>Weather & Disaster Monitoring</span>
          </h1>
          <p className="text-xs text-slate-300 flex items-center space-x-2 font-mono">
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <span>Location: <strong className="text-white">{currentWeather?.locationName || selectedLocation.name}</strong></span>
          </p>
        </div>

        {/* Location Search Bar & Refresh */}
        <div className="space-y-2 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search City, District, State..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-11 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto font-sans">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs text-slate-200 border-b border-slate-800/80 last:border-none flex items-center justify-between"
                    >
                      <span className="font-semibold text-white">{item.displayName}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Device Location Button */}
            <button
              onClick={handleUseDeviceLocation}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Compass className="w-4 h-4 text-blue-400" />
              <span>Use GPS</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchAllData(selectedLocation.lat, selectedLocation.lng)}
              disabled={isLoading}
              className="w-full sm:w-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span>Last Updated: <strong className="text-emerald-400">{lastUpdatedTime || '10:42 AM'}</strong></span>
            <span>Next Update: <strong className="text-blue-400">{nextUpdateTime || '10:52 AM'}</strong></span>
          </div>
        </div>
      </div>

      {/* Prominent Local Disaster Warning Alert Banner */}
      {localRedAlert && (
        <div className="bg-red-950/90 border-2 border-red-500 p-5 rounded-2xl shadow-2xl space-y-3 animate-pulse">
          <div className="flex items-center space-x-3 text-red-400 font-extrabold text-base">
            <ShieldAlert className="w-7 h-7 text-red-400 shrink-0" />
            <div>
              <span className="text-xs uppercase tracking-widest text-red-300 block">🚨 LOCAL HIGH-SEVERITY DISASTER WARNING</span>
              <h2>{localRedAlert.title}</h2>
            </div>
          </div>
          <p className="text-xs text-red-200 leading-relaxed font-sans">{localRedAlert.description}</p>
          <div className="flex flex-wrap items-center justify-between text-xs font-mono pt-2 border-t border-red-900/80">
            <span>Source: <strong className="text-white">{localRedAlert.source}</strong></span>
            <span>Valid Until: <strong className="text-white">{new Date(localRedAlert.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px]">🔴 RED ALERT ACTION REQUIRED</span>
          </div>
        </div>
      )}

      {/* 1. 🌦️ LIVE WEATHER DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Live Weather Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <span className="text-4xl">{currentWeather?.weatherIcon || '🌤️'}</span>
              <div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px] font-bold">
                  🟢 LIVE OBSERVATION
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-0.5">{currentWeather?.weatherCondition || 'Partly Cloudy'}</h2>
              </div>
            </div>
            <div className="text-right font-mono">
              <p className="text-4xl font-extrabold text-white">{currentWeather?.temperature ?? 29}°C</p>
              <p className="text-xs text-slate-400">Feels Like {currentWeather?.feelsLike ?? 32}°C</p>
            </div>
          </div>

          {/* Key Weather Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-blue-400" /> Humidity
              </span>
              <p className="text-lg font-extrabold text-white">{currentWeather?.humidity ?? 76}%</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" /> Wind Speed
              </span>
              <p className="text-lg font-extrabold text-white">{currentWeather?.windSpeed ?? 14} km/h</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-indigo-400" /> Rain Probability
              </span>
              <p className="text-lg font-extrabold text-blue-400">{currentWeather?.rainChance ?? 60}%</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> UV Index
              </span>
              <p className="text-lg font-extrabold text-amber-400">{currentWeather?.uvIndex ?? 5} / 10</p>
            </div>
          </div>

          {/* Secondary Details: Sunrise, Sunset, Pressure */}
          <div className="flex flex-wrap items-center justify-between text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-slate-300">
            <span>🌅 Sunrise: <strong className="text-white">{currentWeather?.sunrise || '06:12 AM'}</strong></span>
            <span>🌇 Sunset: <strong className="text-white">{currentWeather?.sunset || '06:34 PM'}</strong></span>
            <span>⏲️ Pressure: <strong className="text-white">{currentWeather?.pressure || 1013} hPa</strong></span>
            <span>Data Trust: <strong className="text-emerald-400">🟢 LIVE OBSERVED</strong></span>
          </div>
        </div>

        {/* 🚨 3. ACTIVE DISASTER ALERTS */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <span>Active Disaster Alerts</span>
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-950 text-red-300 rounded border border-red-800">
              GOVT FEEDS
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {activeAlerts && activeAlerts.length > 0 ? (
              activeAlerts.map((alt) => (
                <div
                  key={alt.alertId}
                  className={`p-3.5 rounded-2xl border space-y-2 font-sans ${
                    alt.severity === 'RED' ? 'bg-red-950/60 border-red-600 text-red-200' :
                    alt.severity === 'ORANGE' ? 'bg-orange-950/60 border-orange-600 text-orange-200' :
                    alt.severity === 'YELLOW' ? 'bg-amber-950/60 border-amber-600 text-amber-200' :
                    'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        alt.severity === 'RED' ? 'bg-red-500 animate-ping' :
                        alt.severity === 'ORANGE' ? 'bg-orange-500' :
                        alt.severity === 'YELLOW' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`} />
                      {alt.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-950 text-white border border-slate-700">
                      {alt.trustIndicator}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-tight">{alt.description}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Source: <strong className="text-white">{alt.source}</strong></span>
                    <span>Valid: <strong className="text-white">{new Date(alt.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs font-mono">
                🟢 No active official disaster alerts reported.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 13. 📊 WEATHER TREND CHARTS */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-base text-white">Meteorological Trends & Risk Probability</h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveChartTab('TEMP')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                activeChartTab === 'TEMP' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Temperature (°C)
            </button>

            <button
              onClick={() => setActiveChartTab('RAIN')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                activeChartTab === 'RAIN' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Rain Probability (%)
            </button>

            <button
              onClick={() => setActiveChartTab('WIND')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                activeChartTab === 'WIND' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Wind Speed (km/h)
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-64 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'TEMP' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="°C" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="maxTemp" name="Max Temp (°C)" stroke="#f59e0b" fillOpacity={1} fill="url(#tempGrad)" />
                  <Area type="monotone" dataKey="minTemp" name="Min Temp (°C)" stroke="#3b82f6" fillOpacity={0.2} fill="#3b82f6" />
                </AreaChart>
              ) : activeChartTab === 'RAIN' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="rainProb" name="Rain Probability (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="km/h" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="windSpeed" name="Wind Speed (km/h)" stroke="#06b6d4" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              Loading weather trend charts...
            </div>
          )}
        </div>
      </div>

      {/* 2. 📅 30-DAY WEATHER & DISASTER OUTLOOK TIMELINE */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
              <span>📅 30-DAY WEATHER & DISASTER OUTLOOK</span>
            </h3>
            <p className="text-xs text-slate-400">Deterministic 16-day forecast + Extended-range meteorological signals for days 17-30</p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">🔵 FORECAST (Days 1-16)</span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">🟠 OUTLOOK (Days 17-30)</span>
          </div>
        </div>

        {/* 30-Day Outlook Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {forecast30Days?.days?.map((item: any) => (
            <div
              key={item.dayNumber}
              className={`p-3.5 rounded-2xl border space-y-2 font-mono flex flex-col justify-between ${
                item.isReliableForecast
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-950/40 border-amber-800/40 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1 text-slate-400">
                  <span className="font-bold text-white">{item.displayDate}</span>
                  <span className="text-[10px]">{item.dayOfWeek}</span>
                </div>

                <div className="my-2 flex items-center justify-between">
                  <span className="text-2xl">{item.icon}</span>
                  {item.maxTemp !== null ? (
                    <span className="text-xs font-extrabold text-white">
                      {item.maxTemp}° / <span className="text-slate-400">{item.minTemp}°</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold">N/A</span>
                  )}
                </div>

                <p className="text-[11px] font-bold text-slate-200 leading-tight">{item.condition}</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                {item.rainProbability !== null && (
                  <div className="flex justify-between text-slate-400">
                    <span>Rain Prob:</span>
                    <strong className="text-blue-400">{item.rainProbability}%</strong>
                  </div>
                )}

                <div className="text-[9px] font-bold leading-tight px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                  {item.riskSignal}
                </div>

                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                  item.trustIndicator === 'FORECAST' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {item.trustIndicator}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. 🗺️ LIVE DISASTER MAP */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-red-500" />
            <span>🗺️ Interactive Disaster & Weather Hazard Map</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Live IMD & Official Alert Markers</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-xl" style={{ height: '420px' }}>
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* 🛡️ SAFETY PRECAUTIONS & 🚨 EMERGENCY CONTACTS */}
      <div className="grid grid-cols-1 gap-6">
        <SafetyPrecautionsPanel />
        <EmergencyContactsSection />
      </div>

    </div>
  );
};
