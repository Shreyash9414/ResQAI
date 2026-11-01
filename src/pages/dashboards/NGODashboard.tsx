import React, { useState } from 'react';
import { Building2, Package, Truck, Heart, Plus, Save } from 'lucide-react';

export const NGODashboard: React.FC = () => {
  const [supplies, setSupplies] = useState({
    foodPacks: 4500,
    waterLiters: 12000,
    medicineKits: 850,
    blankets: 2300
  });

  return (
    <div className="space-y-6">
      
      {/* NGO Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-950 border border-cyan-800/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-900/60 text-cyan-300 font-mono text-xs border border-cyan-700">
            <Building2 className="w-3.5 h-3.5" />
            <span>NGO DISASTER RELIEF ALLIANCE HUB</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-1">Red Cross & OXFAM Joint Logistics Center</h2>
          <p className="text-xs text-slate-400 font-mono">Central Warehouse Base 04 • Sector 18</p>
        </div>

        <button className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-600/30 flex items-center space-x-2">
          <Truck className="w-4 h-4" />
          <span>DISPATCH RELIEF CONVOY</span>
        </button>
      </div>

      {/* NGO Inventory Stock Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">FOOD PACKETS</span>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">{supplies.foodPacks}</p>
          <span className="text-[10px] text-slate-500">Ready for Evacuees</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">WATER LITERS</span>
          <p className="text-3xl font-extrabold text-blue-400 font-mono">{supplies.waterLiters}L</p>
          <span className="text-[10px] text-slate-500">Clean Drinking Water</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">MEDICINE KITS</span>
          <p className="text-3xl font-extrabold text-rose-400 font-mono">{supplies.medicineKits}</p>
          <span className="text-[10px] text-slate-500">First Aid & Antibiotics</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">THERMAL BLANKETS</span>
          <p className="text-3xl font-extrabold text-amber-400 font-mono">{supplies.blankets}</p>
          <span className="text-[10px] text-slate-500">Winter & Flood Relief</span>
        </div>
      </div>

    </div>
  );
};
