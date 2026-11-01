import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface OperatorProtectedRouteProps {
  children: React.ReactNode;
}

export const OperatorProtectedRoute: React.FC<OperatorProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [denied, setDenied] = useState(false);

  const isOperatorRole =
    role === 'Emergency Operator' ||
    role === 'EMERGENCY_OPERATOR' ||
    role === 'Admin' ||
    role === 'admin' ||
    role === 'operator' ||
    role === 'Super Admin' ||
    role === 'State Admin' ||
    role === 'District Collector';

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !isOperatorRole) {
      setDenied(true);
      const timer = setTimeout(() => {
        navigate('/citizen/dashboard', { replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, user, isOperatorRole, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying Admin Authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (denied || !isOperatorRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border-2 border-red-600/80 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950/80 text-red-500 border border-red-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-red-500" />
          </div>

          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              AUTHORIZATION ERROR
            </span>
            <h2 className="text-xl font-extrabold text-white">Access Denied</h2>
            <p className="text-slate-300 text-xs">
              Administrator authorization required. Ordinary citizens cannot access command operations. Redirecting to Citizen Dashboard...
            </p>
          </div>

          <button
            onClick={() => navigate('/citizen/dashboard', { replace: true })}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Citizen Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
