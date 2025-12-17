import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usersAPI, friendsAPI } from '../services/api';
import useChatStore from '../stores/chatStore';
import { MapPin, Calendar, Edit, MessageCircle, UserPlus, UserMinus, Check, X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuthStore();
  const { isUserOnline } = useChatStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState('none');
  const [actionLoading, setActionLoading] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, statusRes] = await Promise.all([
          usersAPI.getProfile(id),
          !isOwnProfile ? friendsAPI.getStatus(id) : Promise.resolve({ data: { status: 'self' } })
        ]);
        setProfile(profileRes.data);
        setFriendStatus(statusRes.data.status);
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [id, isOwnProfile]);

  const handleFriendAction = async (action) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'send':
          await friendsAPI.sendRequest(id);
          setFriendStatus('pending_sent');
          toast.success('Friend request sent!');
          break;
        case 'accept':
          await friendsAPI.acceptRequest(id);
          setFriendStatus('accepted');
          toast.success('Friend request accepted!');
          break;
        case 'decline':
          await friendsAPI.declineRequest(id);
          setFriendStatus('none');
          toast.success('Friend request declined');
          break;
        case 'remove':
          await friendsAPI.removeFriend(id);
          setFriendStatus('none');
          toast.success('Friend removed');
          break;
      }
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="spinner"></div></div>;
  }

  if (!profile) {
    return <div className="text-center py-12"><p className="text-gray-500">User not found</p></div>;
  }

  const isOnline = isUserOnline(profile.id) || profile.isOnline;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card overflow-hidden">
        <div className="h-32 gradient-bg"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="relative">
              <img
                src={profile.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`}
                alt={profile.name}
                className="w-24 h-24 rounded-xl border-4 border-white object-cover shadow-lg"
              />
              {isOnline && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.isVerified && <Shield className="w-5 h-5 text-primary-600" />}
              </div>
              <p className="text-gray-500 capitalize">{profile.userType}</p>
            </div>
            <div className="flex gap-2">
              {isOwnProfile ? (
                <Link to="/profile/edit" className="btn btn-primary">
                  <Edit className="w-4 h-4" /> Edit Profile
                </Link>
              ) : (
                <>
                  {friendStatus === 'none' && (
                    <button onClick={() => handleFriendAction('send')} disabled={actionLoading} className="btn btn-primary">
                      <UserPlus className="w-4 h-4" /> Add Friend
                    </button>
                  )}
                  {friendStatus === 'pending_sent' && (
                    <button disabled className="btn btn-secondary">Request Sent</button>
                  )}
                  {friendStatus === 'pending_received' && (
                    <>
                      <button onClick={() => handleFriendAction('accept')} disabled={actionLoading} className="btn btn-primary">
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={() => handleFriendAction('decline')} disabled={actionLoading} className="btn btn-secondary">
                        <X className="w-4 h-4" /> Decline
                      </button>
                    </>
                  )}
                  {friendStatus === 'accepted' && (
                    <>
                      <Link to={`/chat/${id}`} className="btn btn-primary">
                        <MessageCircle className="w-4 h-4" /> Message
                      </Link>
                      <button onClick={() => handleFriendAction('remove')} disabled={actionLoading} className="btn btn-danger">
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 space-y-6">
          {profile.bio && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">About</h2>
              <p className="text-gray-600">{profile.bio}</p>
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-semibold mb-3">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests?.length > 0 ? (
                profile.interests.map((interest, i) => (
                  <span key={i} className="badge bg-primary-100 text-primary-700">{interest.name || interest}</span>
                ))
              ) : (
                <p className="text-gray-500">No interests added</p>
              )}
            </div>
          </div>

          {profile.skills?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span key={i} className="badge bg-green-100 text-green-700">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Details</h2>
            <div className="space-y-3 text-sm">
              {profile.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" /> {profile.location}
                </div>
              )}
              {profile.age && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" /> {profile.age} years old
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" /> Joined {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {profile.communities?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Communities</h2>
              <div className="space-y-2">
                {profile.communities.map((community) => (
                  <Link 
                    key={community.id} 
                    to={`/communities/${community.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <img 
                      src={community.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${community.name}`}
                      alt={community.name}
                      className="w-8 h-8 rounded"
                    />
                    <span className="text-sm truncate">{community.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
