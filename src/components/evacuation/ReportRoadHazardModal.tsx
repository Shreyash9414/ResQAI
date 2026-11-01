import React, { useState } from 'react';
import { X, AlertTriangle, MapPin, Send, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ReportRoadHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGps: { lat: number; lng: number } | null;
  onReportSubmitted?: () => void;
}

const HAZARD_TYPES = [
  { id: 'FLOODED_ROAD', label: 'Flooded / Waterlogged Road', icon: '🌊' },
  { id: 'FALLEN_TREE', label: 'Fallen Tree / Power Line', icon: '🌲' },
  { id: 'BRIDGE_COLLAPSE', label: 'Bridge / Overpass Damaged', icon: '🌉' },
  { id: 'LANDSLIDE', label: 'Landslide / Rockfall', icon: '⛰️' },
  { id: 'ROAD_DAMAGE', label: 'Severe Road Crater / Sinkhole', icon: '⚠️' },
  { id: 'FIRE_HAZARD', label: 'Active Fire / Smoke Obstruction', icon: '🔥' },
  { id: 'DEBRIS', label: 'Heavy Debris / Structural Rubble', icon: '🧱' },
  { id: 'OTHER', label: 'Other Roadblock / Danger', icon: '🚧' },
];

export const ReportRoadHazardModal: React.FC<ReportRoadHazardModalProps> = ({
  isOpen,
  onClose,
  currentGps,
  onReportSubmitted
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [hazardType, setHazardType] = useState('FLOODED_ROAD');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide a title and detailed description.');
      return;
    }

    if (!currentGps) {
      setErrorMessage('GPS coordinates are required to report a road obstruction.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await apiService.submitRoadReport({
        title: title.trim(),
        description: description.trim(),
        hazardType,
        severity,
        location: {
          lat: currentGps.lat,
          lng: currentGps.lng,
          address: address.trim() || undefined
        },
        radiusMeters,
        reportedBy: {
          citizenId: user?.id || (user as any)?._id || 'anonymous_citizen',
          citizenName: user?.name || 'Anonymous Citizen',
          phone: user?.phone || undefined
        }
      });

      if (res.success) {
        setSuccessMessage('Road obstruction report submitted! Our command operators will verify it immediately.');
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
          if (onReportSubmitted) onReportSubmitted();
        }, 2200);
      } else {
        setErrorMessage(res.message || 'Failed to submit report. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while submitting report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5 text-amber-400">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Report Road Hazard or Obstruction</h3>
              <p className="text-xs text-slate-400">Help protect evacuating citizens and rescue convoys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Location pill */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2 text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>
                Coordinates: {currentGps ? `${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)}` : 'Waiting for GPS...'}
              </span>
            </div>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Auto-Geotagged
            </span>
          </div>

          {/* Hazard Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Hazard Classification
            </label>
            <select
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              {HAZARD_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity & Impact Radius */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="LOW">Low (Passable with caution)</option>
                <option value="MEDIUM">Medium (Slowed traffic)</option>
                <option value="HIGH">High (Major blockage)</option>
                <option value="CRITICAL">Critical (Fully impassable)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Impact Radius (Meters)
              </label>
              <select
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value={100}>100 meters (Local block)</option>
                <option value={200}>200 meters (Intersection)</option>
                <option value={350}>350 meters (Major corridor)</option>
                <option value={500}>500 meters (Zone-wide)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Obstruction Summary
            </label>
            <input
              type="text"
              placeholder="e.g. Underpass submerged under 4ft water, trucks stuck"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>

          {/* Location landmark/street */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Street / Landmark Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Near Old Railway Flyover, Link Road 4"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              On-Ground Observations & Safety Warning
            </label>
            <textarea
              rows={3}
              placeholder="Describe current status, passable vehicle types, hazards (e.g. live wires, rapid current), and nearby detour options..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              required
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200/90 leading-relaxed">
            <strong>Verification Note:</strong> Citizen reports undergo rapid triage by emergency operators before becoming marked as verified road closures on routing maps.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentGps}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Road Hazard Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
