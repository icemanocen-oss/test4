import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import useNotificationStore from '../stores/notificationStore';
import { 
  Home, User, Search, Users, Calendar, MessageCircle, 
  Bell, LogOut, Menu, X, Plus, Settings
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/search', icon: Search, label: 'Find Partners' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/communities', icon: Users, label: 'Communities' },
  { path: '/events', icon: Calendar, label: 'Events' },
  { path: '/chat', icon: MessageCircle, label: 'Messages' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount: messageCount } = useChatStore();
  const { unreadCount: notifCount } = useNotificationStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text">InterestConnect</span>
            </Link>
          </div>

          <div className="p-4 border-b border-gray-100">
            <Link 
              to={`/profile/${user?.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img 
                src={user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                alt={user?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              const showBadge = 
                (item.path === '/chat' && messageCount > 0) ||
                (item.path === '/notifications' && notifCount > 0);
              const badgeCount = item.path === '/chat' ? messageCount : notifCount;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100 space-y-1">
            <Link
              to="/profile/edit"
              onClick={() => setSidebarOpen(false)}
              className="sidebar-link"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/dashboard" className="font-bold text-lg gradient-text">
              InterestConnect
            </Link>
            <Link 
              to={`/profile/${user?.id}`}
              className="w-8 h-8 rounded-full overflow-hidden"
            >
              <img 
                src={user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
