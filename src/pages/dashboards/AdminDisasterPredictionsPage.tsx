import React, { useState, useEffect, useMemo } from 'react';
import { 
  DisasterPredictionItem, 
  PredictionStats, 
  PredictionConfig 
} from '../../types';
import { apiService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Mail, 
  RefreshCw, 
  Sliders, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Gauge, 
  Send, 
  RotateCcw, 
  Power, 
  FileText, 
  ExternalLink, 
  Users, 
  Eye, 
  ChevronRight, 
  CloudRain, 
  Wind, 
  Sun, 
  Waves, 
  Check, 
  History,
  Info,
  Server,
  Activity,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { PredictionTestEmailModal } from '../../components/predictions/PredictionTestEmailModal';
import { PredictionReviewModal } from '../../components/predictions/PredictionReviewModal';

export const AdminDisasterPredictionsPage: React.FC = () => {
  const { socket } = useSocket();

  // State
  const [predictions, setPredictions] = useState<DisasterPredictionItem[]>([]);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState<boolean>(false);
  const [config, setConfig] = useState<PredictionConfig>({
    autoEmailEnabled: true,
    riskThreshold: 'HIGH',
    batchSize: 5,
    batchDelayMs: 200,
    maxRetries: 3,
    requireOperatorApproval: false
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isTestEmailOpen, setIsTestEmailOpen] = useState<boolean>(false);
  const [selectedPredictionForReview, setSelectedPredictionForReview] = useState<DisasterPredictionItem | null>(null);
  const [selectedPredictionLogs, setSelectedPredictionLogs] = useState<DisasterPredictionItem | null>(null);

  // Live broadcast progress notification toast
  const [liveEmailProgress, setLiveEmailProgress] = useState<{
    predictionId: string;
    progress: number;
    sent: number;
    total: number;
    status: string;
  } | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [preds, statistics, cfg, diag] = await Promise.all([
        apiService.getDisasterPredictions(),
        apiService.getPredictionStats(),
        apiService.getPredictionConfig(),
        apiService.getPredictionDiagnostics()
      ]);
      setPredictions(preds || []);
      setStats(statistics);
      if (cfg) setConfig(cfg);
      if (diag) setDiagnostics(diag);
    } catch (err) {
      console.error('Error fetching disaster prediction dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReverifySmtp = async () => {
    try {
      setIsVerifyingSmtp(true);
      const diag = await apiService.getPredictionDiagnostics();
      if (diag) setDiagnostics(diag);
      alert('SMTP gateway diagnostic connection verified successfully!');
    } catch (err: any) {
      alert('Failed to re-verify SMTP: ' + err.message);
    } finally {
      setIsVerifyingSmtp(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('prediction:new', (newPred: DisasterPredictionItem) => {
      setPredictions(prev => [newPred, ...prev.filter(p => p.predictionId !== newPred.predictionId)]);
      apiService.getPredictionStats().then(s => setStats(s)).catch(() => {});
    });

    socket.on('prediction:updated', (updated: DisasterPredictionItem) => {
      setPredictions(prev => prev.map(p => p.predictionId === updated.predictionId ? updated : p));
      apiService.getPredictionStats().then(s => setStats(s)).catch(() => {});
    });

    socket.on('prediction:emailProgress', (progData: any) => {
      setLiveEmailProgress({
        predictionId: progData.predictionId,
        progress: progData.progress,
        sent: progData.sent,
        total: progData.total,
        status: progData.status
      });
      setPredictions(prev => prev.map(p => {
        if (p.predictionId === progData.predictionId) {
          return {
            ...p,
            emailNotification: {
              ...p.emailNotification,
              deliveryStatus: progData.status === 'Completed' ? 'ACCEPTED' : 'SENDING',
              acceptedCount: progData.sent,
              recipientCount: progData.total
            }
          };
        }
        return p;
      }));
    });

    socket.on('prediction:emailCompleted', () => {
      setTimeout(() => setLiveEmailProgress(null), 4000);
      fetchData();
    });

    return () => {
      socket.off('prediction:new');
      socket.off('prediction:updated');
      socket.off('prediction:emailProgress');
      socket.off('prediction:emailCompleted');
    };
  }, [socket]);

  // Actions
  const handleToggleKillSwitch = async () => {
    try {
      const isEnabled = config.autoEmailEnabled ?? config.autoEmailAlertsEnabled ?? true;
      const res = await apiService.updatePredictionConfig({
        autoEmailEnabled: !isEnabled,
        autoEmailAlertsEnabled: !isEnabled
      });
      if (res.config) {
        setConfig(prev => ({
          ...prev,
          autoEmailEnabled: res.config?.autoEmailEnabled,
          autoEmailAlertsEnabled: res.config?.autoEmailEnabled
        }));
      }
    } catch (err: any) {
      alert('Failed to update email alert toggle: ' + err.message);
    }
  };

  const handleUpdateThreshold = async (newThreshold: string) => {
    try {
      const res = await apiService.updatePredictionConfig({
        riskThreshold: newThreshold
      });
      if (res.config) {
        setConfig(prev => ({ ...prev, riskThreshold: res.config?.riskThreshold || newThreshold }));
      }
    } catch (err: any) {
      alert('Failed to update risk threshold: ' + err.message);
    }
  };

  const handleRunEvaluation = async () => {
    try {
      setIsEvaluating(true);
      const res = await apiService.evaluatePredictions();
      alert(`AI Prediction Evaluation Finished!\nEvaluated Hazards: ${res.evaluatedCount || res.predictions?.length || 0}\nStatus: ${res.message || 'Scan completed successfully'}`);
      fetchData();
    } catch (err: any) {
      alert('Evaluation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleManualSendAlert = async (predictionId: string) => {
    if (!window.confirm('Are you sure you want to trigger a mass email alert to all eligible registered users for this prediction?')) {
      return;
    }
    try {
      const res = await apiService.sendPredictionAlert(predictionId);
      alert(res.message || 'Alert dispatched to delivery queue.');
      fetchData();
    } catch (err: any) {
      alert('Failed to send alert: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRetryFailed = async (predictionId: string) => {
    try {
      const res = await apiService.retryFailedPredictionEmails(predictionId);
      alert(res.message || 'Retry job started.');
      fetchData();
    } catch (err: any) {
      alert('Failed to retry emails: ' + (err.response?.data?.message || err.message));
    }
  };

  // Helper icons and styles
  const getDisasterIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flood':
      case 'flash flood':
        return <Waves className="w-5 h-5 text-blue-400" />;
      case 'heavy rainfall':
      case 'cloudburst':
        return <CloudRain className="w-5 h-5 text-cyan-400" />;
      case 'cyclone':
      case 'severe thunderstorm':
        return <Wind className="w-5 h-5 text-indigo-400" />;
      case 'heatwave':
        return <Sun className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-rose-950/90 text-rose-300 border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.3)]';
      case 'High':
        return 'bg-amber-950/90 text-amber-300 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]';
      case 'Moderate':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-500/60';
      default:
        return 'bg-blue-950/80 text-blue-300 border-blue-500/60';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-950 text-emerald-400 border-emerald-500/60';
      case 'Under Review':
        return 'bg-amber-950 text-amber-400 border-amber-500/60';
      case 'Evaluating':
        return 'bg-purple-950 text-purple-400 border-purple-500/60';
      case 'Expired':
        return 'bg-slate-900 text-slate-400 border-slate-700';
      case 'Failed':
        return 'bg-rose-950 text-rose-400 border-rose-500/60';
      default:
        return 'bg-blue-950 text-blue-400 border-blue-500/60';
    }
  };

  // Filtered predictions
  const filteredPredictions = useMemo(() => {
    return predictions.filter(p => {
      if (filterType !== 'ALL' && p.disasterType !== filterType) return false;
      if (filterRisk !== 'ALL' && p.predictedRiskLevel !== filterRisk) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = p.affectedArea.name.toLowerCase().includes(query);
        const matchType = p.disasterType.toLowerCase().includes(query);
        const matchId = p.predictionId.toLowerCase().includes(query);
        if (!matchName && !matchType && !matchId) return false;
      }
      return true;
    });
  }, [predictions, filterType, filterRisk, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-7">
      
      {/* Live Email Broadcast Banner */}
      {liveEmailProgress && (
        <div className="bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-500/80 rounded-2xl p-4 shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-blue-900 text-blue-300 animate-pulse">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Automated Alert Dispatch In Progress
                </p>
                <p className="text-[11px] text-blue-200">
                  Transmitting personalized disaster alert to registered users ({liveEmailProgress.sent} / {liveEmailProgress.total})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-bold text-blue-400">
                {liveEmailProgress.progress}%
              </span>
              <div className="w-36 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${liveEmailProgress.progress}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header & Main Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">
                  AI Disaster Early Warning Engine
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>30m Scheduler Active</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Disaster Prediction & Automated Email Alerts
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
            Multi-hazard meteorological risk engine evaluating rainfall, river discharges, wind speeds, and temperature spikes. When risk crosses threshold, automated email warnings are dispatched to all eligible registered users in MongoDB.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs flex items-center space-x-2"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Evaluate AI button */}
          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Gauge className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating Telemetry...' : 'Evaluate Live AI'}</span>
          </button>

          {/* Test Email Button */}
          <button
            onClick={() => setIsTestEmailOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Send Test Email</span>
          </button>

          {/* Kill Switch Toggle */}
          <button
            onClick={handleToggleKillSwitch}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 border shadow-lg ${
              (config.autoEmailEnabled ?? config.autoEmailAlertsEnabled ?? true)
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-900/30 hover:bg-emerald-900'
                : 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-rose-900/30 hover:bg-rose-900'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{(config.autoEmailEnabled ?? config.autoEmailAlertsEnabled ?? true) ? 'Auto-Email: ON' : 'Auto-Email: PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* SMTP Gateway & Citizen Notification Diagnostics Panel */}
      <div className="bg-[#0b1328]/90 border border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_4px_30px_rgba(30,58,138,0.2)] backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${
              diagnostics?.smtpReady
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                  Nodemailer SMTP Relayer
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center space-x-1.5 ${
                  diagnostics?.smtpReady
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${diagnostics?.smtpReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{diagnostics?.smtpReady ? 'SMTP READY & VERIFIED' : 'SMTP DISCONNECTED / ERROR'}</span>
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                SMTP Gateway & Citizen Notification Diagnostics
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReverifySmtp}
              disabled={isVerifyingSmtp}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-2 transition-all"
              title="Test connection and verify SMTP handshake"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingSmtp ? 'animate-spin' : ''}`} />
              <span>{isVerifyingSmtp ? 'Verifying...' : 'Re-Verify SMTP'}</span>
            </button>
            <button
              onClick={() => setIsTestEmailOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-blue-600/30 transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Metadata 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
          
          {/* Card 1: SMTP Config */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>Provider Gateway</span>
            </span>
            <div className="font-mono text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Host:</span>
                <span className="text-white font-bold">{diagnostics?.smtpHost || 'smtp.gmail.com'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Port:</span>
                <span className="text-white font-bold">{diagnostics?.smtpPort || 587} (TLS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sender:</span>
                <span className="text-blue-300 truncate max-w-[130px]" title={diagnostics?.mailFrom || diagnostics?.smtpUser}>
                  {diagnostics?.mailFrom ? diagnostics.mailFrom.replace(/^.*<|>$/g, '') : (diagnostics?.smtpUser || 'smmandlik.1318@gmail.com')}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Eligible Users Query */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>MongoDB User Registry</span>
            </span>
            <div className="mt-1">
              <div className="text-2xl font-extrabold text-white font-mono">
                {diagnostics?.eligibleRecipientsCount ?? stats?.eligibleUsersCount ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Registered citizens with email alerts enabled. Includes logged-out users.
              </p>
            </div>
          </div>

          {/* Card 3: Delivery Status Breakdown */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Delivery Lifecycle</span>
            </span>
            <div className="font-mono text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Accepted by Provider:</span>
                <span className="text-emerald-400 font-bold">{stats?.emailDeliveryStats?.accepted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Queued / In-flight:</span>
                <span className="text-blue-300 font-bold">{liveEmailProgress ? (liveEmailProgress.total - liveEmailProgress.sent) : 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Failures:</span>
                <span className="text-rose-400 font-bold">{stats?.emailDeliveryStats?.failed || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Last Test & Campaign Time */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit & Last Execution</span>
            </span>
            <div className="text-[11px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Last Test:</span>
                <span className="text-slate-300">
                  {diagnostics?.lastTestEmailAt ? new Date(diagnostics.lastTestEmailAt).toLocaleTimeString() : 'None in session'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Campaign:</span>
                <span className="text-slate-300">
                  {diagnostics?.lastCampaignExecutionAt ? new Date(diagnostics.lastCampaignExecutionAt).toLocaleTimeString() : 'Standby'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Error Status:</span>
                <span className={diagnostics?.lastError ? 'text-rose-400 truncate max-w-[120px]' : 'text-emerald-400'}>
                  {diagnostics?.lastError ? diagnostics.lastError : 'Clean'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Evaluated */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Total Predictions
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.totalPredictions ?? predictions.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">records</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1.5">
            <span className="text-emerald-400 font-bold">{stats?.byStatus?.Confirmed || 0} Confirmed</span>
            <span>•</span>
            <span className="text-amber-400">{stats?.byStatus?.['Under Review'] || 0} Under Review</span>
          </div>
        </div>

        {/* High & Critical Threats */}
        <div className="bg-slate-900/70 border border-rose-950/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider">
              High / Critical Threats
            </span>
            <div className="p-2 rounded-xl bg-rose-950 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-rose-400">
              {(stats?.byRiskLevel?.High || 0) + (stats?.byRiskLevel?.Critical || 0)}
            </span>
            <span className="text-xs text-rose-300 font-mono">qualifying</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Critical: <span className="text-rose-400 font-bold">{stats?.byRiskLevel?.Critical || 0}</span> | High: <span className="text-amber-400 font-bold">{stats?.byRiskLevel?.High || 0}</span>
          </div>
        </div>

        {/* Eligible Recipients */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider">
              Eligible Users (MongoDB)
            </span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.eligibleUsersCount ?? 0}
            </span>
            <span className="text-xs text-blue-300 font-mono">registered</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Active verified citizens with emergency alerts enabled
          </div>
        </div>

        {/* Delivery Success Rate */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
              Alerts Accepted / Sent
            </span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {stats?.emailDeliveryStats?.accepted || 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {stats?.emailDeliveryStats?.attempted || 0}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Failed: <span className="text-rose-400 font-bold">{stats?.emailDeliveryStats?.failed || 0}</span> | Success: <span className="text-emerald-400 font-bold">{stats?.emailDeliveryStats?.successRate || 100}%</span>
          </div>
        </div>
      </div>

      {/* Configuration & Rule Settings Card */}
      <div className="bg-[#0b1224] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-200">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
              Notification Rules & Threshold Policy
            </h3>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Batch Pacing: <span className="text-white font-bold">{config.batchSize || 5} per batch ({config.batchDelayMs || 200}ms delay)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Threshold selector */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-400">
              Automatic Notification Threshold
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={config.riskThreshold}
                onChange={(e) => handleUpdateThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 font-mono"
              >
                <option value="Critical">Critical Only (Extreme Catastrophe)</option>
                <option value="High">High & Critical (Standard Safety Policy)</option>
                <option value="Moderate">Moderate, High & Critical</option>
                <option value="Low">All Risk Levels (Low, Moderate, High, Critical)</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500">
              Predictions equal to or above this severity automatically initiate email broadcast.
            </p>
          </div>

          {/* Deduplication Policy */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-400">
              Deduplication & Anti-Spam Guard
            </label>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 font-mono font-medium">
              <Check className="w-4 h-4" />
              <span>SHA/Key Matching Enabled</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Suppresses repetitive notifications unless hazard type, area, or severity updates.
            </p>
          </div>

          {/* Recipient Privacy */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-400">
              Recipient Privacy & Security
            </label>
            <div className="flex items-center space-x-2 text-xs text-blue-400 font-mono font-medium">
              <Check className="w-4 h-4" />
              <span>Individual Queue Delivery</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Zero CC/BCC exposure. Each user receives an isolated, personalized alert message.
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/90 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">All Hazard Types</option>
            <option value="Flood">Flood</option>
            <option value="Heavy Rainfall">Heavy Rainfall</option>
            <option value="Cyclone">Cyclone</option>
            <option value="Heatwave">Heatwave</option>
            <option value="Severe Thunderstorm">Severe Thunderstorm</option>
          </select>

          {/* Filter Risk */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search region, hazard, or ID..."
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2 placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Predictions Table / Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            Active AI Disaster Predictions ({filteredPredictions.length})
          </h2>
          <span className="text-[11px] text-slate-500">
            Real-time multi-hazard telemetry
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500" />
            <p className="text-xs">Loading disaster predictions and meteorological feeds...</p>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2 bg-slate-900/40 rounded-2xl border border-slate-800">
            <AlertTriangle className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-400">No predictions matching your criteria</p>
            <p className="text-xs text-slate-600">Click "Evaluate Live AI" to run an immediate meteorological scan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPredictions.map((pred) => {
              const notif = pred.emailNotification || ({} as any);
              const hasFailed = (notif.failedCount || 0) > 0;
              const hasSent = notif.deliveryStatus === 'ACCEPTED' || (notif.acceptedCount || 0) > 0;

              return (
                <div
                  key={pred.predictionId}
                  className="bg-[#0c1428] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all shadow-lg"
                >
                  {/* Top bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        {getDisasterIcon(pred.disasterType)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-extrabold text-white">
                            {pred.disasterType}
                          </h3>
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getRiskBadge(pred.predictedRiskLevel)}`}>
                            {pred.predictedRiskLevel} RISK
                          </span>
                          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(pred.status)}`}>
                            {pred.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2 font-mono">
                          <span>ID: {pred.predictionId}</span>
                          <span>•</span>
                          <span>Nature: {pred.predictionNature?.replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                    </div>

                    {/* Operator Review Info */}
                    <div className="flex items-center space-x-2 text-right">
                      {pred.operatorReview?.reviewed ? (
                        <div className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-xl">
                          <span>Verified by <strong>{pred.operatorReview.reviewedBy}</strong></span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/50 px-3 py-1 rounded-xl">
                          <span>Pending Operator Review</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Location & Forecast */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-semibold text-white">{pred.affectedArea.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-6">
                        Coordinates: {pred.affectedArea.center?.lat?.toFixed(3) || '0.000'}, {pred.affectedArea.center?.lng?.toFixed(3) || '0.000'}
                      </p>
                      <div className="flex items-center space-x-2 text-slate-300 pl-6">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Window: {pred.forecastWindow?.durationHours || 24} Hours</span>
                      </div>
                    </div>

                    {/* Meteorological Telemetry */}
                    <div className="space-y-1 text-slate-300">
                      <p className="text-[11px] font-semibold text-slate-400">Sensor & Forecast Telemetry:</p>
                      <div className="text-[11px] font-mono space-y-0.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                        {pred.weatherMetrics?.rainfallForecastMm !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Precipitation:</span>
                            <span className="text-cyan-300 font-bold">{pred.weatherMetrics.rainfallForecastMm} mm</span>
                          </div>
                        )}
                        {pred.weatherMetrics?.floodRiskIndex !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Flood Index:</span>
                            <span className="text-blue-300 font-bold">{(pred.weatherMetrics.floodRiskIndex * 10).toFixed(1)} / 10</span>
                          </div>
                        )}
                        {pred.weatherMetrics?.peakWindSpeedKmh !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Wind Velocity:</span>
                            <span className="text-indigo-300 font-bold">{pred.weatherMetrics.peakWindSpeedKmh} km/h</span>
                          </div>
                        )}
                        {pred.weatherMetrics?.peakTemperatureC !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Temperature:</span>
                            <span className="text-amber-300 font-bold">{pred.weatherMetrics.peakTemperatureC} °C</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                          <span className="text-slate-500">Confidence Score:</span>
                          <span className="text-emerald-400 font-bold">{Math.round(pred.confidenceScore <= 1 ? pred.confidenceScore * 100 : pred.confidenceScore)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Email Broadcast Status */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-400">Email Notification Status:</p>
                      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Campaign Status:</span>
                          <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                            hasSent ? 'text-emerald-400 bg-emerald-950' : notif.deliveryStatus === 'SENDING' ? 'text-blue-400 bg-blue-950' : 'text-slate-400 bg-slate-900'
                          }`}>
                            {notif.deliveryStatus || 'NOT_TRIGGERED'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-slate-300">
                          <span>Eligible Recipients:</span>
                          <span className="font-bold text-white">{notif.recipientCount || stats?.eligibleUsersCount || 0}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-slate-300">
                          <span>Sent / Accepted:</span>
                          <span className="font-bold text-emerald-400">{notif.acceptedCount || 0}</span>
                        </div>
                        {hasFailed && (
                          <div className="flex justify-between text-[11px] font-mono text-rose-400">
                            <span>Delivery Failures:</span>
                            <span className="font-bold">{notif.failedCount}</span>
                          </div>
                        )}
                        {notif.triggeredAt && (
                          <p className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800">
                            Sent: {new Date(notif.triggeredAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Safety Guidelines preview */}
                  {pred.safetyPrecautions && pred.safetyPrecautions.length > 0 && (
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/80 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                        Dispatched Safety Instructions:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-300 text-[11px]">
                        {pred.safetyPrecautions.slice(0, 4).map((p, idx) => (
                          <div key={idx} className="flex items-center space-x-1.5">
                            <span className="text-amber-500">•</span>
                            <span className="truncate">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      {/* Review Modal Trigger */}
                      <button
                        onClick={() => setSelectedPredictionForReview(pred)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Review / Validate</span>
                      </button>

                      {/* Audit Logs Trigger */}
                      <button
                        onClick={() => setSelectedPredictionLogs(pred)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-all border border-slate-800"
                      >
                        <History className="w-3.5 h-3.5 text-purple-400" />
                        <span>Audit Log ({pred.auditLogs?.length || 0})</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Retry Failed Emails button */}
                      {hasFailed && (
                        <button
                          onClick={() => handleRetryFailed(pred.predictionId)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-bold flex items-center space-x-1.5 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Failed ({notif.failedCount})</span>
                        </button>
                      )}

                      {/* Manual Send Alert Button */}
                      <button
                        onClick={() => handleManualSendAlert(pred.predictionId)}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{hasSent ? 'Re-Send Alert Email' : 'Broadcast Email Alert'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Logs Modal */}
      {selectedPredictionLogs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0a101f] border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Prediction Audit Log: {selectedPredictionLogs.predictionId}</h3>
              </div>
              <button
                onClick={() => setSelectedPredictionLogs(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {(!selectedPredictionLogs.auditLogs || selectedPredictionLogs.auditLogs.length === 0) ? (
                <p className="text-slate-500 py-4 text-center">No recorded audit log events.</p>
              ) : (
                selectedPredictionLogs.auditLogs.map((log: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span className="text-purple-400 font-bold">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300">{log.details}</p>
                    {log.operator && (
                      <p className="text-[10px] text-slate-500 font-mono">Operator: {log.operator}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      <PredictionTestEmailModal
        isOpen={isTestEmailOpen}
        onClose={() => setIsTestEmailOpen(false)}
      />

      {/* Review Modal */}
      <PredictionReviewModal
        prediction={selectedPredictionForReview}
        isOpen={Boolean(selectedPredictionForReview)}
        onClose={() => setSelectedPredictionForReview(null)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};
