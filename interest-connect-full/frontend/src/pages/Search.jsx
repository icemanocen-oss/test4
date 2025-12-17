import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../services/api';
import useChatStore from '../stores/chatStore';
import { Search as SearchIcon, Filter, MapPin, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Search() {
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ userType: '', location: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState('matches');
  const { isUserOnline } = useChatStore();

  useEffect(() => {
    loadMatches();
    loadUsers();
  }, []);

  const loadMatches = async () => {
    try {
      const res = await usersAPI.getMatches();
      setMatches(res.data.matches || []);
    } catch (error) {}
  };

  const loadUsers = async () => {
    try {
      const params = {};
      if (search) params.q = search;
      if (filters.userType) params.userType = filters.userType;
      if (filters.location) params.location = filters.location;
      
      const res = await usersAPI.searchUsers(params);
      setUsers(res.data.users || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (tab === 'search') loadUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, filters, tab]);

  const displayUsers = tab === 'matches' ? matches : users;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Find Partners</h1>

      <div className="flex gap-4 border-b">
        <button onClick={() => setTab('matches')}
          className={`pb-3 px-1 font-medium flex items-center gap-2 ${tab === 'matches' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
          <Sparkles className="w-4 h-4" /> AI Matches
        </button>
        <button onClick={() => setTab('search')}
          className={`pb-3 px-1 font-medium flex items-center gap-2 ${tab === 'search' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
          <SearchIcon className="w-4 h-4" /> Search
        </button>
      </div>

      {tab === 'search' && (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or interests..." className="input pl-10" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}>
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
              <select value={filters.userType} onChange={(e) => setFilters(p => ({ ...p, userType: e.target.value }))}
                className="input w-auto">
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="professional">Professional</option>
                <option value="hobbyist">Hobbyist</option>
              </select>
              <input type="text" value={filters.location}
                onChange={(e) => setFilters(p => ({ ...p, location: e.target.value }))}
                placeholder="Location" className="input w-auto" />
              <button onClick={() => setFilters({ userType: '', location: '' })}
                className="btn btn-secondary"><X className="w-4 h-4" /> Clear</button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner"></div></div>
      ) : displayUsers.length === 0 ? (
        <div className="text-center py-12">
          <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {tab === 'matches' ? 'Add more interests to find matches!' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayUsers.map(person => (
            <Link key={person.id} to={`/profile/${person.id}`} className="card p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={person.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`}
                    alt="" className="w-14 h-14 rounded-full object-cover" />
                  {(isUserOnline(person.id) || person.is_online) && (
                    <div className="absolute bottom-0 right-0 online-indicator" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{person.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{person.user_type}</p>
                  {person.location && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" /> {person.location}
                    </p>
                  )}
                </div>
                {person.matchScore && (
                  <span className="badge bg-primary-100 text-primary-700">{person.matchScore}%</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {person.interests?.slice(0, 4).map((interest, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {interest}
                  </span>
                ))}
                {person.interests?.length > 4 && (
                  <span className="text-xs text-gray-400">+{person.interests.length - 4}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
