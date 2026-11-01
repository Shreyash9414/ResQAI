import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { 
  RoadObstructionReport, 
  EvacuationAdvisory, 
  EvacuationDestination, 
  EvacuationHazardsFeed 
} from '../../types';
import { EvacuationMap } from '../../components/evacuation/EvacuationMap';
import { PublishAdvisoryModal } from '../../components/evacuation/PublishAdvisoryModal';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  MapPin, 
  Clock, 
  RefreshCw, 
  Radio, 
  Send, 
  Eye, 
  ShieldCheck, 
  Plus, 
  Filter, 
  Loader2,
  AlertOctagon,
  Users
} from 'lucide-react';

export const OperatorEvacuationPage: React.FC = () => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [hazards, setHazards] = useState<EvacuationHazardsFeed>({
    disasterZones: [],
    roadClosures: [],
    advisories: [],
    lastUpdated: new Date().toISOString()
  });

  const [destinations, setDestinations] = useState<EvacuationDestination[]>([]);
  const [roadReports, setRoadReports] = useState<RoadObstructionReport[]>([]);
  const [advisories, setAdvisories] = useState<EvacuationAdvisory[]>([]);

  // Triage Filter State
  const [reportFilter, setReportFilter] = useState<'ALL' | 'REPORTED' | 'VERIFIED' | 'REJECTED'>('REPORTED');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [verifyingReportId, setVerifyingReportId] = useState<string | null>(null);
  const [operatorNotes, setOperatorNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Load all evacuation command data
  const loadCommandData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [feed, reports, advs, dests] = await Promise.all([
        apiService.getEvacuationHazards(),
        apiService.getRoadReports(),
        apiService.getEvacuationAdvisories(),
        apiService.getNearbyDestinations(28.6304, 77.2177, 80) // default command center radius
      ]);

      setHazards(feed);
      setRoadReports(reports);
      setAdvisories(advs);
      setDestinations(dests.destinations);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load evacuation command data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommandData();
  }, [loadCommandData]);

  // Socket.IO live synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      loadCommandData();
    };

    socket.on('evacuation:roadReportCreated', handleUpdate);
    socket.on('evacuation:roadReportVerified', handleUpdate);
    socket.on('evacuation:advisoryPublished', handleUpdate);
    socket.on('evacuation:hazardUpdated', handleUpdate);

    return () => {
      socket.off('evacuation:roadReportCreated', handleUpdate);
      socket.off('evacuation:roadReportVerified', handleUpdate);
      socket.off('evacuation:advisoryPublished', handleUpdate);
      socket.off('evacuation:hazardUpdated', handleUpdate);
    };
  }, [socket, loadCommandData]);

  // Verify or Reject Road Hazard Report
  const handleVerifyReport = async (reportId: string, status: 'VERIFIED' | 'REJECTED' | 'CLEARED') => {
    try {
      setVerifyingReportId(reportId);
      const note = operatorNotes[reportId] || (status === 'VERIFIED' ? 'Verified by command dispatch' : 'Rejected after inspection');
      const res = await apiService.verifyRoadReport(reportId, {
        status,
        notes: note,
        operatorName: user?.name || 'Emergency Operator'
      });

      if (res.success) {
        setActionSuccessMsg(`Road report ${reportId} marked as ${status}. Hazard map updated!`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        loadCommandData();
      }
    } catch (err) {
      console.error('Failed to verify road report:', err);
    } finally {
      setVerifyingReportId(null);
    }
  };

  // Lift Advisory
  const handleLiftAdvisory = async (advisoryId: string) => {
    try {
      const res = await apiService.liftEvacuationAdvisory(advisoryId, 'Zone cleared and flood levels receded.');
      if (res.success) {
        setActionSuccessMsg(`Advisory ${advisoryId} lifted successfully.`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        loadCommandData();
      }
    } catch (err) {
      console.error('Failed to lift advisory:', err);
    }
  };

  // Filtered road reports list
  const filteredReports = roadReports.filter(r => {
    if (reportFilter === 'ALL') return true;
    return r.status === reportFilter;
  });

  // Calculate Capacity Alert metrics
  const overcrowdedShelters = destinations.filter(
    d => d.destinationType === 'RELIEF_SHELTER' && (d.occupancyPercentage ?? 0) >= 80
  );
  const divertedHospitals = destinations.filter(
    d => d.destinationType === 'HOSPITAL' && d.ambulanceReceivingStatus !== 'ACCEPTING'
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Operator Evacuation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#111928] to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Evacuation & Hazard Zone Operations
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-mono font-bold">
                OPERATOR DISPATCH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review road obstruction reports, verify hazard corridors, and broadcast official evacuation orders
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs font-mono text-slate-400 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            Last Synced: <span className="text-slate-200">{lastRefreshed}</span>
          </div>

          <button
            onClick={loadCommandData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Feeds</span>
          </button>

          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-red-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Evacuation Order</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Critical Capacity & Resource Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pending Road Reports</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {roadReports.filter(r => r.status === 'REPORTED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting operator triage</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Verified Road Closures</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {roadReports.filter(r => r.status === 'VERIFIED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active barriers in routing</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Evacuation Orders</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 font-mono">
            {advisories.filter(a => a.status === 'ACTIVE').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Broadcast to all citizen devices</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Safe Shelters Registered</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {destinations.filter(d => d.destinationType === 'RELIEF_SHELTER').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {overcrowdedShelters.length > 0 ? (
              <span className="text-amber-400 font-bold">{overcrowdedShelters.length} near capacity</span>
            ) : (
              <span className="text-emerald-400">All shelters operating normally</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: GIS Command Map + Road Report Verification Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Command Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-red-400" />
                <h3 className="font-bold text-white text-sm">Disaster Zones & Active Barricades</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {hazards.disasterZones.length} hazard zones · {hazards.roadClosures.length} road closures
              </span>
            </div>

            <EvacuationMap
              citizenLocation={null}
              destinations={destinations}
              selectedDestination={null}
              onSelectDestination={() => {}}
              routeData={null}
              hazards={hazards}
              height="520px"
            />
          </div>

          {/* Active Advisories List */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-red-400" />
                <h3 className="font-bold text-white text-sm">Active Evacuation Advisories</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {advisories.length} total orders
              </span>
            </div>

            {advisories.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No active evacuation advisories issued.
              </div>
            ) : (
              <div className="space-y-3">
                {advisories.map((adv) => (
                  <div
                    key={adv._id || adv.advisoryId}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              adv.severity === 'MANDATORY_EVACUATION'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {adv.severity}
                          </span>
                          <span className="font-bold text-white text-sm">{adv.title}</span>
                        </div>
                        <p className="text-slate-400 mt-1">
                          Zone: <strong className="text-slate-200">{adv.affectedArea?.name}</strong> (Radius: {adv.affectedArea?.radiusMeters}m)
                        </p>
                      </div>

                      {adv.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleLiftAdvisory(adv.advisoryId || (adv as any)._id)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
                        >
                          Lift Order
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                          LIFTED
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono">
                      <span>Operator: {adv.publishedBy?.operatorName}</span>
                      <span>Published: {new Date(adv.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Citizen Road Reports Verification Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Road Obstruction Reports</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {filteredReports.length} in queue
              </span>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-medium mb-3">
              {(['REPORTED', 'VERIFIED', 'REJECTED', 'ALL'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setReportFilter(tab)}
                  className={`py-1 rounded-lg transition-all ${
                    reportFilter === tab
                      ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'REPORTED' ? 'Pending' : tab}
                </button>
              ))}
            </div>

            {/* Reports List */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No road obstruction reports matching this filter.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isVerifying = verifyingReportId === (report.reportId || report._id);

                  return (
                    <div
                      key={report.reportId || report._id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                report.status === 'VERIFIED'
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : report.status === 'REJECTED'
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {report.status}
                            </span>
                            <span className="font-bold text-white">{report.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Type: <strong className="text-slate-200">{report.hazardType}</strong> | Severity: <strong className="text-red-400">{report.severity}</strong>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {report.radiusMeters}m radius
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-[11px]">
                        {report.description}
                      </p>

                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                        <span>
                          📍 {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
                        </span>
                        <span>
                          By: {report.reportedBy?.citizenName || 'Citizen'} ({new Date(report.createdAt).toLocaleTimeString()})
                        </span>
                      </div>

                      {/* Verification Operator Actions */}
                      {report.status === 'REPORTED' && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <input
                            type="text"
                            placeholder="Operator verification notes (e.g., CCTV verified)..."
                            value={operatorNotes[report.reportId || report._id || ''] || ''}
                            onChange={(e) =>
                              setOperatorNotes({
                                ...operatorNotes,
                                [report.reportId || report._id || '']: e.target.value
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                          />

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleVerifyReport(report.reportId || report._id || '', 'VERIFIED')}
                              disabled={isVerifying}
                              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow transition-all"
                            >
                              {isVerifying ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Verify & Block Route</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleVerifyReport(report.reportId || report._id || '', 'REJECTED')}
                              disabled={isVerifying}
                              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {report.status === 'VERIFIED' && (
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-900/40">
                          <span>Verified by {report.verifiedBy?.operatorName || 'Operator'}</span>
                          <button
                            onClick={() => handleVerifyReport(report.reportId || report._id || '', 'CLEARED')}
                            className="text-[10px] text-slate-300 hover:text-white underline"
                          >
                            Mark Cleared
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Advisory Modal */}
      <PublishAdvisoryModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onAdvisoryPublished={loadCommandData}
      />
    </div>
  );
};
