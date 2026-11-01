import React from 'react';
import { PhoneCall, ShieldAlert, Flame, Ambulance, Landmark } from 'lucide-react';

interface ContactItem {
  name: string;
  number: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const EMERGENCY_CONTACTS: ContactItem[] = [
  {
    name: 'Police',
    number: '112',
    icon: <ShieldAlert className="w-5 h-5 text-blue-400" />,
    color: 'bg-blue-950/60 border-blue-500/40 text-blue-300',
    description: 'National Emergency & Police Control Desk'
  },
  {
    name: 'Fire & Rescue',
    number: '101',
    icon: <Flame className="w-5 h-5 text-orange-400" />,
    color: 'bg-orange-950/60 border-orange-500/40 text-orange-300',
    description: 'Fire Station & Structural Emergency Squad'
  },
  {
    name: 'Ambulance',
    number: '108',
    icon: <Ambulance className="w-5 h-5 text-red-400" />,
    color: 'bg-red-950/60 border-red-500/40 text-red-300',
    description: 'Medical Trauma & Patient Transport Unit'
  },
  {
    name: 'Disaster Management',
    number: '1078',
    icon: <Landmark className="w-5 h-5 text-amber-400" />,
    color: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
    description: 'NDRF State Disaster Operations Center'
  }
];

export const EmergencyContactsSection: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Section Header */}
      <div className="flex items-center space-x-3 text-red-400">
        <div className="p-2.5 bg-red-950/80 rounded-xl border border-red-500/40">
          <PhoneCall className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">🚨 Official Emergency Contacts</h2>
          <p className="text-xs text-slate-400">Toll-free direct emergency response dispatch hotlines</p>
        </div>
      </div>

      {/* Grid of Contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {EMERGENCY_CONTACTS.map((item, idx) => (
          <div
            key={idx}
            className={`border rounded-xl p-3.5 flex flex-col justify-between space-y-3 ${item.color} backdrop-blur-sm shadow-md hover:border-slate-500 transition-all`}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-700 shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{item.name}</h3>
                <p className="text-[11px] text-slate-300/80 leading-tight mt-0.5">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="font-mono font-extrabold text-base text-white tracking-wider">
                {item.number}
              </span>
              <a
                href={`tel:${item.number}`}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center space-x-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
