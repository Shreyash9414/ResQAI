import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Shield, Bell, MessageSquare, AlertTriangle, Menu, X, LogOut, MapPin, Hospital as HospIcon, ShieldCheck, LayoutDashboard, CloudSun, User, Activity, AlertCircle, Boxes, Navigation } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenSOSModal?: () => void;
  onOpenChat?: () => void;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSOSModal,
  onOpenChat,
  onOpenNotifications
}) => {
  const { role, user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, connectionStatus } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === '/';
  const isAdmin = role === 'Emergency Operator' || role === 'EMERGENCY_OPERATOR' || role === 'Admin' || role === 'admin' || role === 'operator' || role === 'Super Admin';

  const citizenNav = [
    { label: 'Dashboard', path: '/citizen/dashboard', icon: LayoutDashboard },
    { label: 'Evacuation', path: '/citizen/evacuation', icon: Navigation },
    { label: 'Live Map', path: '/citizen/map', icon: MapPin },
    { label: 'Report', path: '/citizen/report', icon: AlertCircle },
    { label: 'My Emergency', path: '/citizen/emergency', icon: AlertTriangle },
    { label: 'Hospitals', path: '/citizen/hospitals', icon: HospIcon },
    { label: 'Alerts', path: '/weather', icon: CloudSun },
    { label: 'Safety', path: '/safety', icon: ShieldCheck },
  ];

  const adminNav = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Evacuation', path: '/admin/evacuation', icon: Navigation },
    { label: 'Emergencies', path: '/admin/emergencies', icon: AlertTriangle },
    { label: 'Live Map', path: '/admin/map', icon: MapPin },
    { label: 'Rescue Teams', path: '/admin/rescue-teams', icon: Shield },
    { label: 'Resources', path: '/admin/resources', icon: Boxes },
    { label: 'AI Predictions', path: '/admin/predictions', icon: AlertTriangle },
    { label: 'Hospitals', path: '/admin/hospitals', icon: HospIcon },
    { label: 'Alerts', path: '/admin/alerts', icon: CloudSun },
  ];

  const landingNav = [
    { label: 'About', path: '/safety' },
    { label: 'Safety', path: '/safety' },
    { label: 'Contact', path: '/#contact' }
  ];

  const currentNav = isAuthenticated ? (isAdmin ? adminNav : citizenNav) : landingNav;

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>LIVE</span>
          </span>
        );
      case 'RECONNECTING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-950 border border-amber-500/40 text-amber-400 text-[11px] font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>RECONNECTING</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-[11px] font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white">
                  Res<span className="text-red-500">QAI</span>
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {isAuthenticated ? (isAdmin ? 'Admin Console' : 'Citizen Portal') : 'Emergency Platform'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {!isAuthenticated || isLandingPage ? (
                landingNav.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))
              ) : (
                currentNav.map((item: any) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                        isActive
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      {item.icon && <item.icon className="w-3.5 h-3.5" />}
                      <span>{item.label}</span>
                    </Link>
                  );
                })
              )}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            
            {/* Connection Status */}
            {isAuthenticated && (
              <div className="hidden md:block">
                {getStatusBadge()}
              </div>
            )}

            {/* SOS Emergency Trigger Button */}
            {onOpenSOSModal && isAuthenticated && (
              <button
                onClick={onOpenSOSModal}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md border border-red-500 transition-all flex items-center space-x-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">🚨 SOS</span>
              </button>
            )}

            {/* Chat Icon */}
            {onOpenChat && isAuthenticated && (
              <button
                onClick={onOpenChat}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                title="Emergency Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            {/* Notifications Icon */}
            {onOpenNotifications && isAuthenticated && (
              <button
                onClick={onOpenNotifications}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}

            {/* Unauthenticated Login Buttons on Landing Page Header */}
            {!isAuthenticated && (
              <div className="flex items-center space-x-2">
                <Link
                  to="/citizen/login"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
                >
                  Citizen Login
                </Link>
                <Link
                  to="/admin/login"
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
                >
                  Admin Login
                </Link>
              </div>
            )}

            {/* Authenticated User Badge & Logout */}
            {isAuthenticated && (
              <div className="hidden sm:flex items-center space-x-2.5 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="text-left text-xs">
                  <p className="font-semibold text-slate-200 truncate max-w-[100px]">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{role || 'Citizen'}</p>
                </div>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          {!isAuthenticated || isLandingPage ? (
            landingNav.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))
          ) : (
            currentNav.map((item: any) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-semibold ${
                  location.pathname === item.path ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {item.icon && <item.icon className="w-4 h-4 text-slate-400" />}
                <span>{item.label}</span>
              </Link>
            ))
          )}

          {isAuthenticated && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{user?.name} ({role})</span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate('/');
                }}
                className="text-red-400 hover:underline font-semibold"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
