import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User as UserIcon, Phone, KeyRound, ArrowRight, AlertTriangle } from 'lucide-react';

export const CitizenRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerCitizen } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await registerCitizen({ name, email, password, phone });
      navigate('/citizen/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Citizen registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 font-mono selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        
        {/* Citizen Register Box */}
        <div className="bg-[#0b101d] border-2 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 p-0.5 mx-auto shadow-xl shadow-blue-600/30">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center">
                <UserIcon className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              🛡️ RESQAI
            </h1>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
              CREATE CITIZEN ACCOUNT
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
              <label className="block text-[11px] font-bold text-slate-300 mb-1">FULL NAME</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@crisisconnect.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">PHONE NUMBER</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">CONFIRM PASSWORD</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95 border border-blue-400/50"
            >
              <span>{isLoading ? 'CREATING ACCOUNT...' : '📝 REGISTER CITIZEN ACCOUNT'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer link */}
          <div className="text-center pt-3 border-t border-slate-800">
            <Link
              to="/citizen/login"
              className="text-xs text-blue-400 hover:underline font-bold"
            >
              Already registered? Back to Citizen Login
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};
