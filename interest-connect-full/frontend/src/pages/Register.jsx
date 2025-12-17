import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usersAPI } from '../services/api';
import { Users, Mail, Lock, User, MapPin, Eye, EyeOff, ArrowLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    userType: 'student',
    interests: [],
    location: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allInterests, setAllInterests] = useState({ grouped: {} });
  const { register } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await usersAPI.getInterests();
        setAllInterests(response.data);
      } catch (error) {
        console.error('Failed to fetch interests');
      }
    };
    fetchInterests();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (formData.interests.length < 3) {
        toast.error('Please select at least 3 interests');
        return;
      }
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined
      };
      await register(submitData);
      toast.success('Account created! Please check your email to verify.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl gradient-text">InterestConnect</span>
            </div>
            <p className="text-gray-500">Create your account</p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-16 h-1 rounded-full ${step >= s ? 'bg-primary-600' : 'bg-gray-200'}`} />
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4 fade-in">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input pl-10 pr-10"
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="input"
                      min="16"
                      max="100"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
                    <select
                      name="userType"
                      value={formData.userType}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="student">Student</option>
                      <option value="professional">Professional</option>
                      <option value="hobbyist">Hobbyist</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 fade-in">
                <h3 className="text-lg font-semibold">Select Your Interests</h3>
                <p className="text-sm text-gray-500">Choose at least 3 interests ({formData.interests.length} selected)</p>
                
                <div className="max-h-80 overflow-y-auto space-y-4">
                  {Object.entries(allInterests.grouped || {}).map(([category, interests]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-700 capitalize mb-2">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {interests.map(interest => (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleInterest(interest.name)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                              formData.interests.includes(interest.name)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {interest.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {formData.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {formData.interests.map(interest => (
                      <span key={interest} className="badge bg-primary-100 text-primary-700 flex items-center gap-1">
                        {interest}
                        <button type="button" onClick={() => toggleInterest(interest)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 fade-in">
                <h3 className="text-lg font-semibold">Almost Done!</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="Almaty, Kazakhstan"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Your Profile Summary</h4>
                  <p className="text-sm text-gray-600"><strong>Name:</strong> {formData.name}</p>
                  <p className="text-sm text-gray-600"><strong>Email:</strong> {formData.email}</p>
                  <p className="text-sm text-gray-600"><strong>Type:</strong> {formData.userType}</p>
                  <p className="text-sm text-gray-600"><strong>Interests:</strong> {formData.interests.join(', ')}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button type="button" onClick={() => setStep(step - 1)} className="btn btn-secondary flex-1">
                  Back
                </button>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-3">
                {loading ? <div className="spinner w-5 h-5 border-2" /> : step < 3 ? 'Continue' : 'Create Account'}
              </button>
            </div>
          </form>

          {step === 1 && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-gray-700">Sign up with Google</span>
              </button>
            </>
          )}

          <p className="text-center mt-6 text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Login
            </Link>
          </p>

          <Link to="/" className="flex items-center justify-center gap-2 mt-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
