import React, { useState, useEffect, useMemo } from 'react';
import { 
  MissingPerson, 
  MissingPersonStatus, 
  PossibleMatchCandidate, 
  ReunificationStats 
} from '../../types';
import { apiService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Sparkles, 
  UserPlus, 
  Phone, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  ScanFace, 
  ShieldCheck, 
  Eye, 
  Lock, 
  Building2, 
  Users, 
  Calendar, 
  Clock, 
  FileText, 
  Check, 
  X, 
  ArrowRight, 
  HeartHandshake, 
  RefreshCw, 
  SlidersHorizontal, 
  AlertTriangle,
  Mail,
  UserCheck,
  Hospital,
  Compass,
  History,
  Info
} from 'lucide-react';

export const MissingPersonsPage: React.FC = () => {
  const { socket } = useSocket();
  const { user, role } = useAuth();
  const isOperator = role === 'Emergency Operator' || role === 'EMERGENCY_OPERATOR' || role === 'Admin' || role === 'Super Admin';

  // Navigation Tabs: 'browse', 'report-missing', 'register-found', 'admin-matches'
  const [activeTab, setActiveTab] = useState<'browse' | 'report-missing' | 'register-found' | 'admin-matches'>('browse');

  // Data State
  const [cases, setCases] = useState<MissingPerson[]>([]);
  const [stats, setStats] = useState<ReunificationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterGender, setFilterGender] = useState<string>('ALL');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');

  // Modals
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState<MissingPerson | null>(null);
  const [investigatingMatchPair, setInvestigatingMatchPair] = useState<{
    primaryCase: MissingPerson;
    match: PossibleMatchCandidate;
  } | null>(null);
  const [reuniteModalCase, setReuniteModalCase] = useState<MissingPerson | null>(null);

  // Verification Form State
  const [humanVerifyConfirmed, setHumanVerifyConfirmed] = useState<boolean>(false);
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Reunite Form State
  const [reunitedName, setReunitedName] = useState<string>('');
  const [reunitedContact, setReunitedContact] = useState<string>('');
  const [reunitedRelation, setReunitedRelation] = useState<string>('Parent / Guardian');
  const [reunitedNotes, setReunitedNotes] = useState<string>('');

  // Report Missing Form State
  const [missingForm, setMissingForm] = useState({
    fullName: '',
    age: '',
    gender: 'Male' as const,
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    lastSeenLocation: '',
    approximateArea: '',
    dateTimeLastSeen: new Date().toISOString().slice(0, 16),
    description: '',
    distinguishingFeatures: '',
    disasterIncidentId: 'INC-FLOOD-DELHI-01',
    familyContactName: '',
    familyContactPhone: '',
    familyContactEmail: '',
    relationshipToPerson: 'Parent',
    consentForPublicListing: true,
    isConfidential: false
  });

  // Register Found Form State
  const [foundForm, setFoundForm] = useState({
    fullName: 'Unidentified Individual',
    age: '',
    gender: 'Unknown' as const,
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    lastSeenLocation: 'Central Stadium Grounds Relief Camp',
    approximateArea: 'Central Delhi',
    shelterOrHospitalName: 'Central Relief Shelter #1 Intake Desk',
    shelterOrHospitalId: 'camp_1',
    medicalCondition: 'Stable',
    description: '',
    distinguishingFeatures: '',
    disasterIncidentId: 'INC-FLOOD-DELHI-01',
    intakeOfficerName: user?.name || 'Officer On Duty',
    intakeOfficerBadge: 'NDRF-UNIT-09'
  });

  // Success Notification Banner
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Fetch Cases and Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const [allCases, statistics] = await Promise.all([
        apiService.getMissingPersons(),
        apiService.getMissingPersonStats()
      ]);
      setCases(allCases || []);
      setStats(statistics);
    } catch (err) {
      console.error('Error fetching reunification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('missing_person:reported', (newCase: MissingPerson) => {
      setCases(prev => [newCase, ...prev.filter(c => c.caseId !== newCase.caseId && c.id !== newCase.id)]);
      apiService.getMissingPersonStats().then(s => setStats(s)).catch(() => {});
      setBannerNotice(`📢 New Missing Person report registered: ${newCase.fullName}`);
      setTimeout(() => setBannerNotice(null), 5000);
    });

    socket.on('missing_person:found_registered', (foundCase: MissingPerson) => {
      setCases(prev => [foundCase, ...prev.filter(c => c.caseId !== foundCase.caseId && c.id !== foundCase.id)]);
      apiService.getMissingPersonStats().then(s => setStats(s)).catch(() => {});
      setBannerNotice(`🏥 Found individual intake recorded: ${foundCase.fullName} at ${foundCase.shelterOrHospitalName || 'Relief Shelter'}`);
      setTimeout(() => setBannerNotice(null), 5000);
    });

    socket.on('missing_person:match_suggested', (data: any) => {
      fetchData();
      setBannerNotice(`🔍 Match Suggestion flagged for Case ${data.caseId} (Score: ${data.topScore}%). Requires human verification.`);
      setTimeout(() => setBannerNotice(null), 6000);
    });

    socket.on('missing_person:status_updated', (data: any) => {
      setCases(prev => prev.map(c => (c.caseId === data.caseId || c.id === data.caseId) ? { ...c, status: data.status } : c));
      apiService.getMissingPersonStats().then(s => setStats(s)).catch(() => {});
    });

    socket.on('missing_person:reunited', (data: any) => {
      setCases(prev => prev.map(c => (c.caseId === data.caseId || c.id === data.caseId) ? { ...c, status: 'Reunited' } : c));
      apiService.getMissingPersonStats().then(s => setStats(s)).catch(() => {});
      setBannerNotice(`🎉 Family Reunification finalized for ${data.fullName}!`);
      setTimeout(() => setBannerNotice(null), 7000);
    });

    return () => {
      socket.off('missing_person:reported');
      socket.off('missing_person:found_registered');
      socket.off('missing_person:match_suggested');
      socket.off('missing_person:status_updated');
      socket.off('missing_person:reunited');
    };
  }, [socket]);

  // Handle Missing Form Submit
  const handleReportMissingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAction(true);
      const res = await apiService.createMissingPerson({
        ...missingForm,
        age: Number(missingForm.age) || 0,
        distinguishingFeatures: missingForm.distinguishingFeatures
          ? missingForm.distinguishingFeatures.split(',').map(s => s.trim())
          : []
      });

      if (res.success || res.case) {
        alert('Missing person report registered successfully! Our response teams and relief shelters have been alerted.');
        setActiveTab('browse');
        fetchData();
        // Reset form
        setMissingForm({
          fullName: '',
          age: '',
          gender: 'Male',
          photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          lastSeenLocation: '',
          approximateArea: '',
          dateTimeLastSeen: new Date().toISOString().slice(0, 16),
          description: '',
          distinguishingFeatures: '',
          disasterIncidentId: 'INC-FLOOD-DELHI-01',
          familyContactName: '',
          familyContactPhone: '',
          familyContactEmail: '',
          relationshipToPerson: 'Parent',
          consentForPublicListing: true,
          isConfidential: false
        });
      } else {
        alert(res.message || 'Failed to submit report');
      }
    } catch (err: any) {
      alert('Error submitting report: ' + err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Found Form Submit
  const handleRegisterFoundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAction(true);
      const res = await apiService.registerFoundPerson({
        ...foundForm,
        age: Number(foundForm.age) || 0,
        distinguishingFeatures: foundForm.distinguishingFeatures
          ? foundForm.distinguishingFeatures.split(',').map(s => s.trim())
          : [],
        intakeOfficer: {
          name: foundForm.intakeOfficerName,
          badgeOrId: foundForm.intakeOfficerBadge
        }
      });

      if (res.success || res.case) {
        alert('Found individual intake recorded successfully! Algorithmic matching against active missing reports completed.');
        setActiveTab('browse');
        fetchData();
      } else {
        alert(res.message || 'Failed to register found person');
      }
    } catch (err: any) {
      alert('Error registering found person: ' + err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Match Human Verification
  const handleConfirmHumanVerification = async () => {
    if (!investigatingMatchPair) return;
    if (!humanVerifyConfirmed) {
      alert('Please check the confirmation box confirming official human identity verification has been performed.');
      return;
    }

    try {
      setIsSubmittingAction(true);
      const res = await apiService.verifyMatch(
        investigatingMatchPair.primaryCase.caseId || investigatingMatchPair.primaryCase.id,
        investigatingMatchPair.match.targetCaseId,
        verificationNotes,
        true
      );

      if (res.success) {
        alert('Official Identity Verification Recorded! Both cases have transitioned to VERIFIED. Family notification dispatched.');
        setInvestigatingMatchPair(null);
        setHumanVerifyConfirmed(false);
        setVerificationNotes('');
        fetchData();
      } else {
        alert(res.message || 'Failed to verify match');
      }
    } catch (err: any) {
      alert('Verification error: ' + err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Match Rejection
  const handleRejectSuggestion = async () => {
    if (!investigatingMatchPair) return;
    const reason = prompt('Please enter the reason for rejecting this suggestion:', 'Physical attributes or photo inspection do not match.') || '';
    if (!reason) return;

    try {
      setIsSubmittingAction(true);
      const res = await apiService.rejectMatch(
        investigatingMatchPair.primaryCase.caseId || investigatingMatchPair.primaryCase.id,
        investigatingMatchPair.match.targetCaseId,
        reason
      );
      if (res.success) {
        alert('Match suggestion rejected.');
        setInvestigatingMatchPair(null);
        fetchData();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Family Reunification Finalization
  const handleCompleteReunification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reuniteModalCase) return;

    try {
      setIsSubmittingAction(true);
      const res = await apiService.reuniteCase(
        reuniteModalCase.caseId || reuniteModalCase.id,
        {
          reunitedWithName: reunitedName || reuniteModalCase.familyContactName,
          reunitedWithContact: reunitedContact || reuniteModalCase.familyContactPhone,
          relationship: reunitedRelation,
          notes: reunitedNotes || 'Official handover completed at shelter intake desk.'
        }
      );

      if (res.success) {
        alert('Family Reunification finalized! Official case closed with permanent audit record.');
        setReuniteModalCase(null);
        fetchData();
      } else {
        alert(res.message || 'Failed to complete reunification');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Filtered Cases
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Type
      if (filterType !== 'ALL' && c.recordType !== filterType) return false;
      // Status
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
      // Gender
      if (filterGender !== 'ALL' && c.gender !== filterGender) return false;
      // Age range
      if (minAge && c.age < Number(minAge)) return false;
      if (maxAge && c.age > Number(maxAge)) return false;
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = c.fullName.toLowerCase().includes(query);
        const matchLoc = (c.lastSeenLocation || '').toLowerCase().includes(query);
        const matchArea = (c.approximateArea || '').toLowerCase().includes(query);
        const matchDesc = (c.description || '').toLowerCase().includes(query);
        const matchId = (c.caseId || c.id || '').toLowerCase().includes(query);
        if (!matchName && !matchLoc && !matchArea && !matchDesc && !matchId) return false;
      }
      return true;
    });
  }, [cases, filterType, filterStatus, filterGender, minAge, maxAge, searchTerm]);

  // Helper Badge Color
  const getStatusBadge = (status: MissingPersonStatus) => {
    switch (status) {
      case 'Reunited':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
      case 'Verified':
        return 'bg-teal-950 text-teal-300 border-teal-500/80';
      case 'Under Verification':
        return 'bg-purple-950 text-purple-300 border-purple-500/80';
      case 'Possible Match':
        return 'bg-blue-950 text-blue-300 border-blue-500/80 animate-pulse';
      case 'Searching':
        return 'bg-amber-950 text-amber-300 border-amber-500/80';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-7">

      {/* Real-time Toast Banner */}
      {bannerNotice && (
        <div className="bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-500/80 rounded-2xl p-4 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3 text-xs text-white font-medium">
            <HeartHandshake className="w-5 h-5 text-blue-400 shrink-0" />
            <span>{bannerNotice}</span>
          </div>
          <button onClick={() => setBannerNotice(null)} className="text-slate-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-400">
              <ScanFace className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                  ResQAI Reunification Network
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Shelter & Hospital Tracing Live</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Missing Persons & Family Reunification Portal
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
            Coordinated disaster tracing registry linking citizen missing person reports with authorized shelter intakes, hospital casualty registries, and rescue boat manifests. Multi-attribute suggestion engine flags potential matches with strict authorized human verification.
          </p>
        </div>

        {/* Global Tab Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'browse'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search & Browse</span>
          </button>

          <button
            onClick={() => setActiveTab('report-missing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'report-missing'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Report Missing Person</span>
          </button>

          <button
            onClick={() => setActiveTab('register-found')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'register-found'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Register Found (Shelters/Staff)</span>
          </button>

          {isOperator && (
            <button
              onClick={() => setActiveTab('admin-matches')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'admin-matches'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Investigate Matches ({stats?.possibleMatchCount || 0})</span>
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Cases</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">{stats?.totalCases ?? cases.length}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Active registry</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">Missing Reported</span>
          <span className="text-2xl font-extrabold text-rose-300 mt-1 block">{stats?.totalMissing ?? 0}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Citizen reports</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider block">Found at Shelters</span>
          <span className="text-2xl font-extrabold text-teal-300 mt-1 block">{stats?.totalFound ?? 0}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Intake verified</span>
        </div>

        <div className="bg-slate-900/70 border border-blue-900/40 rounded-2xl p-4">
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">Candidate Matches</span>
          <span className="text-2xl font-extrabold text-blue-300 mt-1 block">{stats?.possibleMatchCount ?? 0}</span>
          <span className="text-[10px] text-blue-400/80 font-mono mt-0.5 block">Awaiting review</span>
        </div>

        <div className="bg-slate-900/70 border border-purple-900/40 rounded-2xl p-4">
          <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block">Under Verification</span>
          <span className="text-2xl font-extrabold text-purple-300 mt-1 block">{stats?.underVerificationCount ?? 0}</span>
          <span className="text-[10px] text-purple-400/80 font-mono mt-0.5 block">Investigating</span>
        </div>

        <div className="bg-slate-900/70 border border-emerald-900/50 rounded-2xl p-4">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Reunited</span>
          <span className="text-2xl font-extrabold text-emerald-300 mt-1 block">{stats?.reunitedCount ?? 0}</span>
          <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">Family reunited</span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: BROWSE & SEARCH
      ========================================================================= */}
      {activeTab === 'browse' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-[#0b1224] border border-slate-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, location, case ID, or description..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none font-mono"
                >
                  <option value="ALL">All Records</option>
                  <option value="MISSING">Missing Persons Only</option>
                  <option value="FOUND">Found at Shelters Only</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none font-mono"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="Searching">Searching</option>
                  <option value="Possible Match">Possible Match</option>
                  <option value="Under Verification">Under Verification</option>
                  <option value="Verified">Verified</option>
                  <option value="Reunited">Reunited</option>
                </select>

                {/* Gender Filter */}
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none font-mono"
                >
                  <option value="ALL">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>

                {/* Age Inputs */}
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    placeholder="Min"
                    className="w-14 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-2 py-2 outline-none text-center font-mono"
                  />
                  <span className="text-slate-600">-</span>
                  <input
                    type="number"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    placeholder="Max"
                    className="w-14 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-2 py-2 outline-none text-center font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Privacy & Safeguard notice */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Public search view: Contact numbers and precise coordinates are masked for citizen safety.</span>
              </span>
              <span>Showing {filteredCases.length} of {cases.length} records</span>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="p-16 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
              <p className="text-xs">Loading missing person reports and shelter registries...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2 bg-slate-900/40 rounded-2xl border border-slate-800">
              <AlertTriangle className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-400">No matching cases found</p>
              <p className="text-xs text-slate-600">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCases.map((caseItem) => {
                const isFound = caseItem.recordType === 'FOUND';
                const hasMatches = (caseItem.possibleMatches?.length || 0) > 0;

                return (
                  <div
                    key={caseItem.caseId || caseItem.id}
                    className="bg-[#0c1428] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isFound
                              ? 'bg-teal-950 text-teal-300 border-teal-700'
                              : 'bg-rose-950 text-rose-300 border-rose-700'
                          }`}>
                            {isFound ? 'FOUND AT SHELTER' : 'REPORTED MISSING'}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getStatusBadge(caseItem.status)}`}>
                            {caseItem.status.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {caseItem.caseId}
                        </span>
                      </div>

                      {/* Photo & Main Details */}
                      <div className="flex items-start space-x-3.5 mt-3.5">
                        <img
                          src={caseItem.photoUrl}
                          alt={caseItem.fullName}
                          className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-md shrink-0 bg-slate-900"
                          onError={(e) => {
                            (e.target as any).src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-base text-white leading-tight">
                            {caseItem.fullName}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">
                            {caseItem.age} Years • {caseItem.gender}
                          </p>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate">{caseItem.approximateArea || caseItem.lastSeenLocation}</span>
                          </div>
                          {caseItem.shelterOrHospitalName && (
                            <div className="flex items-center space-x-1.5 text-[11px] text-teal-400">
                              <Building2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">{caseItem.shelterOrHospitalName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description preview */}
                      <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        {caseItem.description || 'No detailed clothing or physical notes provided.'}
                      </p>

                      {/* Match Suggestion pill if present */}
                      {hasMatches && caseItem.status !== 'Reunited' && (
                        <div className="mt-2.5 bg-blue-950/60 border border-blue-800/50 rounded-xl p-2.5 flex items-center justify-between text-xs text-blue-300">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                            <span>Candidate match identified ({caseItem.possibleMatches![0].matchScore}%)</span>
                          </div>
                          {isOperator && (
                            <button
                              onClick={() => setInvestigatingMatchPair({
                                primaryCase: caseItem,
                                match: caseItem.possibleMatches![0]
                              })}
                              className="text-[11px] font-bold text-blue-400 hover:text-white underline"
                            >
                              Inspect
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs mt-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-mono">Contact / Desk</span>
                        <span className="font-semibold text-slate-300 text-[11px] truncate max-w-[150px] block">
                          {caseItem.familyContactName}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedCaseForDetail(caseItem)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>View Details</span>
                        </button>

                        {isOperator && caseItem.status === 'Verified' && (
                          <button
                            onClick={() => {
                              setReuniteModalCase(caseItem);
                              setReunitedName(caseItem.familyContactName);
                              setReunitedContact(caseItem.familyContactPhone);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-all shadow-md"
                          >
                            <HeartHandshake className="w-3.5 h-3.5" />
                            <span>Reunite</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: CITIZEN REPORT FORM
      ========================================================================= */}
      {activeTab === 'report-missing' && (
        <div className="max-w-3xl mx-auto bg-[#0b1328] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">
                  Citizen Disaster Reporting Portal
                </span>
                <h2 className="text-xl font-bold text-white">Report Missing Family Member or Loved One</h2>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Submit details of your missing family member to initiate immediate cross-referencing against evacuation camp intakes, rescue manifests, and hospital admissions across disaster zones.
            </p>
          </div>

          <form onSubmit={handleReportMissingSubmit} className="space-y-5 text-xs font-sans">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-slate-300 font-semibold">Missing Individual Full Name *</label>
                <input
                  type="text"
                  required
                  value={missingForm.fullName}
                  onChange={(e) => setMissingForm({ ...missingForm, fullName: e.target.value })}
                  placeholder="e.g. Aarav Mehta"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Approximate Age *</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={120}
                  value={missingForm.age}
                  onChange={(e) => setMissingForm({ ...missingForm, age: e.target.value })}
                  placeholder="e.g. 11"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Gender & Photo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Gender *</label>
                <select
                  value={missingForm.gender}
                  onChange={(e) => setMissingForm({ ...missingForm, gender: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Photograph URL</label>
                <input
                  type="url"
                  value={missingForm.photoUrl}
                  onChange={(e) => setMissingForm({ ...missingForm, photoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Location & Last Seen Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Last Known Location / Landmark *</label>
                <input
                  type="text"
                  required
                  value={missingForm.lastSeenLocation}
                  onChange={(e) => setMissingForm({ ...missingForm, lastSeenLocation: e.target.value })}
                  placeholder="e.g. Sector 9 Flood Evacuation Hub, New Delhi"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Date & Time Last Seen</label>
                <input
                  type="datetime-local"
                  value={missingForm.dateTimeLastSeen}
                  onChange={(e) => setMissingForm({ ...missingForm, dateTimeLastSeen: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Description & Distinguishing Features */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Clothing & Physical Description</label>
              <textarea
                rows={3}
                value={missingForm.description}
                onChange={(e) => setMissingForm({ ...missingForm, description: e.target.value })}
                placeholder="Wearing blue hoodie, grey trousers. Black backpack. Speaks Hindi and English."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Distinguishing Marks / Medical Needs (Comma separated)</label>
              <input
                type="text"
                value={missingForm.distinguishingFeatures}
                onChange={(e) => setMissingForm({ ...missingForm, distinguishingFeatures: e.target.value })}
                placeholder="Birthmark on left wrist, gold earrings, diabetic medication needed"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Family Contact Details (Protected) */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                Primary Contact Details (Protected & Masked for Public Safety)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={missingForm.familyContactName}
                    onChange={(e) => setMissingForm({ ...missingForm, familyContactName: e.target.value })}
                    placeholder="e.g. Sunita Mehta"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={missingForm.familyContactPhone}
                    onChange={(e) => setMissingForm({ ...missingForm, familyContactPhone: e.target.value })}
                    placeholder="+91 98123 99900"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Email for Match Alerts</label>
                  <input
                    type="email"
                    value={missingForm.familyContactEmail}
                    onChange={(e) => setMissingForm({ ...missingForm, familyContactEmail: e.target.value })}
                    placeholder="smmandlik.1318@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={missingForm.consentForPublicListing}
                  onChange={(e) => setMissingForm({ ...missingForm, consentForPublicListing: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Publish in public missing persons directory (Phone and exact GPS will be masked).</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={missingForm.isConfidential}
                  onChange={(e) => setMissingForm({ ...missingForm, isConfidential: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Confidential report: Restrict access exclusively to verified emergency operators and NDRF rescue teams.</span>
              </label>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmittingAction ? 'Registering Case...' : 'Submit Missing Person Report'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 3: FOUND PERSON REGISTRATION (SHELTERS & RESCUE STAFF)
      ========================================================================= */}
      {activeTab === 'register-found' && (
        <div className="max-w-3xl mx-auto bg-[#0b1328] border border-teal-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-teal-950/80 border border-teal-500/50 text-teal-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest">
                  Authorized Rescue & Shelter Intake Registry
                </span>
                <h2 className="text-xl font-bold text-white">Register Found / Sheltered Individual</h2>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Authorized intake workflow for relief camps, hospital trauma units, and rescue boat teams to register individuals under care.
            </p>
          </div>

          <form onSubmit={handleRegisterFoundSubmit} className="space-y-5 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-slate-300 font-semibold">Individual Name (or Unidentified)</label>
                <input
                  type="text"
                  required
                  value={foundForm.fullName}
                  onChange={(e) => setFoundForm({ ...foundForm, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Estimated Age</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={foundForm.age}
                  onChange={(e) => setFoundForm({ ...foundForm, age: e.target.value })}
                  placeholder="e.g. 11"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Gender</label>
                <select
                  value={foundForm.gender}
                  onChange={(e) => setFoundForm({ ...foundForm, gender: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Current Medical Condition</label>
                <select
                  value={foundForm.medicalCondition}
                  onChange={(e) => setFoundForm({ ...foundForm, medicalCondition: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500"
                >
                  <option value="Stable">Stable & Healthy</option>
                  <option value="Minor Injuries">Minor Injuries (Bandaged)</option>
                  <option value="Dehydrated">Dehydrated / Exhausted</option>
                  <option value="Trauma Ward">Hospital Trauma Care</option>
                  <option value="Unconscious">Unconscious / Intensive Care</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Intake Facility / Relief Shelter Name *</label>
                <input
                  type="text"
                  required
                  value={foundForm.shelterOrHospitalName}
                  onChange={(e) => setFoundForm({ ...foundForm, shelterOrHospitalName: e.target.value })}
                  placeholder="Stadium Evacuation Shelter #1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Location / Intake Desk Landmark *</label>
                <input
                  type="text"
                  required
                  value={foundForm.lastSeenLocation}
                  onChange={(e) => setFoundForm({ ...foundForm, lastSeenLocation: e.target.value })}
                  placeholder="Jawaharlal Nehru Stadium Complex Grounds"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Photographic Intake URL</label>
              <input
                type="url"
                value={foundForm.photoUrl}
                onChange={(e) => setFoundForm({ ...foundForm, photoUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Intake Notes & Clothing Description</label>
              <textarea
                rows={3}
                value={foundForm.description}
                onChange={(e) => setFoundForm({ ...foundForm, description: e.target.value })}
                placeholder="Child rescued from Sector 9 flood boat. Wearing dark blue fleece top. Responds to Aarav."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Intake Officer Name</label>
                <input
                  type="text"
                  value={foundForm.intakeOfficerName}
                  onChange={(e) => setFoundForm({ ...foundForm, intakeOfficerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Officer Badge / Relief ID</label>
                <input
                  type="text"
                  value={foundForm.intakeOfficerBadge}
                  onChange={(e) => setFoundForm({ ...foundForm, intakeOfficerBadge: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/30 flex items-center space-x-2 disabled:opacity-50"
              >
                <Building2 className="w-4 h-4" />
                <span>{isSubmittingAction ? 'Registering...' : 'Register Found Individual'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 4: OPERATOR MATCH INVESTIGATION COMMAND CENTER
      ========================================================================= */}
      {activeTab === 'admin-matches' && (
        <div className="space-y-5">
          <div className="bg-[#0b1224] border border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-500/50">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reunification Match Investigation Queue</h3>
                  <p className="text-xs text-slate-400">
                    Algorithmic candidate matches flagged for mandatory human identity verification.
                  </p>
                </div>
              </div>
            </div>

            {/* Candidate queue items */}
            <div className="space-y-3 pt-2">
              {cases.filter(c => (c.possibleMatches?.length || 0) > 0 && c.status !== 'Reunited').length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  No active match suggestions in queue. All flagged candidates have been investigated.
                </div>
              ) : (
                cases.filter(c => (c.possibleMatches?.length || 0) > 0 && c.status !== 'Reunited').map((caseItem) => (
                  <div
                    key={caseItem.caseId || caseItem.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={caseItem.photoUrl}
                        alt={caseItem.fullName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-white text-sm">{caseItem.fullName}</span>
                          <span className="text-xs text-slate-400 font-mono">({caseItem.age} yrs, {caseItem.gender})</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getStatusBadge(caseItem.status)}`}>
                            {caseItem.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Location: {caseItem.lastSeenLocation} • Contact: {caseItem.familyContactName} ({caseItem.familyContactPhone})
                        </p>
                        <p className="text-xs text-blue-300 font-mono mt-1">
                          Candidate: {caseItem.possibleMatches![0].matchedName || caseItem.possibleMatches![0].targetCaseId} ({caseItem.possibleMatches![0].matchScore}% Match Score)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => setInvestigatingMatchPair({
                          primaryCase: caseItem,
                          match: caseItem.possibleMatches![0]
                        })}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center space-x-1.5"
                      >
                        <ScanFace className="w-4 h-4" />
                        <span>Investigate & Verify Match</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: SIDE-BY-SIDE MATCH INVESTIGATION & VERIFICATION
      ========================================================================= */}
      {investigatingMatchPair && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#0b1329] border border-blue-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-blue-950 text-blue-400 border border-blue-500/40">
                  <ScanFace className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                    Side-by-Side Match Review
                  </span>
                  <h3 className="text-lg font-bold text-white">Investigate Candidate Reunification Match</h3>
                </div>
              </div>
              <button
                onClick={() => setInvestigatingMatchPair(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MANDATORY SAFEGUARD WARNING BANNER */}
            <div className="bg-amber-950/80 border border-amber-500/80 rounded-2xl p-4 text-xs space-y-1.5 text-amber-200">
              <div className="flex items-center space-x-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>MANDATORY PROTOCOL: SUGGESTION ONLY — NEVER AUTOMATICALLY VERIFIED</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Algorithmic facial, age, and name matching provides advisory similarity indicators only. Disaster response policy legally prohibits declaring two individuals to be the same person based solely on algorithmic or facial metrics. <strong>Official human identity verification by an authorized operator or shelter intake officer is strictly required.</strong>
              </p>
            </div>

            {/* Side-by-Side Comparison Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card A: Missing Report */}
              <div className="bg-slate-950/80 border border-rose-900/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-rose-400 uppercase font-mono">Case A: Missing Person Report</span>
                  <span className="text-[10px] font-mono text-slate-500">{investigatingMatchPair.primaryCase.caseId}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <img
                    src={investigatingMatchPair.primaryCase.photoUrl}
                    alt={investigatingMatchPair.primaryCase.fullName}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-700"
                  />
                  <div className="text-xs space-y-0.5">
                    <h4 className="font-bold text-white text-sm">{investigatingMatchPair.primaryCase.fullName}</h4>
                    <p className="text-slate-400">{investigatingMatchPair.primaryCase.age} yrs • {investigatingMatchPair.primaryCase.gender}</p>
                    <p className="text-slate-300">Last Seen: {investigatingMatchPair.primaryCase.lastSeenLocation}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <p><strong>Description:</strong> {investigatingMatchPair.primaryCase.description || 'N/A'}</p>
                  <p className="mt-1"><strong>Contact:</strong> {investigatingMatchPair.primaryCase.familyContactName} ({investigatingMatchPair.primaryCase.familyContactPhone})</p>
                </div>
              </div>

              {/* Card B: Found Candidate Record */}
              <div className="bg-slate-950/80 border border-teal-900/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-teal-400 uppercase font-mono">Case B: Candidate Found Intake</span>
                  <span className="text-[10px] font-mono text-slate-500">{investigatingMatchPair.match.targetCaseId}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <img
                    src={investigatingMatchPair.match.matchedPhotoUrl || investigatingMatchPair.primaryCase.photoUrl}
                    alt="Found Candidate"
                    className="w-20 h-20 rounded-xl object-cover border border-slate-700"
                  />
                  <div className="text-xs space-y-0.5">
                    <h4 className="font-bold text-white text-sm">{investigatingMatchPair.match.matchedName || 'Candidate Record'}</h4>
                    <p className="text-slate-400">{investigatingMatchPair.match.matchedAge || investigatingMatchPair.primaryCase.age} yrs • Found Individual</p>
                    <p className="text-slate-300">Intake Desk: {investigatingMatchPair.match.matchedLocation || 'Relief Shelter'}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <p><strong>Computed Match Score:</strong> <span className="text-emerald-400 font-bold font-mono">{investigatingMatchPair.match.matchScore}% Confidence</span></p>
                  <p className="mt-1 text-slate-400"><strong>Attribute Evaluation:</strong> {investigatingMatchPair.match.matchReason}</p>
                </div>
              </div>
            </div>

            {/* Operator Human Verification Form */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <label className="block text-slate-300 font-semibold">Operator Verification Findings & Interview Notes *</label>
              <textarea
                rows={2}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Spoke with shelter officer and mother via phone. Birthmark on left wrist verified. Positive photo confirmation by family."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />

              <label className="flex items-center space-x-2.5 text-slate-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={humanVerifyConfirmed}
                  onChange={(e) => setHumanVerifyConfirmed(e.target.checked)}
                  className="rounded border-slate-600 text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <span className="font-semibold text-emerald-300">
                  I confirm that I have verified the identity of this individual through official identity documentation, intake logs, or direct family confirmation.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleRejectSuggestion}
                disabled={isSubmittingAction}
                className="px-4 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-all"
              >
                Reject Suggestion (Not a Match)
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setInvestigatingMatchPair(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHumanVerification}
                  disabled={!humanVerifyConfirmed || isSubmittingAction}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSubmittingAction ? 'Recording Verification...' : 'Confirm Human Match Verification'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: COMPLETE FAMILY REUNIFICATION
      ========================================================================= */}
      {reuniteModalCase && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#0b1329] border border-emerald-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                    Official Case Closure
                  </span>
                  <h3 className="text-lg font-bold text-white">Finalize Family Reunification</h3>
                </div>
              </div>
              <button onClick={() => setReuniteModalCase(null)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteReunification} className="space-y-4 text-xs">
              <p className="text-slate-300">
                Record the official physical handover and close missing case <strong>{reuniteModalCase.fullName}</strong>.
              </p>

              <div>
                <label className="block text-slate-400 mb-1">Guardian / Family Member Name *</label>
                <input
                  type="text"
                  required
                  value={reunitedName}
                  onChange={(e) => setReunitedName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={reunitedContact}
                  onChange={(e) => setReunitedContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Relationship</label>
                <input
                  type="text"
                  value={reunitedRelation}
                  onChange={(e) => setReunitedRelation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Handover Notes</label>
                <textarea
                  rows={2}
                  value={reunitedNotes}
                  onChange={(e) => setReunitedNotes(e.target.value)}
                  placeholder="Handover finalized at Stadium Shelter #1 command desk. ID inspected."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReuniteModalCase(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Finalize & Close Case</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CASE DETAILS & AUDIT TIMELINE
      ========================================================================= */}
      {selectedCaseForDetail && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#0b1329] border border-slate-700 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Case Dossier</span>
                  <h3 className="text-lg font-bold text-white">{selectedCaseForDetail.fullName}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedCaseForDetail(null)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center space-x-4">
                <img
                  src={selectedCaseForDetail.photoUrl}
                  alt={selectedCaseForDetail.fullName}
                  className="w-24 h-24 rounded-2xl object-cover border border-slate-700"
                />
                <div className="space-y-1">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getStatusBadge(selectedCaseForDetail.status)}`}>
                    {selectedCaseForDetail.status.toUpperCase()}
                  </span>
                  <p className="text-white font-bold text-sm mt-1">ID: {selectedCaseForDetail.caseId || selectedCaseForDetail.id}</p>
                  <p className="text-slate-400">{selectedCaseForDetail.age} Years • {selectedCaseForDetail.gender}</p>
                  <p className="text-slate-300">Location: {selectedCaseForDetail.lastSeenLocation}</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <p><strong>Physical Description:</strong> {selectedCaseForDetail.description || 'None'}</p>
                {selectedCaseForDetail.distinguishingFeatures && selectedCaseForDetail.distinguishingFeatures.length > 0 && (
                  <p><strong>Distinguishing Features:</strong> {selectedCaseForDetail.distinguishingFeatures.join(', ')}</p>
                )}
                <p><strong>Family Contact:</strong> {selectedCaseForDetail.familyContactName} ({selectedCaseForDetail.familyContactPhone})</p>
              </div>

              {/* Audit Trail */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>Case Audit Log & History</span>
                </h4>
                <div className="space-y-2">
                  {selectedCaseForDetail.auditLogs && selectedCaseForDetail.auditLogs.length > 0 ? (
                    selectedCaseForDetail.auditLogs.map((log, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-0.5">
                        <div className="flex justify-between font-mono text-slate-400">
                          <span className="font-bold text-indigo-300">{log.action}</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300">{log.notes}</p>
                        <p className="text-[10px] text-slate-500">By {log.performedBy} ({log.performedByRole})</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-[11px]">No audit logs recorded for this entry.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
