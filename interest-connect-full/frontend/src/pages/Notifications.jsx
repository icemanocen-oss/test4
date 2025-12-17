import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import useNotificationStore from '../stores/notificationStore';
import { Bell, Check, Trash2, CheckCheck, MessageCircle, Users, Calendar, Heart, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const typeIcons = {
  new_message: MessageCircle,
  friend_request: UserPlus,
  friend_accepted: Users,
  group_join: Users,
  event_join: Calendar,
  post_like: Heart,
  post_comment: MessageCircle,
};

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const { notifications, setNotifications, markAsRead, markAllAsRead, removeNotification, clearAll, setUnreadCount } = useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsAPI.getAll(),
        notificationsAPI.getUnreadCount()
      ]);
      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(countRes.data.count || 0);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      markAsRead(id);
    } catch (error) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      markAllAsRead();
      toast.success('All marked as read');
    } catch (error) {}
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      removeNotification(id);
    } catch (error) {}
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all notifications?')) return;
    try {
      await notificationsAPI.clearAll();
      clearAll();
      toast.success('All notifications cleared');
    } catch (error) {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-secondary text-sm">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="btn btn-secondary text-sm">
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner"></div></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => {
            const Icon = typeIcons[notification.type] || Bell;
            return (
              <div key={notification.id}
                className={`card p-4 flex items-start gap-4 ${!notification.isRead ? 'bg-primary-50 border-primary-200' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  !notification.isRead ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${!notification.isRead ? 'text-primary-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button onClick={() => handleMarkRead(notification.id)}
                          className="p-1 hover:bg-gray-200 rounded" title="Mark as read">
                          <Check className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(notification.id)}
                        className="p-1 hover:bg-red-100 rounded" title="Delete">
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                  {notification.link && (
                    <Link to={notification.link}
                      onClick={() => handleMarkRead(notification.id)}
                      className="text-sm text-primary-600 hover:underline mt-2 inline-block">
                      View details →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
