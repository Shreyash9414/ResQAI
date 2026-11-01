import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertTriangle, ShieldAlert, Radio } from 'lucide-react';

export const OperatorLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginOperator } = useAuth();

  const [email, setEmail] = useState('operator@crisisconnect.com');
  const [password, setPassword] = useState('Operator@123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await loginOperator(email, password);
      navigate('/operator/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Emergency Operator authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoOperatorLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      setEmail('operator@crisisconnect.com');
      setPassword('Operator@123');
      await loginOperator('operator@crisisconnect.com', 'Operator@123');
      navigate('/operator/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo operator login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] flex flex-col items-center justify-center p-4 font-mono selection:bg-red-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        
        {/* Command Center Login Box */}
        <div className="bg-[#0c1222] border-2 border-red-600/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(220,38,38,0.2)] space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-800 p-0.5 mx-auto shadow-xl shadow-red-600/40 animate-pulse">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center">
                <ShieldAlert className="w-7 h-7 text-red-500" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              🚨 RESQAI
            </h1>
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
              EMERGENCY COMMAND CENTER
            </p>
          </div>

          {/* Error Feedback */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-700 text-red-300 text-xs flex items-center space-x-2 animate-bounce">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>❌ {errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center space-x-1">
                <span>👤 OPERATOR EMAIL</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@crisisconnect.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center space-x-1">
                <span>🔒 PASSWORD</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-red-600/40 flex items-center justify-center space-x-2 transition-all transform active:scale-95 border border-red-500/50"
            >
              <span>{isLoading ? 'AUTHENTICATING COMMAND SESSION...' : '🚨 OPERATOR LOGIN'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-red-500" />
            <span>🔐 Authorized Emergency Personnel Only</span>
          </div>

        </div>

        {/* Development Quick Demo Button */}
        <div className="bg-[#0c1222] border border-slate-800 rounded-3xl p-4 space-y-2 font-mono text-xs text-center">
          <div className="flex items-center justify-center space-x-2 text-amber-400 font-extrabold text-[11px]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>🧪 DEVELOPMENT QUICK OPERATOR LOGIN</span>
          </div>
          <button
            type="button"
            onClick={handleDemoOperatorLogin}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-red-400 font-extrabold border border-red-900/60 hover:border-red-500 transition-all text-xs flex items-center justify-center space-x-2"
          >
            <span>[ 🚨 LOGIN AS DEMO OPERATOR ]</span>
          </button>
        </div>

      </div>
    </div>
  );
};
