'use client'
import { createContext, useContext,  useMemo } from "react";

export const SocketContext = createContext<WebSocket | null>(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
}

export const SocketProvider = ({children, role}: {children: React.ReactNode, role: string}) => {
  const socket = useMemo(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/token=${ role === 'candidate' ? localStorage.getItem('token') : localStorage.getItem('admin-token') }`);

    return ws;
  },[role]);

  return (
    <SocketContext.Provider value={socket} >
      {children}
    </SocketContext.Provider>
  );
}