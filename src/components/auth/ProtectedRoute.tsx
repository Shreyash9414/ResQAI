import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-mono text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>AUTHENTICATING CRISISCONNECT SESSION...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4 font-mono">
        <div className="max-w-md w-full bg-[#0d1322] border-2 border-red-600 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950 text-red-500 border border-red-800 flex items-center justify-center mx-auto animate-bounce">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded bg-red-900 text-red-300 text-[10px] font-bold uppercase tracking-wider">
              SECURITY CHECK FAILURE
            </span>
            <h2 className="text-xl font-extrabold text-white">🚫 Access Denied</h2>
            <p className="text-slate-400 text-xs font-sans">
              Your logged-in role (<strong className="text-amber-400">{role}</strong>) does not have authorization to view this command console page.
            </p>
          </div>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center justify-center space-x-2 transition-all border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>[ RETURN TO AUTHORIZED CONSOLE ]</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
