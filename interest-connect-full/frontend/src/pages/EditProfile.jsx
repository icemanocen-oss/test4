import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usersAPI } from '../services/api';
import { User, MapPin, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditProfile() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allInterests, setAllInterests] = useState({ grouped: {} });
  const [formData, setFormData] = useState({
    name: '', bio: '', age: '', location: '', userType: 'student',
    interests: [], skills: [],
    privacySettings: { showEmail: false, showAge: true, showLocation: true }
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '', bio: user.bio || '', age: user.age || '',
        location: user.location || '', userType: user.userType || 'student',
        interests: user.interests || [], skills: user.skills || [],
        privacySettings: user.privacySettings || { showEmail: false, showAge: true, showLocation: true }
      });
    }
  }, [user]);

  useEffect(() => {
    usersAPI.getInterests().then(res => setAllInterests(res.data)).catch(() => {});
  }, []);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest) : [...prev.interests, interest]
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await usersAPI.updateProfile({ ...formData, age: formData.age ? parseInt(formData.age) : null });
      updateUser(res.data.user);
      toast.success('Profile updated!');
      navigate(`/profile/${user.id}`);
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} className="input" min="16" max="100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select name="userType" value={formData.userType} onChange={handleChange} className="input">
                <option value="student">Student</option>
                <option value="professional">Professional</option>
                <option value="hobbyist">Hobbyist</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} className="input min-h-[100px]" maxLength={500} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Interests</label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-3">
              {Object.entries(allInterests.grouped || {}).map(([category, interests]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">{category}</p>
                  <div className="flex flex-wrap gap-1">
                    {interests.map(interest => (
                      <button key={interest.id} type="button" onClick={() => toggleInterest(interest.name)}
                        className={`px-2 py-1 rounded text-xs ${formData.interests.includes(interest.name) ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>
                        {interest.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Skills</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input flex-1" placeholder="Add skill..." />
              <button type="button" onClick={addSkill} className="btn btn-secondary">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, i) => (
                <span key={i} className="badge bg-green-100 text-green-700 flex items-center gap-1">
                  {skill} <button type="button" onClick={() => setFormData(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? <div className="spinner w-5 h-5 border-2" /> : <><Save className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
