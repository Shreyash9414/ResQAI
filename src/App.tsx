import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';

// Services & Mock Datasets
import { apiService, MOCK_INCIDENTS, MOCK_RESOURCES, MOCK_HOSPITALS, MOCK_CAMPS, MOCK_MISSING, MOCK_NOTIFICATIONS } from './services/api';
import { Incident, ResourceUnit, Hospital, ReliefCamp, MissingPerson, NotificationItem } from './types';

// Layout & Common Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LiveCommandMap } from './components/map/LiveCommandMap';
import { AIIncidentReportModal } from './components/ai/AIIncidentReportModal';
import { DroneScannerModal } from './components/ai/DroneScannerModal';
import { EmergencyChatModal } from './components/chat/EmergencyChatModal';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { AIEmergencyChatbot } from './components/chatbot/AIEmergencyChatbot';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OperatorProtectedRoute } from './components/auth/OperatorProtectedRoute';
import { CitizenProtectedRoute } from './components/auth/CitizenProtectedRoute';

// Pages & Dashboards
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { CitizenLoginPage } from './pages/CitizenLoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CitizenRegisterPage } from './pages/CitizenRegisterPage';
import { CitizenDashboard } from './pages/dashboards/CitizenDashboard';
import { OperatorDashboard } from './pages/dashboards/OperatorDashboard';
import { HospitalDashboard } from './pages/dashboards/HospitalDashboard';
import { ResponderDashboard } from './pages/dashboards/ResponderDashboard';
import { VolunteerDashboard } from './pages/dashboards/VolunteerDashboard';
import { NGODashboard } from './pages/dashboards/NGODashboard';
import { ReliefCampDashboard } from './pages/dashboards/ReliefCampDashboard';
import { MissingPersonsPage } from './pages/dashboards/MissingPersonsPage';
import { DroneReconDashboard } from './pages/dashboards/DroneReconDashboard';
import { AnalyticsAdminDashboard } from './pages/dashboards/AnalyticsAdminDashboard';
import { ResourceManagementDashboard } from './pages/dashboards/ResourceManagementDashboard';
import { CitizenTrackingPage } from './pages/CitizenTrackingPage';
import { AdminTransportTrackingPage } from './pages/AdminTransportTrackingPage';
import { CitizenTransportTrackingPage } from './pages/CitizenTransportTrackingPage';
import { WeatherDisasterMonitoringPage } from './pages/WeatherDisasterMonitoringPage';
import { SafetyPage } from './pages/SafetyPage';
import { CitizenEvacuationPage } from './pages/dashboards/CitizenEvacuationPage';
import { OperatorEvacuationPage } from './pages/dashboards/OperatorEvacuationPage';
import { AdminDisasterPredictionsPage } from './pages/dashboards/AdminDisasterPredictionsPage';

