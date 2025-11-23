import { useEffect, useCallback } from 'react';
import { getSocket } from '../socket';
import type { SocketEventName, SocketEventData } from '../types/socket';

export function useSocket<T extends SocketEventName>(
  event: T,
  callback: (data: SocketEventData<T>) => void
) {
  useEffect(() => {
    const socket = getSocket();
    // Type assertion needed for socket.io's type system
    const handler = callback as (...args: unknown[]) => void;
    socket.on(event as string, handler);
    return () => {
      socket.off(event as string, handler);
    };
  }, [event, callback]);
}

export function useSocketEmit() {
  return useCallback(<T extends SocketEventName>(
    event: T,
    data: SocketEventData<T>
  ) => {
    const socket = getSocket();
    socket.emit(event as string, data);
  }, []);
}

