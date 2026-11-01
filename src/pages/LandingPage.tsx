import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, Activity, AlertTriangle, ArrowRight, CheckCircle2, PhoneCall } from 'lucide-react';

interface LandingPageProps {
  onOpenSOSModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Minimal Header */}
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Res<span className="text-red-500">QAI</span>
              </span>
              <span className="ml-2 text-[11px] text-slate-400 font-medium hidden sm:inline-block border-l border-slate-700 pl-2">
                Emergency Response Platform
              </span>
            </div>
          </Link>

          <nav className="flex items-center space-x-6 text-xs font-semibold text-slate-300">
            <Link to="/safety" className="hover:text-white transition-colors">About</Link>
            <Link to="/safety" className="hover:text-white transition-colors">Safety</Link>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 max-w-5xl mx-auto w-full space-y-12">
        
        {/* Compact Hero Section */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-xs font-mono text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>EMERGENCY RESPONSE, CONNECTED IN REAL TIME</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Emergency Response, <br />
            <span className="text-red-500">Connected in Real Time</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Report emergencies, share your location, and coordinate rescue operations faster.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/citizen/login')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 border border-blue-400/30"
            >
              <User className="w-4 h-4" />
              <span>Login as Citizen</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => navigate('/admin/login')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all flex items-center justify-center space-x-2 border border-red-400/30"
            >
              <Shield className="w-4 h-4" />
              <span>Login as Admin</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </section>

        {/* Role Selection Cards */}
        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          {/* Citizen Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">CITIZEN PORTAL</span>
                  <h2 className="text-lg font-bold text-white">Citizen Portal</h2>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                Report an emergency, send your location, receive alerts, and track assigned rescue teams.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
                💡 Report emergencies, request rescue assistance, track your emergency, and view nearby alerts.
              </div>
            </div>

            <button
              onClick={() => navigate('/citizen/login')}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Login as Citizen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-red-500/50 transition-all flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 font-mono">ADMIN PORTAL</span>
                  <h2 className="text-lg font-bold text-white">Admin Portal</h2>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                Monitor incidents, manage rescue operations, track teams, and coordinate emergency response.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
                🛡️ Monitor emergencies, manage rescue teams, track incidents, and coordinate emergency response.
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/login')}
              className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Login as Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </section>

        {/* Feature Highlights Bar */}
        <section className="w-full max-w-4xl mx-auto p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs font-semibold text-slate-300">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Live Emergency Response</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Real-Time GPS Tracking</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Disaster Alerts</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
              <span>Rescue Coordination</span>
            </div>
          </div>
        </section>

      </main>

      {/* Footer / Emergency Helpline Contact Bar */}
      <footer id="contact" className="mt-auto border-t border-slate-800 bg-slate-900 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2 font-mono">
            <PhoneCall className="w-4 h-4 text-red-400" />
            <span>National Emergency Line: <strong className="text-white">112</strong> | NDRF: <strong className="text-white">1078</strong></span>
          </div>
          <div>
            ResQAI Emergency Response Network &copy; {new Date().getFullYear()}
          </div>
        </div>
      </footer>

    </div>
  );
};
