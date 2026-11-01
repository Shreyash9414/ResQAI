import React, { useState, useEffect } from 'react';
import { Bot, Eye, AlertTriangle, ShieldCheck, Flame, Radio, Zap } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const DroneReconDashboard: React.FC = () => {
  const [thermal, setThermal] = useState(false);
  const { socket } = useSocket();
  const [telemetry, setTelemetry] = useState({
    altitudeMeters: 140,
    speedKmh: 24,
    batteryLevel: 94,
    activeDetectionsCount: 4
  });

  useEffect(() => {
    if (!socket) return;
    socket.on('drone_telemetry', (data: any) => {
      if (data) {
        setTelemetry({
          altitudeMeters: data.altitudeMeters || 140,
          speedKmh: data.speedKmh || 24,
          batteryLevel: data.batteryLevel || 94,
          activeDetectionsCount: data.activeDetectionsCount || 4
        });
      }
    });
    return () => {
      socket.off('drone_telemetry');
    };
  }, [socket]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-800/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-900/60 text-indigo-300 font-mono text-xs border border-indigo-700">
            <Bot className="w-3.5 h-3.5" />
            <span>AERIAL DRONE COMPUTER VISION RECONNAISSANCE</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-1">Autonomous Drone Fleet Stream</h2>
          <p className="text-xs text-slate-400 font-mono">Live YOLOv8 Object Recognition • Thermal Smoke Analysis • Victim Detection</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs font-mono flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold">{telemetry.batteryLevel}% BATT</span>
          </div>
          <button
            onClick={() => setThermal(!thermal)}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>{thermal ? 'NORMAL RGB MODE' : 'INFRARED THERMAL MODE'}</span>
          </button>
        </div>
      </div>

      {/* Main Video Recon Display */}
      <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
        <img
          src={
            thermal
              ? 'https://images.unsplash.com/photo-1579489225078-27977a77b72b?auto=format&fit=crop&w=1200&q=80'
              : 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80'
          }
          alt="Aerial Drone Recon Stream"
          className={`w-full h-full object-cover transition-all ${thermal ? 'hue-rotate-180 contrast-200' : ''}`}
        />

        {/* HUD Bounding Boxes */}
        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 border border-emerald-500/40 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>DRONE SQUADRON DELTA-04 • REALTIME STREAM LINKED</span>
            </div>
            <span className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-blue-400 border border-blue-500/40">
              ALT: {telemetry.altitudeMeters}M • SPEED: {telemetry.speedKmh} KM/H
            </span>
          </div>

          <div className="relative flex-1 my-6">
            <div className="absolute top-[20%] left-[35%] w-[180px] h-[110px] border-2 border-red-500 bg-red-500/20 rounded animate-pulse p-1">
              <span className="bg-red-600 text-white text-[10px] font-bold font-mono px-1 rounded">
                STRANDED VICTIMS (CONF: 96%)
              </span>
            </div>

            <div className="absolute top-[10%] right-[25%] w-[200px] h-[130px] border-2 border-orange-500 bg-orange-500/20 rounded p-1">
              <span className="bg-orange-600 text-white text-[10px] font-bold font-mono px-1 rounded">
                HEAVY SMOKE & BLAZE (CONF: 98%)
              </span>
            </div>
          </div>

          <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-slate-200">AI Active Targets ({telemetry.activeDetectionsCount}):</span>
              <span className="text-red-400 font-bold">12 Victims Trapped</span>
              <span className="text-orange-400 font-bold">Cat 4 Commercial Fire</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold">TELEMETRY SECURE ⚡ LIVE</span>
          </div>
        </div>
      </div>


    </div>
  );
};
