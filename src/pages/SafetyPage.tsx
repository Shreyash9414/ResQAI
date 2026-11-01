import React from 'react';
import { SafetyPrecautionsPanel } from '../components/safety/SafetyPrecautionsPanel';
import { EmergencyContactsSection } from '../components/safety/EmergencyContactsSection';
import { ShieldCheck } from 'lucide-react';

export const SafetyPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
        <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 text-purple-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Emergency Safety Protocols</h1>
          <p className="text-xs text-slate-400">Essential action guides before, during, and after disasters</p>
        </div>
      </div>

      <SafetyPrecautionsPanel />
      <EmergencyContactsSection />
    </div>
  );
};