const MainAppLayout: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();
  const { socket } = useSocket();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [droneModalOpen, setDroneModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Application Datasets State
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [resources, setResources] = useState<ResourceUnit[]>(MOCK_RESOURCES);
  const [hospitals, setHospitals] = useState<Hospital[]>(MOCK_HOSPITALS);
  const [camps, setCamps] = useState<ReliefCamp[]>(MOCK_CAMPS);
  const [missingPersons, setMissingPersons] = useState<MissingPerson[]>(MOCK_MISSING);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  useEffect(() => {
    apiService.getIncidents().then((data) => {
      if (Array.isArray(data)) setIncidents(data);
    });
    apiService.getResources().then((data: any) => {
      if (Array.isArray(data)) {
        setResources(data);
      } else if (data && Array.isArray(data.resources)) {
        setResources(data.resources);
      }
    });
    apiService.getHospitals().then((res: any) => {
      if (Array.isArray(res)) {
        setHospitals(res);
      } else if (res && Array.isArray(res.hospitals)) {
        setHospitals(res.hospitals);
      }
    });
    apiService.getCamps().then((data) => {
      if (Array.isArray(data)) setCamps(data);
    });
    apiService.getMissingPersons().then((data) => {
      if (Array.isArray(data)) setMissingPersons(data);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_incident', (newInc: Incident) => {
      setIncidents((prev) => [newInc, ...prev.filter(i => i.id !== newInc.id)]);
      setNotifications((prev) => [
        {
          id: `notif_${Date.now()}`,
          title: '🚨 CRITICAL EMERGENCY SOS',
          message: `${newInc.title} reported at ${newInc.location?.address || 'Location'}`,
          type: 'CRITICAL',
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
    });

    socket.on('incident_verified', (updatedInc: Incident) => {
      setIncidents((prev) => prev.map(i => i.id === updatedInc.id || i.incidentId === updatedInc.id ? { ...i, ...updatedInc } : i));
    });

    socket.on('incident_assigned', (payload: any) => {
      setIncidents((prev) => prev.map(i => i.id === payload.id || i.incidentId === payload.incidentId ? { ...i, status: 'Assigned', assignedTeam: payload.assignedTeam } : i));
    });

    socket.on('update_incident', (updatedInc: Incident) => {
      setIncidents((prev) => prev.map(i => i.id === updatedInc.id ? updatedInc : i));
    });

    socket.on('resource_location_updated', (updatedRes: ResourceUnit) => {
      setResources((prev) => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
    });

    socket.on('update_hospital', (updatedHosp: Hospital) => {
      setHospitals((prev) => prev.map(h => h.id === updatedHosp.id ? updatedHosp : h));
    });

    return () => {
      socket.off('new_incident');
      socket.off('incident_verified');
      socket.off('incident_assigned');
      socket.off('update_incident');
      socket.off('resource_location_updated');
      socket.off('update_hospital');
    };
  }, [socket]);

  const handleCreateIncident = async (reportData: any) => {
    const created = await apiService.createIncident(reportData);
    setIncidents((prev) => [created, ...prev]);
  };

  const handleUpdateIncidentStatus = async (id: string, status: string, responder?: any) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === id) {
          const updated = { ...inc, status: status as any };
          if (responder) {
            updated.assignedResponders = [
              ...inc.assignedResponders,
              { id: responder.id, name: responder.name, type: responder.type, assignedAt: new Date().toISOString() }
            ];
            updated.status = 'In Progress';
          }
          return updated;
        }
        return inc;
      })
    );
    await apiService.updateIncidentStatus(id, status, responder);
  };

  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenSOSModal={() => setSosModalOpen(true)}
        onOpenChat={() => setChatModalOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Only shown when authenticated and not on landing page) */}
        {isAuthenticated && !isLandingPage && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content View */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isAuthenticated && !isLandingPage ? 'lg:pl-72' : ''}`}>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage onOpenSOSModal={() => setSosModalOpen(true)} />} />
            
            {/* Dedicated Authentication Routes */}
            <Route path="/citizen/login" element={<CitizenLoginPage />} />
            <Route path="/citizen/register" element={<CitizenRegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/operator/login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/login" element={<AuthPage />} />

            {/* CITIZEN PROTECTED ROUTES */}
            <Route path="/citizen/dashboard" element={
              <CitizenProtectedRoute>
                <CitizenDashboard incidents={incidents} hospitals={hospitals} camps={camps} onOpenSOSModal={() => setSosModalOpen(true)} />
              </CitizenProtectedRoute>
            } />
            <Route path="/citizen/report" element={
              <CitizenProtectedRoute>
                <CitizenDashboard incidents={incidents} hospitals={hospitals} camps={camps} onOpenSOSModal={() => setSosModalOpen(true)} />
              </CitizenProtectedRoute>
            } />
            <Route path="/citizen/emergency" element={
              <CitizenProtectedRoute>
                <CitizenDashboard incidents={incidents} hospitals={hospitals} camps={camps} onOpenSOSModal={() => setSosModalOpen(true)} />
              </CitizenProtectedRoute>
            } />
            <Route path="/citizen/map" element={
              <CitizenProtectedRoute>
                <LiveCommandMap incidents={incidents} resources={resources} hospitals={hospitals} camps={camps} height="calc(100vh - 160px)" />
              </CitizenProtectedRoute>
            } />
            <Route path="/citizen/hospitals" element={
              <CitizenProtectedRoute>
                <HospitalDashboard hospitals={hospitals} />
              </CitizenProtectedRoute>
            } />
            <Route path="/citizen/evacuation" element={
              <CitizenProtectedRoute>
                <CitizenEvacuationPage />
              </CitizenProtectedRoute>
            } />

            {/* ADMIN PROTECTED ROUTES */}
            <Route path="/admin/dashboard" element={
              <OperatorProtectedRoute>
                <OperatorDashboard incidents={incidents} resources={resources} onUpdateStatus={handleUpdateIncidentStatus} />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/evacuation" element={
              <OperatorProtectedRoute>
                <OperatorEvacuationPage />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/emergencies" element={
              <OperatorProtectedRoute>
                <OperatorDashboard incidents={incidents} resources={resources} onUpdateStatus={handleUpdateIncidentStatus} />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/map" element={
              <OperatorProtectedRoute>
                <LiveCommandMap incidents={incidents} resources={resources} hospitals={hospitals} camps={camps} height="calc(100vh - 160px)" />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/rescue-teams" element={
              <OperatorProtectedRoute>
                <ResponderDashboard incidents={incidents} resources={resources} />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/hospitals" element={
              <OperatorProtectedRoute>
                <HospitalDashboard hospitals={hospitals} />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/resources" element={
              <OperatorProtectedRoute>
                <ResourceManagementDashboard incidents={incidents} />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/alerts" element={
              <OperatorProtectedRoute>
                <WeatherDisasterMonitoringPage />
              </OperatorProtectedRoute>
            } />
            <Route path="/admin/predictions" element={
              <OperatorProtectedRoute>
                <AdminDisasterPredictionsPage />
              </OperatorProtectedRoute>
            } />

            {/* Legacy & Shared Routes */}
            <Route path="/operator/predictions" element={<Navigate to="/admin/predictions" replace />} />
            <Route path="/predictions" element={<Navigate to="/admin/predictions" replace />} />
            <Route path="/operator/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/operator/evacuation" element={<Navigate to="/admin/evacuation" replace />} />
            <Route path="/operator/resources" element={
              <OperatorProtectedRoute>
                <ResourceManagementDashboard incidents={incidents} />
              </OperatorProtectedRoute>
            } />
            <Route path="/operator" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/evacuation" element={<CitizenEvacuationPage />} />
            <Route path="/resources" element={<ResourceManagementDashboard incidents={incidents} />} />
            <Route path="/weather" element={<WeatherDisasterMonitoringPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/missing-persons" element={<MissingPersonsPage />} />
            <Route path="/citizen/missing-persons" element={<MissingPersonsPage />} />
            <Route path="/admin/missing-persons" element={<MissingPersonsPage />} />
            <Route path="/map" element={<LiveCommandMap incidents={incidents} resources={resources} hospitals={hospitals} camps={camps} height="calc(100vh - 160px)" />} />
            <Route path="/hospital" element={<HospitalDashboard hospitals={hospitals} />} />
            <Route path="/responders" element={<ResponderDashboard incidents={incidents} resources={resources} />} />
            <Route path="/citizen/incidents/:id" element={<CitizenTrackingPage />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Modals */}
      <AIIncidentReportModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        onSubmitReport={handleCreateIncident}
      />

      <DroneScannerModal
        isOpen={droneModalOpen}
        onClose={() => setDroneModalOpen(false)}
      />

      <EmergencyChatModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
      />

      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
      />

      {/* Floating 24/7 AI Emergency Assistant & Safety Chatbot */}
      <AIEmergencyChatbot onOpenSOSModal={() => setSosModalOpen(true)} />
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ResQAI Crash caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4 font-sans">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-700 flex items-center justify-center text-red-500 shadow-xl">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Application Encountered An Error</h2>
          <p className="text-xs text-red-300 font-mono max-w-xl text-center bg-slate-900/90 p-4 rounded-xl border border-red-900/50 shadow-inner">
            {this.state.error?.message || 'Unexpected application error'}
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold shadow-lg transition-all"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 transition-all"
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <MainAppLayout />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
