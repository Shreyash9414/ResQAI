import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home,
  LayoutDashboard, 
  MapPin, 
  ShieldAlert, 
  Hospital as HospIcon, 
  CloudSun,
  ShieldCheck,
  Users,
  AlertTriangle,
  Boxes,
  Navigation
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role } = useAuth();
  const isOperator = role === 'Emergency Operator' || role === 'EMERGENCY_OPERATOR' || role === 'Admin';

  const citizenNav = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Evacuation Routes', path: '/citizen/evacuation', icon: Navigation },
    { label: 'Live Map', path: '/map', icon: MapPin },
    { label: 'My Dashboard', path: '/citizen/dashboard', icon: LayoutDashboard },
    { label: 'Hospitals', path: '/hospital', icon: HospIcon },
    { label: 'Missing & Reunification', path: '/missing-persons', icon: Users },
    { label: 'Safety Protocols', path: '/safety', icon: ShieldCheck },
    { label: 'Disaster Weather', path: '/weather', icon: CloudSun },
  ];

  const operatorNav = [
    { label: 'Operator Dashboard', path: '/operator/dashboard', icon: LayoutDashboard },
    { label: 'Evacuation Dispatch', path: '/admin/evacuation', icon: Navigation },
    { label: 'Live Command Map', path: '/map', icon: MapPin },
    { label: 'Rescue Teams', path: '/responders', icon: ShieldAlert },
    { label: 'Resource Management', path: '/admin/resources', icon: Boxes },
    { label: 'AI Disaster Predictions', path: '/admin/predictions', icon: AlertTriangle },
    { label: 'Hospitals', path: '/hospital', icon: HospIcon },
    { label: 'Missing Persons', path: '/missing-persons', icon: Users },
    { label: 'Weather & Alerts', path: '/weather', icon: CloudSun },
  ];

  const navItems = isOperator ? operatorNav : citizenNav;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0f172a] border-r border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col pt-16 lg:pt-0`}
      >
        <div className="p-4 border-b border-slate-800 hidden lg:block">
          <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Active Role: <span className="text-white font-bold">{role || 'Citizen'}</span>
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center font-mono">
          ResQAI Emergency Response Network
        </div>
      </aside>
    </>
  );
};
