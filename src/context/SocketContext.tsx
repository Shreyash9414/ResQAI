import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'LIVE' | 'OFFLINE' | 'RECONNECTING';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  emitLocationUpdate: (payload: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number; altitude?: number; incidentId?: string }) => void;
  emitRescueLocationUpdate: (payload: { vehicleId: string; latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number; status?: string; incidentId?: string; citizenId?: string }) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionStatus: 'OFFLINE',
  emitLocationUpdate: () => {},
  emitRescueLocationUpdate: () => {}
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('OFFLINE');

  useEffect(() => {
    const token = localStorage.getItem('crisisconnect_jwt') || localStorage.getItem('token') || '';
    const userRole = localStorage.getItem('user_role') || 'Citizen';

    const socketEndpoint = (
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      window.location.origin
    ).trim();

    const socketInstance = io(socketEndpoint, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      auth: { token },
      query: { role: userRole }
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to Socket.IO Server:', socketInstance.id);
      setIsConnected(true);
      setConnectionStatus('LIVE');
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.IO Server');
      setIsConnected(false);
      setConnectionStatus('OFFLINE');
    });

    socketInstance.io.on('reconnect_attempt', () => {
      setConnectionStatus('RECONNECTING');
    });

    socketInstance.io.on('reconnect', () => {
      setIsConnected(true);
      setConnectionStatus('LIVE');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const emitLocationUpdate = (payload: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number; altitude?: number; incidentId?: string }) => {
    if (socket && isConnected) {
      socket.emit('location:update', payload);
      socket.emit('citizen_location_update', payload);
    }
  };

  const emitRescueLocationUpdate = (payload: { vehicleId: string; latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number; status?: string; incidentId?: string; citizenId?: string }) => {
    if (socket && isConnected) {
      socket.emit('vehicle:location', payload);
      socket.emit('rescue-location-update', payload);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionStatus, emitLocationUpdate, emitRescueLocationUpdate }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
