/**
 * Notification Center API Endpoints
 *
 * Provides endpoints for:
 * - Fetching user notifications
 * - Marking notifications as read
 * - Getting unread count
 */

const { getSdk } = require('../api-util/sdk');
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} = require('../api-util/notifications');

/**
 * Get current user's notifications
 * GET /api/notifications
 *
 * Query params:
 * - limit: Number of notifications to return (default: 20)
 * - unreadOnly: Only return unread notifications (default: false)
 */
const list = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = currentUser.id.uuid;
    const { limit = 20, unreadOnly = false } = req.query;

    const notifications = await getNotifications(userId, {
      limit: parseInt(limit, 10),
      unreadOnly: unreadOnly === 'true',
    });

    res.json({
      notifications,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Mark a single notification as read
 * POST /api/notifications/:notificationId/read
 */
const markRead = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = currentUser.id.uuid;
    const { notificationId } = req.params;

    const notification = await markNotificationRead(userId, notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read
 * POST /api/notifications/read-all
 */
const markAllRead = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = currentUser.id.uuid;
    const count = await markAllNotificationsRead(userId);

    res.json({ success: true, markedRead: count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
const unreadCount = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = currentUser.id.uuid;
    const count = await getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

module.exports = {
  list,
  markRead,
  markAllRead,
  unreadCount,
};
