import React, { useState, useEffect } from 'react';
import { ShieldAlert, Mail, MapPin, Eye, CheckCircle2, AlertTriangle, RefreshCw, X, FileText, Send, PhoneCall, Info } from 'lucide-react';
import { apiService } from '../../services/api';

interface CitizensAtRiskSectionProps {
  onSelectCitizenLocation?: (lat: number, lng: number, name: string) => void;
  socket?: any;
}

export const CitizensAtRiskSection: React.FC<CitizensAtRiskSectionProps> = ({
  onSelectCitizenLocation,
  socket
}) => {
  const [riskData, setRiskData] = useState<any>({
    summary: { totalAtRisk: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, uncertainCount: 0 },
    citizens: []
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [disasterFilter, setDisasterFilter] = useState<string>('ALL');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('ALL');
  const [emailStatusFilter, setEmailStatusFilter] = useState<string>('ALL');

  // Modal States
  const [selectedCitizen, setSelectedCitizen] = useState<any | null>(null);
  const [showPrecautionsModal, setShowPrecautionsModal] = useState<boolean>(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState<boolean>(false);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailResultMsg, setEmailResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCitizensAtRisk();
      if (data && data.citizens) {
        setRiskData(data);
      }
    } catch (err) {
      console.error('Failed to load citizens at risk:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  // Socket Listener for live updates
  useEffect(() => {
    if (!socket) return;

    const handleEmailSent = () => {
      fetchRiskData();
    };

    const handleLocationUpdate = () => {
      fetchRiskData();
    };

    socket.on('risk_email_sent', handleEmailSent);
    socket.on('user_location_updated', handleLocationUpdate);
    socket.on('new_sos_incident', handleLocationUpdate);

    return () => {
      socket.off('risk_email_sent', handleEmailSent);
      socket.off('user_location_updated', handleLocationUpdate);
      socket.off('new_sos_incident', handleLocationUpdate);
    };
  }, [socket]);

  // Filter Logic
  const filteredCitizens = (riskData.citizens || []).filter((c: any) => {
    const matchesSearch = !searchTerm ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.disasterTitle && c.disasterTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDisaster = disasterFilter === 'ALL' || (c.disasterType && c.disasterType.toUpperCase() === disasterFilter.toUpperCase());
    const matchesRisk = riskLevelFilter === 'ALL' || (c.riskLevel && c.riskLevel.toUpperCase() === riskLevelFilter.toUpperCase());
    const matchesEmail = emailStatusFilter === 'ALL' || (c.emailStatus && c.emailStatus.toLowerCase() === emailStatusFilter.toLowerCase());

    return matchesSearch && matchesDisaster && matchesRisk && matchesEmail;
  });

  const handleOpenPrecautions = (citizen: any) => {
    setSelectedCitizen(citizen);
    setShowPrecautionsModal(true);
  };

  const handleOpenSendEmail = (citizen: any) => {
    setSelectedCitizen(citizen);
    setEmailResultMsg(null);
    setShowSendEmailModal(true);
  };

  const handleExecuteSendEmail = async () => {
    if (!selectedCitizen) return;
    setSendingEmail(true);
    setEmailResultMsg(null);

    try {
      const res = await apiService.sendSafetyEmail(
        selectedCitizen.citizenId,
        selectedCitizen.nearestDisasterId,
        selectedCitizen.disasterType
      );

      if (res.success) {
        setEmailResultMsg({
          type: 'success',
          text: res.message || `Safety email successfully delivered to ${selectedCitizen.email}`
        });
        fetchRiskData();
      } else {
        setEmailResultMsg({
          type: 'error',
          text: res.message || 'Failed to dispatch safety email.'
        });
      }
    } catch (err: any) {
      setEmailResultMsg({
        type: 'error',
        text: err.message || 'Error executing email delivery.'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const summary = riskData.summary || { totalAtRisk: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, uncertainCount: 0 };

  return (
    <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-2xl shadow-lg shadow-red-950/50">
            <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Citizens at Risk & Safety Alerts</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-900/60 text-red-300 font-bold text-xs border border-red-700">
                LIVE MONITORING
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Geospatial disaster impact monitoring, real-time risk assessment & automated safety email dispatch
            </p>
          </div>
        </div>

        <button
          onClick={fetchRiskData}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
          <span>{loading ? 'CALCULATING...' : 'REFRESH RISK MATRIX'}</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TOTAL AT RISK</span>
          <span className="text-2xl font-black text-white">{summary.totalAtRisk}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Authenticated citizens</span>
        </div>

        <div className="bg-red-950/30 p-4 rounded-2xl border border-red-900/40 shadow-md">
          <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider block">CRITICAL RISK</span>
          <span className="text-2xl font-black text-red-500">{summary.criticalCount}</span>
          <span className="text-[10px] text-red-400/70 block mt-1">Immediate evacuation</span>
        </div>

        <div className="bg-orange-950/30 p-4 rounded-2xl border border-orange-900/40 shadow-md">
          <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider block">HIGH RISK</span>
          <span className="text-2xl font-black text-orange-400">{summary.highCount}</span>
          <span className="text-[10px] text-orange-400/70 block mt-1">Close proximity</span>
        </div>

        <div className="bg-amber-950/30 p-4 rounded-2xl border border-amber-900/40 shadow-md">
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">MEDIUM RISK</span>
          <span className="text-2xl font-black text-amber-400">{summary.mediumCount}</span>
          <span className="text-[10px] text-amber-400/70 block mt-1">Standby advisory</span>
        </div>

        <div className="bg-blue-950/30 p-4 rounded-2xl border border-blue-900/40 shadow-md">
          <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">LOW RISK</span>
          <span className="text-2xl font-black text-blue-400">{summary.lowCount}</span>
          <span className="text-[10px] text-blue-400/70 block mt-1">Perimeter zone</span>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 shadow-md">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">GPS UNCERTAIN</span>
          <span className="text-2xl font-black text-slate-300">{summary.uncertainCount}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Low accuracy / stale</span>
        </div>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SEARCH CITIZEN / DISASTER</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, or disaster..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DISASTER TYPE</label>
          <select
            value={disasterFilter}
            onChange={(e) => setDisasterFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-colors font-medium"
          >
            <option value="ALL">ALL DISASTER TYPES</option>
            <option value="FLOOD">FLOOD</option>
            <option value="EARTHQUAKE">EARTHQUAKE</option>
            <option value="FIRE">FIRE</option>
            <option value="CYCLONE">CYCLONE</option>
            <option value="LANDSLIDE">LANDSLIDE</option>
            <option value="CHEMICAL_SPILL">CHEMICAL SPILL</option>
            <option value="BUILDING_COLLAPSE">BUILDING COLLAPSE</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RISK LEVEL</label>
          <select
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-colors font-medium"
          >
            <option value="ALL">ALL RISK LEVELS</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="UNCERTAIN">UNCERTAIN</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">EMAIL STATUS</label>
          <select
            value={emailStatusFilter}
            onChange={(e) => setEmailStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-colors font-medium"
          >
            <option value="ALL">ALL EMAIL STATUSES</option>
            <option value="NOT SENT">NOT SENT</option>
            <option value="SENT">SENT / DELIVERED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
              <th className="p-3.5">CITIZEN & REGISTERED GMAIL</th>
              <th className="p-3.5">CURRENT GPS LOCATION</th>
              <th className="p-3.5">NEAREST DISASTER & TYPE</th>
              <th className="p-3.5 text-center">DISTANCE</th>
              <th className="p-3.5 text-center">RISK LEVEL</th>
              <th className="p-3.5 text-center">SAFETY EMAIL STATUS</th>
              <th className="p-3.5 text-right">OPERATOR ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-slate-200">
            {filteredCitizens.length > 0 ? (
              filteredCitizens.map((c: any) => {
                const isCritical = c.riskLevel === 'CRITICAL';
                const isHigh = c.riskLevel === 'HIGH';
                const isMedium = c.riskLevel === 'MEDIUM';
                const isUncertain = c.riskLevel === 'UNCERTAIN';

                return (
                  <tr key={c.citizenId} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-white text-sm">{c.name}</div>
                      <div className="text-slate-400 font-mono text-[11px] flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{c.email}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      {c.latitude && c.longitude ? (
                        <div className="font-mono text-[11px]">
                          <div className="text-slate-300 font-bold">{c.latitude.toFixed(4)}° N, {c.longitude.toFixed(4)}° E</div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              c.locationStatus === 'Accurate GPS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              {c.locationStatus} (±{c.locationAccuracy}m)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-400 font-bold text-[11px] uppercase">Location Unavailable</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-white">{c.disasterTitle}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-950 text-red-300 border border-red-800">
                        {c.disasterType}
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold">
                      <span className="text-amber-400 text-sm">{c.distanceKm} km</span>
                      <div className="text-[10px] text-slate-500">({c.distanceMeters} meters)</div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider shadow-sm ${
                        isCritical ? 'bg-red-950 text-red-400 border-red-700 animate-pulse' :
                        isHigh ? 'bg-orange-950 text-orange-400 border-orange-700' :
                        isMedium ? 'bg-amber-950 text-amber-400 border-amber-700' :
                        isUncertain ? 'bg-slate-800 text-slate-400 border-slate-600' :
                        'bg-blue-950 text-blue-400 border-blue-700'
                      }`}>
                        {c.riskLevel}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border flex items-center space-x-1 ${
                          c.emailStatus === 'Delivered' || c.emailStatus === 'Sent' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                          c.emailStatus === 'Failed' ? 'bg-red-950 text-red-400 border-red-800' :
                          'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {c.emailStatus === 'Delivered' || c.emailStatus === 'Sent' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : c.emailStatus === 'Failed' ? (
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                          ) : null}
                          <span>{c.emailStatus || 'Not Sent'}</span>
                        </span>
                        {c.lastAlertSentAt && (
                          <span className="text-[9px] text-slate-500 mt-1">
                            {new Date(c.lastAlertSentAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Location Button */}
                        {onSelectCitizenLocation && c.latitude && (
                          <button
                            onClick={() => onSelectCitizenLocation(c.latitude, c.longitude, c.name)}
                            title="View Citizen Location on Map"
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                        )}

                        {/* View Precautions Button */}
                        <button
                          onClick={() => handleOpenPrecautions(c)}
                          title="View Safety Precautions"
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[11px] border border-slate-700 rounded-xl transition-all flex items-center space-x-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>Precautions</span>
                        </button>

                        {/* Send Safety Email Button */}
                        <button
                          onClick={() => handleOpenSendEmail(c)}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-[11px] border border-red-500 rounded-xl shadow-lg shadow-red-950/50 transition-all flex items-center space-x-1 active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Safety Email</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                  {loading ? 'Evaluating geographic disaster risk zones...' : 'No citizens matching the selected risk filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: VIEW SAFETY PRECAUTIONS */}
      {showPrecautionsModal && selectedCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-950/80 border border-amber-800/80 rounded-2xl">
                  <FileText className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Disaster Safety Precautions</h3>
                  <p className="text-xs text-amber-400/90 font-bold uppercase">{selectedCitizen.disasterType} EMERGENCY PROTOCOLS</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrecautionsModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">TARGET DISASTER</span>
                  <span className="font-extrabold text-white text-sm">{selectedCitizen.disasterTitle}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 font-black text-[10px] uppercase">
                  RISK: {selectedCitizen.riskLevel}
                </span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>OFFICIAL PRECAUTIONS & INSTRUCTIONS</span>
                </h4>
                <ul className="list-disc list-inside space-y-2 text-slate-300 text-xs leading-relaxed pt-1">
                  {(selectedCitizen.precautions?.instructions || selectedCitizen.precautions || []).map((inst: string, idx: number) => (
                    <li key={idx} className="pl-1">{inst}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-blue-400 text-sm flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-blue-400" />
                  <span>EMERGENCY HELPLINE DIRECTORY</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(selectedCitizen.precautions?.emergencyHelplines || [
                    { name: 'National Emergency', number: '112' },
                    { name: 'Fire Brigade', number: '101' },
                    { name: 'Medical Response', number: '108' }
                  ]).map((h: any, idx: number) => (
                    <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                      <span className="text-slate-400 font-bold text-[11px]">{h.name}</span>
                      <span className="text-emerald-400 font-mono font-black text-xs">{h.number}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-right">
                Source: {selectedCitizen.precautions?.source || 'National Disaster Management Guidelines'}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPrecautionsModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close Precautions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND SAFETY EMAIL CONFIRMATION */}
      {showSendEmailModal && selectedCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-red-950/80 border border-red-800/80 rounded-2xl">
                  <Mail className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Send Disaster Safety Email</h3>
                  <p className="text-xs text-slate-400">Confirm email dispatch to authenticated citizen</p>
                </div>
              </div>
              <button
                onClick={() => setShowSendEmailModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">REGISTERED GMAIL RECIPIENT:</span>
                  <span className="text-emerald-400 font-mono font-black text-xs">{selectedCitizen.email}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">CITIZEN NAME:</span>
                  <span className="text-white font-extrabold text-xs">{selectedCitizen.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">DETECTED HAZARD:</span>
                  <span className="text-amber-400 font-bold text-xs">{selectedCitizen.disasterType} ({selectedCitizen.disasterTitle})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">DISTANCE & RISK LEVEL:</span>
                  <span className="text-red-400 font-extrabold text-xs">{selectedCitizen.distanceKm} km — {selectedCitizen.riskLevel}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase block">EMAIL CONTENT PREVIEW INCLUDED:</span>
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                  <li>Disaster-specific precaution instructions for {selectedCitizen.disasterType}</li>
                  <li>Proximity distance and severity classification alert badge</li>
                  <li>Official Emergency Contacts (112 / 101 / 108)</li>
                  <li>Live ResQAI Incident & Responder map navigation link</li>
                </ul>
              </div>

              {emailResultMsg && (
                <div className={`p-3.5 rounded-2xl border text-xs font-bold ${
                  emailResultMsg.type === 'success'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                    : 'bg-red-950/90 text-red-300 border-red-700'
                }`}>
                  {emailResultMsg.text}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                onClick={() => setShowSendEmailModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteSendEmail}
                disabled={sendingEmail}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-red-950/50 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>DISPATCHING EMAIL...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>CONFIRM & SEND SAFETY EMAIL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
