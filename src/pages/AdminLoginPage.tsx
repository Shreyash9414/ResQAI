import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertTriangle, ArrowLeft, Activity } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
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
      navigate('/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Admin authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100 selection:bg-red-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Home</span>
        </Link>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 p-2 mx-auto flex items-center justify-center text-red-400 shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Admin Login
            </h1>
            <p className="text-xs text-slate-400">
              Emergency Command Center & Dispatch Operations Portal.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@crisisconnect.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 transition-all border border-red-400/30"
            >
              <span>{isLoading ? 'Authenticating Admin...' : 'Login'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            <span>Authorized Administrator Clearance Only</span>
          </div>

        </div>

      </div>
    </div>
  );
};
