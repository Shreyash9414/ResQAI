import React, { useState } from 'react';
import { DisasterPredictionItem } from '../../types';
import { X, CheckCircle, AlertTriangle, Shield, Clock, MapPin, Gauge, FileText, Send, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';

interface PredictionReviewModalProps {
  prediction: DisasterPredictionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: DisasterPredictionItem) => void;
}

export const PredictionReviewModal: React.FC<PredictionReviewModalProps> = ({
  prediction,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !prediction) return null;

  const [status, setStatus] = useState<string>(prediction.status || 'Confirmed');
  const [operatorNotes, setOperatorNotes] = useState<string>(prediction.operatorReview?.notes || '');
  const [triggerNotification, setTriggerNotification] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiService.reviewPrediction(prediction.predictionId, {
        status,
        operatorNotes,
        triggerNotification: status === 'Confirmed' ? triggerNotification : false
      });
      if (res.prediction) {
        onSuccess(res.prediction);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit operator review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'text-rose-400 bg-rose-950/80 border-rose-600/60';
      case 'High':
        return 'text-amber-400 bg-amber-950/80 border-amber-600/60';
      case 'Moderate':
        return 'text-yellow-400 bg-yellow-950/80 border-yellow-600/60';
      default:
        return 'text-blue-400 bg-blue-950/80 border-blue-600/60';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="max-w-2xl w-full bg-[#0a101d] border border-slate-700/80 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                OPERATOR VERIFICATION CONSOLE
              </span>
              <h3 className="text-lg font-bold text-white">Review Disaster Prediction</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prediction Summary Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold text-white">{prediction.disasterType}</span>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getRiskColor(prediction.predictedRiskLevel)}`}>
                {prediction.predictedRiskLevel} RISK
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              ID: <span className="text-white">{prediction.predictionId}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="flex items-center space-x-2 text-slate-300">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{prediction.affectedArea.name} ({prediction.affectedArea.center?.lat?.toFixed(2) || '0.00'}, {prediction.affectedArea.center?.lng?.toFixed(2) || '0.00'})</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Forecast Window: {prediction.forecastWindow?.durationHours || 24} Hours</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Confidence: {Math.round(prediction.confidenceScore <= 1 ? prediction.confidenceScore * 100 : prediction.confidenceScore)}% ({prediction.predictionNature?.replace(/_/g, ' ')})</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Data Sources: {(prediction.supportingDataSources && prediction.supportingDataSources.join(', ')) || 'Open-Meteo & IMD'}</span>
            </div>
          </div>

          {/* Precautions list preview */}
          {prediction.safetyPrecautions && prediction.safetyPrecautions.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[11px] font-semibold text-slate-400 mb-1">Safety Guidelines Attached:</p>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {prediction.safetyPrecautions.slice(0, 3).map((p, idx) => (
                  <li key={idx} className="line-clamp-1">{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Review Status Decision
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
            >
              <option value="Confirmed">Confirmed (Validated Hazard Prediction)</option>
              <option value="Under Review">Under Review (Requires Meteorological Verification)</option>
              <option value="Evaluating">Evaluating (Awaiting Additional Sensor Telemetry)</option>
              <option value="Expired">Expired / Invalid (Threat Passed or Superseded)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Operator Analysis & Rationale
            </label>
            <textarea
              rows={3}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Cross-referenced with IMD Nowcast bulletin. High rainfall threshold breached in catchment area."
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Trigger Alert Checkbox */}
          {status === 'Confirmed' && (
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-4 flex items-start space-x-3">
              <input
                type="checkbox"
                id="triggerAlertCheck"
                checked={triggerNotification}
                onChange={(e) => setTriggerNotification(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
              />
              <label htmlFor="triggerAlertCheck" className="text-xs text-amber-200 cursor-pointer">
                <span className="font-bold block text-amber-300">
                  Broadcast Mass Email Alert To All Eligible Registered Users
                </span>
                Dispatch an immediate, personalized warning email to all verified citizen accounts in MongoDB. Deduplication checks will apply to prevent duplicate emails.
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Review...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Operator Determination</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
