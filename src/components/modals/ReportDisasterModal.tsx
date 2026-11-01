import React, { useState } from 'react';
import { AlertTriangle, MapPin, CheckCircle, X, ShieldAlert } from 'lucide-react';

interface ReportDisasterModalProps {
  userLocation: { lat: number; lng: number } | null;
  accuracy: number | null;
  onClose: () => void;
  onSubmitDisaster: (disasterData: {
    type: string;
    severity: string;
    description: string;
    latitude: number;
    longitude: number;
    accuracy: number;
  }) => Promise<void>;
}

export const ReportDisasterModal: React.FC<ReportDisasterModalProps> = ({
  userLocation,
  accuracy,
  onClose,
  onSubmitDisaster
}) => {
  const [selectedType, setSelectedType] = useState<string>('FIRE');
  const [severity, setSeverity] = useState<string>('CRITICAL');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disasterTypes = [
    { id: 'FIRE', label: '🔥 FIRE', color: 'border-red-500 text-red-400 bg-red-950/40' },
    { id: 'FLOOD', label: '🌊 FLOOD', color: 'border-blue-500 text-blue-400 bg-blue-950/40' },
    { id: 'EARTHQUAKE', label: '🌎 EARTHQUAKE', color: 'border-amber-500 text-amber-400 bg-amber-950/40' },
    { id: 'CYCLONE', label: '🌪️ CYCLONE', color: 'border-cyan-500 text-cyan-400 bg-cyan-950/40' },
    { id: 'INDUSTRIAL', label: '🏭 INDUSTRIAL ACCIDENT', color: 'border-purple-500 text-purple-400 bg-purple-950/40' },
    { id: 'ACCIDENT', label: '🚗 ROAD ACCIDENT', color: 'border-rose-500 text-rose-400 bg-rose-950/40' },
    { id: 'OTHER', label: '⚠️ OTHER HAZARD', color: 'border-slate-500 text-slate-300 bg-slate-900' }
  ];

  const severityLevels = [
    { id: 'LOW', label: 'LOW', style: 'border-slate-700 text-slate-300' },
    { id: 'MEDIUM', label: 'MEDIUM', style: 'border-amber-700 text-amber-300' },
    { id: 'HIGH', label: 'HIGH', style: 'border-orange-700 text-orange-300' },
    { id: 'CRITICAL', label: 'CRITICAL', style: 'border-red-600 text-red-400 font-extrabold bg-red-950/60' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLocation) {
      setErrorMessage('🔴 Real physical device GPS location is required to submit a disaster report.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmitDisaster({
        type: selectedType,
        severity: severity,
        description: description || `Critical ${selectedType} emergency reported via CrisisConnect Real Device GPS.`,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        accuracy: accuracy || 5
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit disaster report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="max-w-lg w-full bg-[#0c1222] border-2 border-red-600 rounded-3xl p-6 space-y-5 shadow-[0_0_50px_rgba(220,38,38,0.35)] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3 text-red-500 font-extrabold">
            <div className="p-2 rounded-xl bg-red-950 border border-red-800">
              <ShieldAlert className="w-6 h-6 animate-bounce text-red-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">DISASTER REPORTING ENGINE</span>
              <h3 className="text-lg font-extrabold text-white">🔥 REPORT EMERGENCY AT MY GPS</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real Device Location Info Box */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>AUTHORITATIVE DEVICE GPS LOCATION:</span>
          </span>
          {userLocation ? (
            <p className="text-emerald-400 font-extrabold text-xs">
              Lat: {userLocation.lat.toFixed(6)} • Lng: {userLocation.lng.toFixed(6)} (Accuracy: {accuracy || 5}m)
            </p>
          ) : (
            <p className="text-red-400 font-bold text-xs animate-pulse">
              🔴 Awaiting physical device GPS fix... (Report disabled until GPS fix acquired)
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700 text-red-300 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Disaster Type Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase">SELECT DISASTER TYPE:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {disasterTypes.map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`p-2.5 rounded-xl border text-left font-extrabold text-xs transition-all ${
                    selectedType === t.id
                      ? `${t.color} ring-2 ring-red-500 shadow-lg`
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase">SEVERITY LEVEL:</label>
            <div className="grid grid-cols-4 gap-2">
              {severityLevels.map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  className={`py-2 rounded-xl border font-extrabold text-xs text-center transition-all ${
                    severity === s.id
                      ? 'bg-red-950 text-red-400 border-red-500 ring-2 ring-red-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase">INCIDENT DETAILS / DESCRIPTION:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details regarding casualties, trapped individuals, or immediate hazards..."
              className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all font-sans text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
            >
              [ CANCEL ]
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !userLocation}
              className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-xl shadow-red-600/40 border border-red-400 transition-all flex items-center justify-center space-x-1"
            >
              <span>{isSubmitting ? 'DISPATCHING EMERGENCY...' : '[ 🚨 CONFIRM DISASTER ]'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
