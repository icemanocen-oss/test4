import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { communitiesAPI, eventsAPI, postsAPI } from '../services/api';
import { Users, Calendar, FileText, Info, MessageCircle, Plus, Heart, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommunityDetails() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('about');
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [newComment, setNewComment] = useState({});

  useEffect(() => {
    loadCommunity();
  }, [id]);

  useEffect(() => {
    if (community?.isMember) {
      if (tab === 'posts') loadPosts();
      if (tab === 'events') loadEvents();
    }
  }, [tab, community?.isMember]);

  const loadCommunity = async () => {
    try {
      const res = await communitiesAPI.getById(id);
      setCommunity(res.data);
    } catch (error) {
      toast.error('Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const res = await postsAPI.getByCommunity(id);
      setPosts(res.data.posts || []);
    } catch (error) {}
  };

  const loadEvents = async () => {
    try {
      const res = await eventsAPI.getByCommunity(id);
      setEvents(res.data.events || []);
    } catch (error) {}
  };

  const handleJoin = async () => {
    try {
      await communitiesAPI.join(id);
      toast.success('Joined!');
      loadCommunity();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this community?')) return;
    try {
      await communitiesAPI.leave(id);
      toast.success('Left community');
      loadCommunity();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      await postsAPI.create({ communityId: id, content: newPost });
      setNewPost('');
      loadPosts();
      toast.success('Posted!');
    } catch (error) {
      toast.error('Failed to post');
    }
  };

  const handleLikePost = async (postId) => {
    try {
      await postsAPI.like(postId);
      loadPosts();
    } catch (error) {}
  };

  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    try {
      await postsAPI.addComment(postId, newComment[postId]);
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      loadPosts();
    } catch (error) {}
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner"></div></div>;
  if (!community) return <div className="text-center py-12 text-gray-500">Community not found</div>;

  const tabs = [
    { id: 'about', label: 'About', icon: Info },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'posts', label: 'Posts', icon: FileText },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="card overflow-hidden">
        <div className="h-40 gradient-bg relative">
          <img src={community.imageUrl} alt="" className="w-full h-full object-cover opacity-30" />
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{community.name}</h1>
              <p className="text-gray-500 capitalize">{community.category} • {community.memberCount} members</p>
            </div>
            <div className="flex gap-2">
              {community.isMember ? (
                <>
                  <button onClick={handleLeave} className="btn btn-secondary">Leave</button>
                  <Link to={`/chat`} className="btn btn-primary"><MessageCircle className="w-4 h-4" /> Chat</Link>
                </>
              ) : (
                <button onClick={handleJoin} className="btn btn-primary">Join Community</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === 'about' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600">{community.description}</p>
            </div>
            {community.interests?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {community.interests.map((i, idx) => (
                    <span key={idx} className="badge bg-primary-100 text-primary-700">{i}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-2">Created by</h3>
              <Link to={`/profile/${community.creator?.id}`} className="flex items-center gap-2 hover:underline">
                <img src={community.creator?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${community.creator?.name}`}
                  alt="" className="w-8 h-8 rounded-full" />
                <span>{community.creator?.name}</span>
              </Link>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {community.members?.map(member => (
              <Link key={member.id} to={`/profile/${member.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className="relative">
                  <img src={member.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                    alt="" className="w-10 h-10 rounded-full" />
                  {member.is_online && <div className="absolute bottom-0 right-0 online-indicator" />}
                </div>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === 'events' && (
          community.isMember ? (
            events.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No upcoming events</p>
            ) : (
              <div className="space-y-4">
                {events.map(event => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{event.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(event.event_date).toLocaleString()} • {event.location}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-center text-gray-500 py-8">Join to see events</p>
          )
        )}

        {tab === 'posts' && (
          community.isMember ? (
            <div className="space-y-6">
              <form onSubmit={handleCreatePost} className="flex gap-2">
                <input type="text" value={newPost} onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share something..." className="input flex-1" />
                <button type="submit" className="btn btn-primary"><Send className="w-4 h-4" /></button>
              </form>
              
              {posts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No posts yet</p>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={post.author?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.name}`}
                        alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <Link to={`/profile/${post.author?.id}`} className="font-medium hover:underline">{post.author?.name}</Link>
                        <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-gray-700">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                      <button onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1 text-sm ${post.isLiked ? 'text-red-500' : 'text-gray-500'}`}>
                        <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} /> {post.likesCount}
                      </button>
                      <span className="text-sm text-gray-500">{post.commentsCount} comments</span>
                    </div>
                    {post.comments?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {post.comments.map(comment => (
                          <div key={comment.id} className="flex gap-2 text-sm">
                            <img src={comment.user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user?.name}`}
                              alt="" className="w-6 h-6 rounded-full" />
                            <div className="bg-gray-100 rounded-lg px-3 py-2">
                              <span className="font-medium">{comment.user?.name}</span>
                              <p className="text-gray-600">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newComment[post.id] || ''} onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder="Add comment..." className="input flex-1 text-sm py-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Join to see posts</p>
          )
        )}
      </div>
    </div>
  );
}
