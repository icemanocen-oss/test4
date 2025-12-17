import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, checkAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Google authentication failed');
        navigate('/login');
        return;
      }

      if (token) {
        localStorage.setItem('token', token);
        setToken(token);
        await checkAuth();
        toast.success('Successfully signed in with Google!');
        navigate('/dashboard');
      } else {
        toast.error('Authentication failed');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setToken, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="text-center text-white">
        <div className="spinner mx-auto mb-4 border-white border-t-transparent"></div>
        <p className="text-xl">Signing you in...</p>
      </div>
    </div>
  );
}
