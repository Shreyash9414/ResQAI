import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, Send, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PublishAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdvisoryPublished?: () => void;
}

export const PublishAdvisoryModal: React.FC<PublishAdvisoryModalProps> = ({
  isOpen,
  onClose,
  onAdvisoryPublished
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [disasterType, setDisasterType] = useState('Flood');
  const [severity, setSeverity] = useState<'ADVISORY' | 'WATCH' | 'WARNING' | 'MANDATORY_EVACUATION'>('WARNING');
  const [areaName, setAreaName] = useState('');
  const [centerLat, setCenterLat] = useState('28.6304');
  const [centerLng, setCenterLng] = useState('77.2177');
  const [radiusMeters, setRadiusMeters] = useState(2000);
  const [instructionsText, setInstructionsText] = useState(
    'Move to designated high-ground shelters immediately.\nCarry waterproof emergency packs with medicines.\nDo not attempt driving through submerged crossings.\nCooperate with NDRF & Police disaster units.'
  );
  const [contactHotline, setContactHotline] = useState('1078 / 112 / +91 11 2610 7953');
  const [notes, setNotes] = useState('');
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !areaName.trim()) {
      setErrorMsg('Please specify advisory title and affected area name.');
      return;
    }

    if (!confirmPublish) {
      setErrorMsg('Please review and check the official broadcast confirmation box.');
      return;
    }

    const lat = parseFloat(centerLat);
    const lng = parseFloat(centerLng);
    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg('Invalid latitude or longitude coordinates.');
      return;
    }

    try {
      setIsPublishing(true);
      setErrorMsg(null);

      const instructions = instructionsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await apiService.publishEvacuationAdvisory({
        title: title.trim(),
        disasterType,
        severity,
        affectedArea: {
          name: areaName.trim(),
          center: { lat, lng },
          radiusMeters
        },
        instructions,
        contactHotline: contactHotline.trim(),
        operatorName: user?.name || 'Emergency Operations Commander',
        notes: notes.trim() || undefined
      });

      if (res.success) {
        setSuccessMsg('Evacuation advisory published and broadcast to all field units & citizen channels.');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
          if (onAdvisoryPublished) onAdvisoryPublished();
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Failed to publish advisory.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2.5 text-red-400">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Publish Evacuation Advisory</h3>
              <p className="text-xs text-slate-400">Official emergency order broadcast with audit logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="ADVISORY">Advisory (Voluntary relocation)</option>
                <option value="WATCH">Watch (Heightened preparedness)</option>
                <option value="WARNING">Warning (Active danger approaching)</option>
                <option value="MANDATORY_EVACUATION">Mandatory Evacuation (Immediate order)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Disaster Classification
              </label>
              <select
                value={disasterType}
                onChange={(e) => setDisasterType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="Flood">Flood / Flash Flood</option>
                <option value="Cyclone">Cyclone / Hurricane</option>
                <option value="Firestorm">Wildfire / Industrial Blaze</option>
                <option value="Chemical Hazard">Chemical / Toxic Leak</option>
                <option value="Landslide">Landslide / Mudflow</option>
                <option value="Earthquake">Earthquake Aftershocks</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Advisory Headline
            </label>
            <input
              type="text"
              placeholder="e.g. Mandatory Evacuation Order: Yamuna Floodplains & Low-lying Wards"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Affected Area Name
              </label>
              <input
                type="text"
                placeholder="e.g. North Delhi Basin"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Center Lat, Lng
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  value={centerLat}
                  onChange={(e) => setCenterLat(e.target.value)}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-mono"
                  placeholder="Lat"
                />
                <input
                  type="text"
                  value={centerLng}
                  onChange={(e) => setCenterLng(e.target.value)}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-mono"
                  placeholder="Lng"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Radius (Meters)
              </label>
              <input
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                step="500"
                min="500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Citizen Directives & Safety Instructions (1 per line)
            </label>
            <textarea
              rows={4}
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Emergency Command Contact Hotline
            </label>
            <input
              type="text"
              value={contactHotline}
              onChange={(e) => setContactHotline(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
            />
          </div>

          {/* Audit Log preview */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Audit Logging:</span>
              <span className="text-emerald-400 font-mono">Immutable</span>
            </div>
            <div>Authorized Operator: <span className="text-white font-semibold">{user?.name || 'Commander Alex Vance'}</span></div>
            <div>Timestamp: <span className="font-mono text-slate-300">{new Date().toISOString()}</span></div>
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="confirmAdvisory"
              checked={confirmPublish}
              onChange={(e) => setConfirmPublish(e.target.checked)}
              className="mt-0.5 accent-red-600 rounded w-4 h-4 cursor-pointer"
            />
            <label htmlFor="confirmAdvisory" className="text-xs text-red-200 cursor-pointer font-medium leading-relaxed">
              I certify that this evacuation advisory is officially authorized by disaster command authority. This will trigger real-time hazard map updates for all citizen and responder consoles.
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing || !confirmPublish}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing Advisory...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish Official Evacuation Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
