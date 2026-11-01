import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertTriangle, ArrowLeft, User } from 'lucide-react';

export const CitizenLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginCitizen } = useAuth();

  const [email, setEmail] = useState('citizenA@crisisconnect.com');
  const [password, setPassword] = useState('Citizen@123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await loginCitizen(email, password);
      navigate('/citizen/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Citizen authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100 selection:bg-blue-600 selection:text-white">
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
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 p-2 mx-auto flex items-center justify-center text-blue-400 shadow-md">
              <User className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Citizen Login
            </h1>
            <p className="text-xs text-slate-400">
              Access citizen emergency portal, report disasters & track rescue teams.
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
              <label className="block font-medium text-slate-300 mb-1.5">Email / Phone</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizenA@crisisconnect.com or phone"
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500 focus:outline-none"
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
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all border border-blue-400/30"
            >
              <span>{isLoading ? 'Signing in...' : 'Login'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Create Account Link */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">Need a citizen account?</p>
            <Link
              to="/citizen/register"
              className="inline-block py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-blue-400 font-bold border border-slate-800 transition-all text-xs"
            >
              Create Citizen Account
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};
