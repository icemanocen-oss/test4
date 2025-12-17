import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usersAPI, communitiesAPI, eventsAPI, messagesAPI } from '../services/api';
import { Heart, Users, Calendar, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ matches: 0, communities: 0, events: 0, messages: 0 });
  const [matches, setMatches] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [matchesRes, recsRes, eventsRes, msgCountRes, myCommunitiesRes] = await Promise.all([
          usersAPI.getMatches(),
          communitiesAPI.getRecommendations(),
          eventsAPI.getAll({ status: 'upcoming', limit: 5 }),
          messagesAPI.getUnreadCount(),
          communitiesAPI.getMy()
        ]);

        setMatches(matchesRes.data.matches || []);
        setRecommendations(recsRes.data.recommendations || []);
        setEvents(eventsRes.data.events || []);
        
        setStats({
          matches: matchesRes.data.matches?.length || 0,
          communities: myCommunitiesRes.data.communities?.length || 0,
          events: eventsRes.data.events?.length || 0,
          messages: msgCountRes.data.count || 0
        });
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const statCards = [
    { label: 'AI Matches', value: stats.matches, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Communities', value: stats.communities, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Upcoming Events', value: stats.events, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Unread Messages', value: stats.messages, icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
        {!user?.emailVerified && (
          <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm">
            Please verify your email to access all features
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" /> AI Matches
            </h2>
            <Link to="/search" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {matches.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Add more interests to find matches!</p>
            ) : (
              matches.slice(0, 4).map((match) => (
                <Link 
                  key={match.id} 
                  to={`/profile/${match.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <img 
                      src={match.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.name}`}
                      alt={match.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {match.is_online && <div className="absolute bottom-0 right-0 online-indicator" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{match.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {match.interests?.slice(0, 3).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="badge bg-primary-100 text-primary-700">{match.matchScore}% Match</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" /> Recommended Communities
            </h2>
            <Link to="/communities" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
              Browse All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recommendations yet</p>
            ) : (
              recommendations.slice(0, 4).map((community) => (
                <Link
                  key={community.id}
                  to={`/communities/${community.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img 
                    src={community.imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${community.name}`}
                    alt={community.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{community.name}</p>
                    <p className="text-sm text-gray-500">{community.memberCount} members</p>
                  </div>
                  {community.matchScore > 0 && (
                    <span className="badge bg-green-100 text-green-700">{community.matchScore}%</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" /> Upcoming Events
          </h2>
          <Link to="/events" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="p-4">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming events</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.slice(0, 6).map((event) => (
                <div key={event.id} className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                  <p className="font-medium truncate">{event.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{event.location}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
