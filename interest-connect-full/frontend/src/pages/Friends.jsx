import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { friendsAPI } from '../services/api';
import useChatStore from '../stores/chatStore';
import { Users, UserPlus, Check, X, MessageCircle, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('friends');
  const { isUserOnline } = useChatStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendsAPI.getAll(),
        friendsAPI.getRequests()
      ]);
      setFriends(friendsRes.data.friends || []);
      setRequests(requestsRes.data);
    } catch (error) {
      toast.error('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (userId) => {
    try {
      await friendsAPI.acceptRequest(userId);
      toast.success('Friend request accepted!');
      loadData();
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleDecline = async (userId) => {
    try {
      await friendsAPI.declineRequest(userId);
      toast.success('Request declined');
      loadData();
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await friendsAPI.removeFriend(userId);
      toast.success('Friend removed');
      loadData();
    } catch (error) {
      toast.error('Failed');
    }
  };

  const incomingCount = requests.incoming?.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      <div className="flex gap-4 border-b">
        <button onClick={() => setTab('friends')}
          className={`pb-3 px-1 font-medium ${tab === 'friends' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
          Friends ({friends.length})
        </button>
        <button onClick={() => setTab('requests')}
          className={`pb-3 px-1 font-medium flex items-center gap-2 ${tab === 'requests' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
          Requests
          {incomingCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{incomingCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner"></div></div>
      ) : tab === 'friends' ? (
        friends.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No friends yet</p>
            <Link to="/search" className="btn btn-primary mt-4">Find People</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {friends.map(friend => (
              <div key={friend.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={friend.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`}
                      alt="" className="w-12 h-12 rounded-full" />
                    {(isUserOnline(friend.id) || friend.is_online) && (
                      <div className="absolute bottom-0 right-0 online-indicator" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${friend.id}`} className="font-medium hover:underline">{friend.name}</Link>
                    <p className="text-sm text-gray-500 truncate">{friend.bio || 'No bio'}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link to={`/chat/${friend.id}`} className="btn btn-primary flex-1 text-sm">
                    <MessageCircle className="w-4 h-4" /> Message
                  </Link>
                  <button onClick={() => handleRemove(friend.id)} className="btn btn-secondary text-sm px-3">
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {requests.incoming?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Incoming Requests</h3>
              <div className="space-y-3">
                {requests.incoming.map(req => (
                  <div key={req.id} className="card p-4 flex items-center gap-3">
                    <img src={req.user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.name}`}
                      alt="" className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Link to={`/profile/${req.user?.id}`} className="font-medium hover:underline">{req.user?.name}</Link>
                      <p className="text-sm text-gray-500">Wants to be your friend</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(req.user?.id)} className="btn btn-primary text-sm py-1">
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={() => handleDecline(req.user?.id)} className="btn btn-secondary text-sm py-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requests.outgoing?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Sent Requests</h3>
              <div className="space-y-3">
                {requests.outgoing.map(req => (
                  <div key={req.id} className="card p-4 flex items-center gap-3">
                    <img src={req.user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.name}`}
                      alt="" className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Link to={`/profile/${req.user?.id}`} className="font-medium hover:underline">{req.user?.name}</Link>
                      <p className="text-sm text-gray-500">Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requests.incoming?.length === 0 && requests.outgoing?.length === 0 && (
            <div className="text-center py-12 text-gray-500">No pending requests</div>
          )}
        </div>
      )}
    </div>
  );
}
