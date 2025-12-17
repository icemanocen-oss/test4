import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communitiesAPI, usersAPI } from '../services/api';
import { Users, FileText, Tag, Lock, X } from 'lucide-react';
import toast from 'react-hot-toast';

const categories = ['study', 'sports', 'arts', 'technology', 'business', 'languages', 'music', 'gaming', 'other'];

export default function CreateCommunity() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allInterests, setAllInterests] = useState([]);
  const [formData, setFormData] = useState({
    name: '', description: '', category: 'technology', interests: [], maxMembers: 100, isPrivate: false
  });

  useEffect(() => {
    usersAPI.getInterests().then(res => setAllInterests(res.data.interests || [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest) : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await communitiesAPI.create(formData);
      toast.success('Community created!');
      navigate(`/communities/${res.data.community.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-6">Create Community</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Community Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange}
              className="input" placeholder="My Awesome Community" required maxLength={200} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange}
              className="input min-h-[120px]" placeholder="What is this community about?" required maxLength={2000} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} className="input">
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Members</label>
              <input type="number" name="maxMembers" value={formData.maxMembers} onChange={handleChange}
                className="input" min={2} max={1000} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Related Interests</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {allInterests.map(interest => (
                <button key={interest.id} type="button" onClick={() => toggleInterest(interest.name)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.interests.includes(interest.name)
                      ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                  {interest.name}
                </button>
              ))}
            </div>
            {formData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.interests.map(i => (
                  <span key={i} className="badge bg-primary-100 text-primary-700 flex items-center gap-1">
                    {i} <button type="button" onClick={() => toggleInterest(i)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" name="isPrivate" checked={formData.isPrivate} onChange={handleChange}
              className="w-5 h-5 rounded text-primary-600" />
            <div>
              <p className="font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> Private Community</p>
              <p className="text-sm text-gray-500">Only approved members can join and see content</p>
            </div>
          </label>

          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? <div className="spinner w-5 h-5 border-2" /> : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
