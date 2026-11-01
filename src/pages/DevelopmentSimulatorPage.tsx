import React, { useState } from 'react';
import { Radio, Send, Play, RefreshCw, Compass, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const DevelopmentSimulatorPage: React.FC = () => {
  const { socket } = useSocket();
  const [targetIncidentId, setTargetIncidentId] = useState<string>('inc_102');
  const [selectedUnit, setSelectedUnit] = useState<string>('AMB-102');
  const [unitType, setUnitType] = useState<string>('AMBULANCE');
  const [simLat, setSimLat] = useState<number>(28.6288);
  const [simLng, setSimLng] = useState<number>(77.2055);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastEmittedTime, setLastEmittedTime] = useState<string>('Not started');

  const handleEmitGps = (lat: number, lng: number) => {
    if (!socket) return;
    socket.emit('responder_location_update', {
      unitId: selectedUnit,
      type: unitType,
      incidentId: targetIncidentId,
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      speed: 12,
      heading: 90,
      timestamp: Date.now()
    });
    setSimLat(lat);
    setSimLng(lng);
    setLastEmittedTime(new Date().toLocaleTimeString());
  };

  const handleStepApproach = () => {
    const nextLat = simLat - 0.0005;
    const nextLng = simLng - 0.0005;
    handleEmitGps(nextLat, nextLng);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-xs p-6">
      
      <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/80 shadow-2xl space-y-3">
        <div className="flex items-center space-x-3 text-amber-400 font-extrabold border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-amber-950 border border-amber-800">
            <Radio className="w-6 h-6 animate-pulse text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">ISOLATED TESTING ENVIRONMENT</span>
            <h2 className="text-xl font-extrabold text-white">🧪 DEVELOPMENT GPS SIMULATOR</h2>
          </div>
        </div>

        <p className="text-slate-300 text-xs font-sans leading-relaxed">
          This page is strictly for single-device college testing and demonstration. The production Citizen Dashboard and Responder Dashboard run 100% on real physical device GPS telemetry.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <label className="text-[10px] font-bold text-slate-400">TARGET INCIDENT ID:</label>
            <input
              type="text"
              value={targetIncidentId}
              onChange={(e) => setTargetIncidentId(e.target.value)}
              className="w-full bg-slate-900 p-2 rounded-xl border border-slate-700 text-emerald-400 font-bold"
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <label className="text-[10px] font-bold text-slate-400">RESPONDER UNIT ID:</label>
            <input
              type="text"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-900 p-2 rounded-xl border border-slate-700 text-blue-400 font-bold"
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <label className="text-[10px] font-bold text-slate-400">UNIT TYPE:</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full bg-slate-900 p-2 rounded-xl border border-slate-700 text-amber-400 font-bold"
            >
              <option value="AMBULANCE">🚑 AMBULANCE</option>
              <option value="FIRE_BRIGADE">🔥 FIRE BRIGADE</option>
              <option value="POLICE">🚓 POLICE PATROL</option>
            </select>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400">CURRENT SIMULATED TELEMETRY:</span>
            <p className="text-emerald-400 font-extrabold text-sm">
              Lat: {simLat.toFixed(6)} • Lng: {simLng.toFixed(6)}
            </p>
            <p className="text-[10px] text-slate-500">Last Telemetry Emit: {lastEmittedTime}</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleStepApproach}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center space-x-1.5"
            >
              <Play className="w-4 h-4" />
              <span>[ STEP TOWARD INCIDENT ]</span>
            </button>

            <button
              onClick={() => handleEmitGps(28.6285, 77.2052)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs border border-slate-700 transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>[ RESET POSITION ]</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
