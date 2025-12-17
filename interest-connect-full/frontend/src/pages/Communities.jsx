import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { communitiesAPI } from '../services/api';
import { Plus, Search, Users, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const categories = ['all', 'study', 'sports', 'arts', 'technology', 'business', 'languages', 'music', 'gaming', 'other'];

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [tab, setTab] = useState('discover');

  useEffect(() => {
    loadCommunities();
  }, [category, search]);

  const loadCommunities = async () => {
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (search) params.search = search;

      const [allRes, myRes] = await Promise.all([
        communitiesAPI.getAll(params),
        communitiesAPI.getMy()
      ]);
      setCommunities(allRes.data.communities || []);
      setMyCommunities(myRes.data.communities || []);
    } catch (error) {
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (id) => {
    try {
      await communitiesAPI.join(id);
      toast.success('Joined community!');
      loadCommunities();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to join');
    }
  };

  const displayCommunities = tab === 'my' ? myCommunities : communities;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Communities</h1>
        <Link to="/communities/create" className="btn btn-primary">
          <Plus className="w-5 h-5" /> Create Community
        </Link>
      </div>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                  category === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b">
        <button
          onClick={() => setTab('discover')}
          className={`pb-3 px-1 font-medium ${tab === 'discover' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
        >
          Discover
        </button>
        <button
          onClick={() => setTab('my')}
          className={`pb-3 px-1 font-medium ${tab === 'my' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
        >
          My Communities ({myCommunities.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner"></div></div>
      ) : displayCommunities.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{tab === 'my' ? 'You haven\'t joined any communities yet' : 'No communities found'}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCommunities.map(community => (
            <div key={community.id} className="card overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-24 gradient-bg relative">
                <img
                  src={community.imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${community.name}`}
                  alt={community.name}
                  className="w-full h-full object-cover opacity-50"
                />
                <span className="absolute top-2 right-2 badge bg-white/90 text-gray-700 capitalize">
                  {community.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg truncate">{community.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{community.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Users className="w-4 h-4" /> {community.memberCount} members
                  </span>
                  {community.isMember ? (
                    <Link to={`/communities/${community.id}`} className="btn btn-secondary text-sm py-1">
                      View
                    </Link>
                  ) : (
                    <button onClick={() => handleJoin(community.id)} className="btn btn-primary text-sm py-1">
                      Join
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
