import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(response.data.message);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Verification failed');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="card p-8 text-center max-w-md">
        {status === 'loading' && (
          <>
            <Loader className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-green-600">Email Verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/dashboard" className="btn btn-primary w-full">
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-red-600">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/login" className="btn btn-primary w-full">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
