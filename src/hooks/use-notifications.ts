'use client';

/**
 * useNotifications Hook
 *
 * Fetches notification count and subscribes to SSE for real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface Notification {
  id: string;
  type: string;
  subject: string;
  content: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  // SSE subscription for real-time updates
  useEffect(() => {
    fetchNotifications();

    // Connect to SSE stream
    try {
      const es = new EventSource('/api/notifications/stream');
      eventSourceRef.current = es;

      es.addEventListener('notification', (event) => {
        try {
          const notification = JSON.parse(event.data);
          setNotifications((prev) => [notification, ...prev.slice(0, 19)]);
          setUnreadCount((prev) => prev + 1);
        } catch {
          // Ignore parse errors
        }
      });

      es.addEventListener('unread-count', (event) => {
        try {
          const data = JSON.parse(event.data);
          setUnreadCount(data.count);
        } catch {
          // Ignore parse errors
        }
      });

      es.onerror = () => {
        // Reconnect handled automatically by EventSource
      };
    } catch {
      // SSE not available — fall back to polling
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }

    return () => {
      eventSourceRef.current?.close();
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
