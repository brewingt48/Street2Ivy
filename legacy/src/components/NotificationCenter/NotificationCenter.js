import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';

import { NamedLink } from '../../components';
import { apiBaseUrl } from '../../util/api';

import css from './NotificationCenter.module.css';

/**
 * NotificationCenter component displays a bell icon with notification dropdown
 * Shows unread count badge and list of recent notifications
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class
 * @param {string} [props.rootClassName] - Root class override
 * @returns {JSX.Element} NotificationCenter component
 */
const NotificationCenter = props => {
  const { className, rootClassName } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();

    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const baseUrl = apiBaseUrl();
      const response = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const baseUrl = apiBaseUrl();
      const response = await fetch(`${baseUrl}/api/notifications?limit=10`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkRead = async (notificationId) => {
    try {
      const baseUrl = apiBaseUrl();
      await fetch(`${baseUrl}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include',
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const baseUrl = apiBaseUrl();
      await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application-received':
        return '📩';
      case 'application-accepted':
        return '🎉';
      case 'application-declined':
        return '📋';
      case 'project-completed':
        return '🏆';
      case 'invite-received':
        return '✉️';
      case 'new-message':
        return '💬';
      case 'new-application':
        return '📬';
      case 'assessment-received':
        return '⭐';
      default:
        return '🔔';
    }
  };

  const classes = classNames(rootClassName || css.root, className);

  return (
    <div className={classes} ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        className={css.bellButton}
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <span className={css.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={css.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={css.dropdown}>
          <div className={css.dropdownHeader}>
            <h3 className={css.dropdownTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className={css.markAllRead}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className={css.dropdownContent}>
            {isLoading ? (
              <div className={css.loading}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div className={css.empty}>
                <span className={css.emptyIcon}>🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              <ul className={css.notificationList}>
                {notifications.map(notification => (
                  <li
                    key={notification.id}
                    className={classNames(css.notificationItem, {
                      [css.unread]: !notification.read,
                    })}
                    onClick={() => !notification.read && handleMarkRead(notification.id)}
                  >
                    <span className={css.notificationIcon}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className={css.notificationContent}>
                      <p className={css.notificationSubject}>
                        {notification.subject}
                      </p>
                      <span className={css.notificationTime}>
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.read && (
                      <span className={css.unreadDot} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={css.dropdownFooter}>
            <NamedLink name="InboxPage" className={css.viewAllLink}>
              View all activity →
            </NamedLink>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
