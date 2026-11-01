import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, ShieldCheck, Users, Activity, FileText, Settings, Award, Landmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DISASTER_TRENDS = [
  { month: 'Jan', count: 12, avgRescueTime: 6.2 },
  { month: 'Feb', count: 18, avgRescueTime: 5.8 },
  { month: 'Mar', count: 25, avgRescueTime: 5.1 },
  { month: 'Apr', count: 42, avgRescueTime: 4.6 },
  { month: 'May', count: 68, avgRescueTime: 4.2 },
  { month: 'Jun', count: 95, avgRescueTime: 3.9 },
];

const DISASTER_TYPES_DATA = [
  { name: 'Flood', value: 45, color: '#3b82f6' },
  { name: 'Fire', value: 30, color: '#ef4444' },
  { name: 'Building Collapse', value: 15, color: '#f59e0b' },
  { name: 'Cyclone', value: 10, color: '#10b981' },
];

export const AnalyticsAdminDashboard: React.FC = () => {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      
      {/* Admin Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-950 border border-blue-800/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 font-mono text-xs border border-blue-700">
            <Landmark className="w-3.5 h-3.5" />
            <span>STATE DISASTER MANAGEMENT AUTHORITY (SDMA) COMMAND</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-1">National Disaster Analytics & Governance</h2>
          <p className="text-xs text-slate-400 font-mono">Logged in as: <span className="text-blue-400 font-bold">{role}</span></p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2.5 rounded-xl bg-surface-card hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs">
            EXPORT AUDIT REPORT
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow">
            MANAGE PERMISSIONS
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1 font-mono">
          <span className="text-xs text-slate-400 font-bold uppercase">TOTAL INCIDENTS RESOLVED</span>
          <p className="text-3xl font-extrabold text-emerald-400">1,248</p>
          <span className="text-[10px] text-slate-500">99.2% Success Rate</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1 font-mono">
          <span className="text-xs text-slate-400 font-bold uppercase">AVG RESCUE ARRIVAL TIME</span>
          <p className="text-3xl font-extrabold text-blue-400">4.2 MINS</p>
          <span className="text-[10px] text-slate-500">Target: &lt; 5.0 Mins</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1 font-mono">
          <span className="text-xs text-slate-400 font-bold uppercase">HOSPITAL CAPACITY LOAD</span>
          <p className="text-3xl font-extrabold text-amber-400">64%</p>
          <span className="text-[10px] text-slate-500">Stable ICU Reserves</span>
        </div>

        <div className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-1 font-mono">
          <span className="text-xs text-slate-400 font-bold uppercase">REGISTERED VOLUNTEERS</span>
          <p className="text-3xl font-extrabold text-indigo-400">8,950</p>
          <span className="text-[10px] text-slate-500">12 District Squads</span>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Incident Volume & Rescue Time */}
        <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-4">
          <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Disaster Response Trends & Rescue Times</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DISASTER_TRENDS}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disaster Breakdown Pie Chart */}
        <div className="p-6 rounded-3xl bg-surface-card border border-slate-700 space-y-4">
          <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Disaster Category Share (%)</span>
          </h3>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={DISASTER_TYPES_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {DISASTER_TYPES_DATA.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
