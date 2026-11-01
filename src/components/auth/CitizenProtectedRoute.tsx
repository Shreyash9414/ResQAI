import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface CitizenProtectedRouteProps {
  children: React.ReactNode;
}

export const CitizenProtectedRoute: React.FC<CitizenProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center font-mono text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>VERIFYING CITIZEN EMERGENCY PORTAL SESSION...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/citizen/login" replace />;
  }

  return <>{children}</>;
};
