import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HeartHandshake, Award, CheckCircle, MapPin, ShieldCheck, Clock } from 'lucide-react';

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState(user?.rewardPoints || 140);
  const [skills, setSkills] = useState(['First Aid', 'Search & Rescue', 'Food Distribution']);
  const [acceptedMissions, setAcceptedMissions] = useState<string[]>([]);

  const availableMissions = [
    { id: 'vol_1', title: 'Food & Water Packet Distribution at Shelter #1', location: 'Jawaharlal Nehru Stadium', time: 'Immediate', pts: 50 },
    { id: 'vol_2', title: 'Medical First Aid Triage Support', location: 'Sector 9 Evacuation Hub', time: '14:00 - 18:00', pts: 80 },
    { id: 'vol_3', title: 'Blood Donation Support Drive', location: 'AIIMS Blood Bank', time: 'All Day', pts: 60 }
  ];

  const handleAccept = (id: string, pts: number) => {
    setAcceptedMissions([...acceptedMissions, id]);
    setPoints(prev => prev + pts);
  };

  return (
    <div className="space-y-6">
      
      {/* Volunteer Profile & Reward Gamification Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-950 border border-purple-800/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-900/60 text-purple-300 font-mono text-xs border border-purple-700">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>CERTIFIED NATIONAL RESCUE VOLUNTEER</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">{user?.name || 'Volunteer Comrade'}</h2>
          <p className="text-xs text-slate-300">Registered Skills: {skills.join(' • ')}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/40 text-center font-mono shrink-0">
          <span className="text-[10px] text-slate-400 block uppercase">REWARD CREDITS & POINTS</span>
          <span className="text-3xl font-extrabold text-amber-400 flex items-center justify-center space-x-1">
            <Award className="w-6 h-6 text-amber-400" />
            <span>{points} PTS</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">HERO LEVEL 3 BADGE</span>
        </div>
      </div>

      {/* Available Volunteer Missions */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-lg text-white">Active Local Relief Missions</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableMissions.map((m) => {
            const isAccepted = acceptedMissions.includes(m.id);
            return (
              <div key={m.id} className="p-5 rounded-2xl bg-surface-card border border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold font-mono">
                    +{m.pts} REWARD PTS
                  </span>
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{m.time}</span>
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white">{m.title}</h4>
                <p className="text-xs text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{m.location}</span>
                </p>

                <button
                  onClick={() => handleAccept(m.id, m.pts)}
                  disabled={isAccepted}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow transition-all ${
                    isAccepted
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isAccepted ? 'MISSION ACCEPTED ✓' : 'ACCEPT VOLUNTEER TASK'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
