import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { User, ShieldAlert, Hospital, Flame, Shield, Ambulance, HeartHandshake, Building2, Landmark, Award, ShieldCheck } from 'lucide-react';

const ROLES: { role: UserRole; label: string; icon: React.FC<{ className?: string }> }[] = [
  { role: 'Citizen', label: 'Citizen', icon: User },
  { role: 'Emergency Operator', label: 'Operator', icon: ShieldAlert },
  { role: 'Hospital', label: 'Hospital', icon: Hospital },
  { role: 'Police', label: 'Police', icon: Shield },
  { role: 'Fire Brigade', label: 'Fire Brigade', icon: Flame },
  { role: 'Ambulance Team', label: 'Ambulance', icon: Ambulance },
  { role: 'Volunteer', label: 'Volunteer', icon: HeartHandshake },
  { role: 'NGO', label: 'NGO Relief', icon: Building2 },
  { role: 'District Collector', label: 'Collector', icon: Landmark },
  { role: 'State Admin', label: 'State Admin', icon: Award },
  { role: 'Super Admin', label: 'Super Admin', icon: ShieldCheck },
];

export const RoleSelector: React.FC = () => {
  const { role: currentRole, setRole } = useAuth();

  return (
    <div className="bg-[#0e1626] border-b border-surface-border py-2 px-4 flex items-center justify-between overflow-x-auto gap-2">
      <div className="flex items-center space-x-2 text-xs text-slate-400 shrink-0 pr-2 border-r border-slate-700">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="font-semibold uppercase tracking-wider text-[10px]">DEMO ROLE SWITCHER:</span>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 scrollbar-none">
        {ROLES.map(({ role, label, icon: Icon }) => {
          const isActive = currentRole === role;
          return (
            <button
              key={role}
              onClick={() => setRole(role)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
                  : 'bg-surface-card/60 text-slate-300 hover:bg-surface-card hover:text-white border border-slate-700/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
