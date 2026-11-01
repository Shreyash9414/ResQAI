import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  setRole: (role: UserRole) => void;
  login: (userData: User, token?: string) => void;
  loginWithCredentials: (email: string, password?: string) => Promise<User>;
  loginOperator: (email: string, password?: string) => Promise<User>;
  loginCitizen: (email: string, password?: string) => Promise<User>;
  registerCitizen: (userData: { name: string; email: string; password?: string; phone?: string }) => Promise<User>;
  registerUser: (userData: { name: string; email: string; password?: string; role?: UserRole }) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const DEFAULT_USER: User = {
  id: 'usr_operator',
  name: 'Commander Alex Vance',
  email: 'operator@crisisconnect.com',
  phone: '+1 (555) 999-0011',
  role: 'Emergency Operator',
  approved: true,
  skills: ['Triage', 'Dispatch', 'Command'],
  rewardPoints: 500,
  status: 'Active',
  location: { lat: 28.6145, lng: 77.2095, address: 'Command Triage Desk #1' }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_USER);
  const [role, setRoleState] = useState<UserRole>('Emergency Operator');
  const [token, setToken] = useState<string | null>(localStorage.getItem('crisisconnect_jwt'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate stored JWT token on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('crisisconnect_jwt');
      const storedUser = localStorage.getItem('crisisconnect_user');

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setRoleState(parsedUser.role);
        } catch (e) {}
      }

      if (storedToken) {
        setToken(storedToken);
        const me = await apiService.getCurrentUser(storedToken);
        if (me) {
          setUser(me);
          setRoleState(me.role);
          localStorage.setItem('crisisconnect_user', JSON.stringify(me));
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStorage.setItem('crisisconnect_user', JSON.stringify(updated));
    }
  };

  const login = (userData: User, authToken?: string) => {
    setUser(userData);
    setRoleState(userData.role);
    localStorage.setItem('crisisconnect_user', JSON.stringify(userData));
    if (authToken) {
      setToken(authToken);
      localStorage.setItem('crisisconnect_jwt', authToken);
    }
  };

  const loginOperator = async (email: string, password?: string): Promise<User> => {
    const res = await apiService.operatorLogin({ email, password: password || 'Operator@123' });
    if (res && res.user) {
      login(res.user, res.token);
      return res.user;
    }
    throw new Error('Operator authentication failed');
  };

  const loginCitizen = async (email: string, password?: string): Promise<User> => {
    const res = await apiService.citizenLogin({ email, password: password || 'Citizen@123' });
    if (res && res.user) {
      login(res.user, res.token);
      return res.user;
    }
    throw new Error('Citizen authentication failed');
  };

  const registerCitizen = async (userData: { name: string; email: string; password?: string; phone?: string }): Promise<User> => {
    const res = await apiService.citizenRegister(userData);
    if (res && res.user) {
      login(res.user, res.token);
      return res.user;
    }
    throw new Error('Citizen registration failed');
  };

  const loginWithCredentials = async (email: string, password?: string): Promise<User> => {
    const res = await apiService.login({ email, password: password || 'Citizen@123' });
    if (res && res.user) {
      login(res.user, res.token);
      return res.user;
    }
    throw new Error('Authentication failed');
  };

  const registerUser = async (userData: { name: string; email: string; password?: string; role?: UserRole }): Promise<User> => {
    const res = await apiService.register(userData);
    if (res && res.user) {
      login(res.user, res.token);
      return res.user;
    }
    throw new Error('Registration failed');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('crisisconnect_jwt');
    localStorage.removeItem('crisisconnect_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        setRole,
        login,
        loginWithCredentials,
        loginOperator,
        loginCitizen,
        registerCitizen,
        registerUser,
        logout,
        isAuthenticated: !!user,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
