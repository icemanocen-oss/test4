import { useState, useEffect } from 'react';
import { eventsAPI } from '../services/api';
import { Calendar, MapPin, Users, Clock, Video } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  const categories = ['all', 'study', 'sports', 'arts', 'technology', 'business', 'social', 'other'];

  useEffect(() => {
    loadEvents();
  }, [category]);

  const loadEvents = async () => {
    try {
      const params = { status: 'upcoming' };
      if (category !== 'all') params.category = category;
      const res = await eventsAPI.getAll(params);
      setEvents(res.data.events || []);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (id) => {
    try {
      await eventsAPI.join(id);
      toast.success('Registered!');
      loadEvents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    }
  };

  const handleLeave = async (id) => {
    try {
      await eventsAPI.leave(id);
      toast.success('Cancelled registration');
      loadEvents();
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Upcoming Events</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${
              category === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}>
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner"></div></div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No upcoming events</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div key={event.id} className="card overflow-hidden">
              <div className="h-24 gradient-bg flex items-center justify-center">
                <Calendar className="w-10 h-10 text-white/70" />
              </div>
              <div className="p-4">
                <span className="badge bg-primary-100 text-primary-700 text-xs capitalize">{event.category}</span>
                <h3 className="font-semibold text-lg mt-2">{event.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{event.description}</p>
                
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {event.duration} min
                  </div>
                  <div className="flex items-center gap-2">
                    {event.is_online ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    {event.is_online ? 'Online' : event.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {event.participantCount || 0} / {event.max_participants}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  {event.isParticipant ? (
                    <button onClick={() => handleLeave(event.id)} className="btn btn-secondary w-full">
                      Cancel Registration
                    </button>
                  ) : (
                    <button onClick={() => handleJoin(event.id)} className="btn btn-primary w-full">
                      Register
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
