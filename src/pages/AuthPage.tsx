import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, AlertTriangle, KeyRound, Radio, ShieldCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCredentials, registerUser } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Citizen' as UserRole
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        const loggedUser = await loginWithCredentials(formData.email, formData.password);
        redirectToDashboard(loggedUser.role);
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const newUser = await registerUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role || 'Citizen'
        });
        redirectToDashboard(newUser.role);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToDashboard = (role: UserRole) => {
    if (role === 'Citizen') {
      navigate('/dashboard');
    } else if (role === 'Emergency Operator') {
      navigate('/operator');
    } else if (role === 'Admin' || role === 'Super Admin' || role === 'State Admin' || role === 'District Collector') {
      navigate('/operator');
    } else {
      navigate('/dashboard');
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      setFormData(prev => ({ ...prev, email: demoEmail, password: demoPass }));
      const user = await loginWithCredentials(demoEmail, demoPass);
      redirectToDashboard(user.role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 selection:bg-red-600 selection:text-white font-mono">
      
      <div className="w-full max-w-lg space-y-6">
        
        {/* Main Auth Card */}
        <div className="bg-[#0b101d] border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-800 p-0.5 mx-auto shadow-xl shadow-red-600/30 glow-red">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center">
                <Shield className="w-7 h-7 text-red-500 animate-pulse" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center space-x-2">
              <span>🚨 RESQAI</span>
            </h1>
            <p className="text-xs text-slate-400 font-sans font-semibold">
              Disaster Management & Emergency Response Platform
            </p>
          </div>

          {/* Error Feedback */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center space-x-2 animate-bounce">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>❌ {errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">FULL NAME</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Verma"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="citizenA@crisisconnect.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">PASSWORD</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">CONFIRM PASSWORD</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-red-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">ACCOUNT ROLE</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-red-500 focus:outline-none"
                  >
                    <option value="Citizen">Citizen</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Public accounts default to Citizen. Operator and Admin accounts require command authorization.
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <span>{isLoading ? 'AUTHENTICATING...' : isLogin ? '🔐 LOGIN TO PLATFORM' : '📝 CREATE ACCOUNT'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setErrorMessage(null); }}
              className="text-xs text-blue-400 hover:underline font-bold"
            >
              {isLogin ? "Don't have an account? Create Account" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>

        {/* 🧪 QUICK DEMO LOGIN PANEL (FOR MULTI-WINDOW DEMONSTRATION) */}
        <div className="bg-[#0b101d] border border-slate-800 rounded-3xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center space-x-2 text-amber-400 font-extrabold border-b border-slate-800 pb-2">
            <Radio className="w-4 h-4 animate-pulse text-amber-400" />
            <span>🧪 QUICK DEMO LOGIN (MULTI-TAB 100m TESTING)</span>
          </div>

          <p className="text-slate-400 text-[11px]">
            Click any demo profile button below to auto-fill credentials for multi-window geofence testing:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('citizenA@crisisconnect.com', 'Citizen@123')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-slate-200 hover:border-emerald-500 transition-all"
            >
              <span className="font-bold block text-emerald-400">👤 CITIZEN A (50m)</span>
              <span className="text-[10px] text-slate-400 block truncate">citizenA@crisisconnect.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('citizenB@crisisconnect.com', 'Citizen@123')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-slate-200 hover:border-emerald-500 transition-all"
            >
              <span className="font-bold block text-emerald-400">👤 CITIZEN B (80m)</span>
              <span className="text-[10px] text-slate-400 block truncate">citizenB@crisisconnect.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('citizenC@crisisconnect.com', 'Citizen@123')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-slate-200 hover:border-amber-500 transition-all"
            >
              <span className="font-bold block text-amber-400">👤 CITIZEN C (150m)</span>
              <span className="text-[10px] text-slate-400 block truncate">citizenC@crisisconnect.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('operator@crisisconnect.com', 'Operator@123')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-slate-200 hover:border-red-500 transition-all"
            >
              <span className="font-bold block text-red-400">🚨 OPERATOR</span>
              <span className="text-[10px] text-slate-400 block truncate">operator@crisisconnect.com</span>
            </button>
          </div>
        </div>

        <div className="text-center text-slate-500 text-[11px] flex items-center justify-center space-x-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>🔒 Secure JWT Emergency Platform • 256-bit Encrypted Session</span>
        </div>

      </div>
    </div>
  );
};
