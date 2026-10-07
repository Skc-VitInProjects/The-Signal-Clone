'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

type WsEventHandler = (data: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  sendEvent: (event: any) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  markRead: (conversationId: string) => void;
  subscribe: (eventType: string, handler: WsEventHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<WsEventHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    let reconnectAttempts = 0;

    function connect() {
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const wsUrl = api.getWsUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) {
          ws.close();
          return;
        }
        reconnectAttempts = 0;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          if (type) {
            const handlers = subscribersRef.current.get(type);
            if (handlers) {
              handlers.forEach((h) => h(data));
            }
            // Also notify wildcard subscribers
            const allHandlers = subscribersRef.current.get('*');
            if (allHandlers) {
              allHandlers.forEach((h) => h(data));
            }
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      ws.onclose = (event) => {
        if (!isMounted) return;
        if (socketRef.current === ws) {
          socketRef.current = null;
          setIsConnected(false);
        }

        // 4001 = authentication rejected by the server; retrying with the
        // same token is pointless.
        if (event.code === 4001) return;

        // Exponential backoff: 1s, 2s, 4s ... capped at 30s
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        reconnectAttempts += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted && token) {
            connect();
          }
        }, delay);
      };

      socketRef.current = ws;
    }

    connect();

    // Heartbeat ping every 25 seconds to keep connection active
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token, user]);

  const sendEvent = (event: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  const sendTyping = (conversationId: string, isTyping: boolean) => {
    sendEvent({
      type: 'typing',
      conversation_id: conversationId,
      is_typing: isTyping,
    });
  };

  const markRead = (conversationId: string) => {
    sendEvent({
      type: 'mark_read',
      conversation_id: conversationId,
    });
  };

  const subscribe = (eventType: string, handler: WsEventHandler) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }
    subscribersRef.current.get(eventType)!.add(handler);

    return () => {
      const set = subscribersRef.current.get(eventType);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          subscribersRef.current.delete(eventType);
        }
      }
    };
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendEvent,
        sendTyping,
        markRead,
        subscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
