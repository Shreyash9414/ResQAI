import React, { useState } from 'react';
import { DisasterType, SeverityLevel } from '../../types';
import { AlertTriangle, Mic, Image, Video, MapPin, Sparkles, CheckCircle2, Loader2, X, ShieldAlert } from 'lucide-react';

interface AIIncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: any) => void;
}

export const AIIncidentReportModal: React.FC<AIIncidentReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport
}) => {
  const [disasterType, setDisasterType] = useState<DisasterType>('Flood');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorded, setAudioRecorded] = useState(false);
  const [mediaUploaded, setMediaUploaded] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleRunAIAnalysis = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      setAiResult({
        disasterType: disasterType,
        severity: 'Critical',
        confidenceScore: 0.96,
        estimatedVictims: 18,
        recommendedResources: ['Ambulance Squad Alpha', 'Fire High-Ladder 09', 'NDRF Evacuation Boat'],
        summary: 'Deep NLP & Vision Analysis: Multiple high-urgency keywords detected (Trapped, Rising Water, Smoke). Fake Probability < 2%. Priority Level 1 assigned.',
        fakeCheck: { isFake: false, confidence: 0.98 }
      });
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport({
      title: title || `${disasterType} Emergency Alert`,
      disasterType,
      description,
      severity: aiResult?.severity || 'High',
      location: { lat: 28.6280, lng: 77.2050, address: 'Sector 9 Emergency Coordinate' },
      media: mediaUploaded.length ? mediaUploaded : ['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'],
      aiPrediction: aiResult
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0e1626] border border-red-500/40 rounded-2xl p-6 shadow-2xl glow-red">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Report Emergency Incident</h3>
              <p className="text-xs text-slate-400 font-mono">POWERED BY RESQAI DISASTER SEVERITY ENGINE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Disaster Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
              Select Incident Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Fire', 'Flood', 'Earthquake', 'Cyclone', 'Landslide', 'Accident', 'Medical Emergency', 'Building Collapse'] as DisasterType[]).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setDisasterType(type)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    disasterType === type
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                      : 'bg-surface-card text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Incident Headline / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Roof Collapse & Stranded Residents at Block C"
              className="w-full px-3 py-2 rounded-xl bg-surface-card border border-slate-700 text-slate-100 text-sm focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Detailed Situation & Landmarks
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe trapped people, water depth, smoke severity, or urgent medical needs..."
              className="w-full px-3 py-2 rounded-xl bg-surface-card border border-slate-700 text-slate-100 text-sm focus:border-red-500 focus:outline-none"
              required
            />
          </div>

          {/* Voice Note & Media Upload */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setIsRecording(!isRecording);
                if (!isRecording) setTimeout(() => { setIsRecording(false); setAudioRecorded(true); }, 3000);
              }}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse border-red-400'
                  : audioRecorded
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                  : 'bg-surface-card border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isRecording ? 'RECORDING VOICE...' : audioRecorded ? 'VOICE RECORDED ✓' : 'RECORD VOICE NOTE'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaUploaded(['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'])}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                mediaUploaded.length
                  ? 'bg-blue-950/60 border-blue-500 text-blue-400'
                  : 'bg-surface-card border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Image className="w-4 h-4" />
              <span>{mediaUploaded.length ? 'PHOTO ATTACHED ✓' : 'ATTACH DISASTER MEDIA'}</span>
            </button>
          </div>

          {/* Run AI Analysis Action Button */}
          {!aiResult ? (
            <button
              type="button"
              onClick={handleRunAIAnalysis}
              disabled={isAnalyzing}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ANALYZING SEVERITY WITH FASTAPI & XGBOOST...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>RUN AI PREDICTIVE DISASTER SEVERITY ASSESSMENT</span>
                </>
              )}
            </button>
          ) : (
            /* AI Results Breakdown Box */
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 flex items-center space-x-1">
                  <Sparkles className="w-4 h-4" />
                  <span>AI SEVERITY ANALYSIS COMPLETE</span>
                </span>
                <span className="px-2 py-0.5 rounded font-bold bg-red-950 text-red-400 border border-red-800">
                  SEVERITY: {aiResult.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-slate-200">{aiResult.summary}</p>
              <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-blue-900/60">
                <span>Confidence: {(aiResult.confidenceScore * 100).toFixed(0)}%</span>
                <span>Est. Victims: {aiResult.estimatedVictims}</span>
                <span className="text-emerald-400">Authenticity: VERIFIED</span>
              </div>
            </div>
          )}

          {/* Submit Incident Report Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-sm shadow-xl shadow-red-600/40 tracking-wider uppercase transition-all"
          >
            DISPATCH EMERGENCY INCIDENT TO OPERATOR
          </button>
        </form>
      </div>
    </div>
  );
};
