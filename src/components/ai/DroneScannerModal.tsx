import React, { useState } from 'react';
import { Bot, Radio, Eye, AlertTriangle, ShieldCheck, RefreshCw, X, Video } from 'lucide-react';

interface DroneScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DroneScannerModal: React.FC<DroneScannerModalProps> = ({ isOpen, onClose }) => {
  const [scanning, setScanning] = useState(true);
  const [thermalMode, setThermalMode] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0a0f1d] border border-indigo-500/40 rounded-2xl p-6 shadow-2xl glow-blue">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                <span>AI Drone Reconnaissance Stream</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-950 text-indigo-400 rounded border border-indigo-800">
                  YOLOv8 VISION ENGINE
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">LIVE AERIAL FOOTAGE & HAZARD OBJECT RECOGNITION</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Aerial Video Display Container */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
          <img
            src={
              thermalMode
                ? 'https://images.unsplash.com/photo-1579489225078-27977a77b72b?auto=format&fit=crop&w=1200&q=80'
                : 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80'
            }
            alt="Drone Recon Video Feed"
            className={`w-full h-full object-cover transition-all ${thermalMode ? 'hue-rotate-180 contrast-200' : ''}`}
          />

          {/* HUD Bounding Boxes Overlay */}
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
            {/* Top HUD Stats */}
            <div className="flex items-center justify-between">
              <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 border border-emerald-500/40 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>REC 1080P @ 60FPS • TELEMETRY LINKED</span>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-blue-400 border border-blue-500/40">
                ALT: 180M • LAT: 28.6280° N • LNG: 77.2050° E
              </div>
            </div>

            {/* Simulated YOLOv8 Bounding Boxes */}
            <div className="relative flex-1 my-4">
              {/* Box 1: Stranded Victims */}
              <div className="absolute top-[25%] left-[30%] w-[160px] h-[100px] border-2 border-red-500 bg-red-500/10 rounded animate-pulse p-1">
                <span className="bg-red-600 text-white text-[10px] font-bold font-mono px-1 rounded">
                  VICTIM CLUSTER (CONF: 96%)
                </span>
              </div>

              {/* Box 2: Toxic Smoke / Fire */}
              <div className="absolute top-[10%] right-[20%] w-[180px] h-[120px] border-2 border-orange-500 bg-orange-500/10 rounded p-1">
                <span className="bg-orange-600 text-white text-[10px] font-bold font-mono px-1 rounded">
                  SMOKE PLUME HAZARD (CONF: 98%)
                </span>
              </div>

              {/* Box 3: Blocked Route */}
              <div className="absolute bottom-[20%] left-[20%] w-[200px] h-[80px] border-2 border-amber-500 bg-amber-500/10 rounded p-1">
                <span className="bg-amber-600 text-white text-[10px] font-bold font-mono px-1 rounded">
                  BLOCKED ROAD OBSTACLE (CONF: 91%)
                </span>
              </div>
            </div>

            {/* Bottom HUD Bar */}
            <div className="bg-black/80 backdrop-blur-md p-3 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-200">AI Detections:</span>
                <span className="text-red-400 font-bold">3 Stranded Civilian Clusters</span>
                <span className="text-amber-400 font-bold">1 Inundated Road</span>
              </div>
              <span className="text-indigo-400 font-mono font-bold">RISK STATUS: HIGH SEVERITY</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setThermalMode(!thermalMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-2 ${
              thermalMode
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-surface-card text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{thermalMode ? 'DISABLE THERMAL VISION' : 'TOGGLE INFRARED THERMAL VISION'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
          >
            CONFIRM RECONNAISSANCE REPORT
          </button>
        </div>
      </div>
    </div>
  );
};
