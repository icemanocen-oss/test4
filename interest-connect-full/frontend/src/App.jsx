import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import socketService from './services/socket';
import useChatStore from './stores/chatStore';
import useNotificationStore from './stores/notificationStore';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Communities from './pages/Communities';
import CommunityDetails from './pages/CommunityDetails';
import CreateCommunity from './pages/CreateCommunity';
import Events from './pages/Events';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Search from './pages/Search';
import Layout from './components/Layout';
import Loading from './components/Loading';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const { checkAuth, isAuthenticated, token } = useAuthStore();
  const { addOnlineUser, removeOnlineUser, setOnlineUsers, addMessage } = useChatStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      const socket = socketService.connect(token);

      socket.on('online_users', (users) => setOnlineUsers(users));
      socket.on('user_online', ({ userId }) => addOnlineUser(userId));
      socket.on('user_offline', ({ userId }) => removeOnlineUser(userId));
      socket.on('new_message', (message) => addMessage(message));
      socket.on('new_notification', (notification) => addNotification(notification));

      return () => {
        socket.off('online_users');
        socket.off('user_online');
        socket.off('user_offline');
        socket.off('new_message');
        socket.off('new_notification');
      };
    }
  }, [isAuthenticated, token]);

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/profile/:id" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      <Route path="/profile/edit" element={<ProtectedRoute><Layout><EditProfile /></Layout></ProtectedRoute>} />
      <Route path="/communities" element={<ProtectedRoute><Layout><Communities /></Layout></ProtectedRoute>} />
      <Route path="/communities/create" element={<ProtectedRoute><Layout><CreateCommunity /></Layout></ProtectedRoute>} />
      <Route path="/communities/:id" element={<ProtectedRoute><Layout><CommunityDetails /></Layout></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><Layout><Events /></Layout></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><Layout><Friends /></Layout></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
      <Route path="/chat/:id" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Layout><Search /></Layout></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
