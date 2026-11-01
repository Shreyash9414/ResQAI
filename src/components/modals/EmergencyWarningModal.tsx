import React from 'react';
import { AlertTriangle, MapPin, ShieldAlert, Navigation, X, CheckCircle, ExternalLink } from 'lucide-react';
import { EmergencyAlertPayload } from '../../types';

interface EmergencyWarningModalProps {
  alert: EmergencyAlertPayload;
  onClose: () => void;
  onViewIncident: (incidentId: string) => void;
  onOpenSafeLocations: () => void;
  onAcknowledge: (incidentId: string) => void;
}

export const EmergencyWarningModal: React.FC<EmergencyWarningModalProps> = ({
  alert,
  onClose,
  onViewIncident,
  onOpenSafeLocations,
  onAcknowledge
}) => {
  const getDisasterIcon = (type?: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('FIRE')) return '🔥';
    if (t.includes('FLOOD')) return '🌊';
    if (t.includes('GAS') || t.includes('CHEM')) return '☣️';
    if (t.includes('EARTH')) return '🏚️';
    return '🚨';
  };

  const iconSymbol = getDisasterIcon(alert.incidentType);

  const handleAcknowledge = () => {
    onAcknowledge(alert.incidentId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0d1322] border-2 border-red-600 shadow-[0_0_50px_rgba(239,68,68,0.5)] overflow-hidden space-y-5 p-6 font-mono">
        
        {/* Pulsing Hazard Header Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-red-950">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-red-600/30 text-red-500 border border-red-500/50 animate-bounce">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px] tracking-widest uppercase">
                🚨 REAL-TIME EMERGENCY WARNING
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1 flex items-center space-x-2">
                <span>{iconSymbol}</span>
                <span>{alert.incidentType || 'HAZARD'} DETECTED NEAR YOU</span>
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Dynamic Distance & Message Box */}
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-red-400 font-extrabold flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-red-500 animate-pulse" />
              <span>DYNAMIC PROXIMITY DISTANCE:</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-extrabold text-sm shadow">
              {alert.distanceMeters} METERS AWAY
            </span>
          </div>

          <p className="text-slate-200 text-sm leading-relaxed font-sans font-semibold">
            A critical <strong className="text-red-400">{alert.incidentType || 'disaster'} hazard</strong> ({alert.title}) has been verified approximately <strong className="text-amber-400">{alert.distanceMeters} meters</strong> from your current GPS location.
          </p>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
            <p className="font-bold text-amber-400 mb-1">⚠️ IMMEDIATE SAFETY DIRECTIONS:</p>
            <p>Please move away from the affected area immediately and seek shelter at the nearest safe emergency location.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                onViewIncident(alert.incidentId);
                onClose();
              }}
              className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold border border-slate-700 flex items-center justify-center space-x-2 transition-all shadow"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>[ VIEW INCIDENT ]</span>
            </button>

            <button
              onClick={() => {
                onOpenSafeLocations();
                onClose();
              }}
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center justify-center space-x-2 transition-all shadow"
            >
              <Navigation className="w-4 h-4" />
              <span>[ SAFE LOCATIONS ]</span>
            </button>
          </div>

          <button
            onClick={handleAcknowledge}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition-all shadow-xl"
          >
            <CheckCircle className="w-5 h-5" />
            <span>[ I UNDERSTAND & ACKNOWLEDGE WARNING ]</span>
          </button>
        </div>

      </div>
    </div>
  );
};
