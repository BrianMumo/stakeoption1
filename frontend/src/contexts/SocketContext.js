'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '@/lib/constants';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    const newSocket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  // Reconnect with new token after login
  const reconnectWithToken = useCallback((token) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const newSocket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    socketRef.current = newSocket;
    setSocket(newSocket);
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, reconnectWithToken }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

export default SocketContext;
