import React from 'react';
import { ReliefCamp } from '../../types';
import { Tent, Users, Baby, Heart, Shield, Droplet, Utensils } from 'lucide-react';

interface ReliefCampDashboardProps {
  camps: ReliefCamp[];
}

export const ReliefCampDashboard: React.FC<ReliefCampDashboardProps> = ({ camps }) => {
  const camp = camps[0] || {
    name: 'Central Stadium Relief Shelter #1',
    capacity: 1000,
    currentOccupants: 480,
    demographics: { children: 110, women: 190, seniorCitizens: 80, men: 100 },
    supplies: { foodPacks: 2400, waterLiters: 8000, medicineKits: 450, blankets: 1200 },
    managerName: 'Commander Rajiv Menon',
    contactPhone: '+91 98111 22233'
  };

  return (
    <div className="space-y-6">
      
      {/* Relief Camp Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-950 border border-teal-800/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-900/60 text-teal-300 font-mono text-xs border border-teal-700">
            <Tent className="w-3.5 h-3.5" />
            <span>STATE RELIEF CAMP CENSUS & SHELTER HUB</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-1">{camp.name}</h2>
          <p className="text-xs text-slate-400 font-mono">Manager: {camp.managerName} • Phone: {camp.contactPhone}</p>
        </div>

        <div className="px-6 py-3 rounded-2xl bg-slate-900 border border-teal-500/40 text-center font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">CAMP OCCUPANCY</span>
          <span className="text-2xl font-extrabold text-teal-400">{camp.currentOccupants} / {camp.capacity} EVACUEES</span>
        </div>
      </div>

      {/* Demographic Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 flex items-center space-x-3">
          <Baby className="w-6 h-6 text-cyan-400" />
          <div>
            <span className="text-xs font-bold text-slate-400 block">CHILDREN</span>
            <span className="text-2xl font-extrabold text-white font-mono">{camp.demographics.children}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 flex items-center space-x-3">
          <Heart className="w-6 h-6 text-rose-400" />
          <div>
            <span className="text-xs font-bold text-slate-400 block">WOMEN</span>
            <span className="text-2xl font-extrabold text-white font-mono">{camp.demographics.women}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 flex items-center space-x-3">
          <Users className="w-6 h-6 text-amber-400" />
          <div>
            <span className="text-xs font-bold text-slate-400 block">SENIOR CITIZENS</span>
            <span className="text-2xl font-extrabold text-white font-mono">{camp.demographics.seniorCitizens}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-card border border-slate-700 flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-400" />
          <div>
            <span className="text-xs font-bold text-slate-400 block">ADULT MEN</span>
            <span className="text-2xl font-extrabold text-white font-mono">{camp.demographics.men}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
