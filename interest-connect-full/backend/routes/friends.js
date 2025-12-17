const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data: friendships, error } = await supabase
            .from('friendships')
            .select('*')
            .or(`user_id.eq.${req.user.id},friend_id.eq.${req.user.id}`)
            .eq('status', 'accepted');

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch friends' });
        }

        const friendIds = friendships.map(f => 
            f.user_id === req.user.id ? f.friend_id : f.user_id
        );

        if (friendIds.length === 0) {
            return res.json({ friends: [] });
        }

        const { data: friends } = await supabase
            .from('users')
            .select('id, name, profile_picture, bio, is_online, last_active')
            .in('id', friendIds);

        res.json({ friends: friends || [] });

    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

router.get('/requests', authMiddleware, async (req, res) => {
    try {
        const { data: incoming, error: inError } = await supabase
            .from('friendships')
            .select('*, users!friendships_user_id_fkey(id, name, profile_picture)')
            .eq('friend_id', req.user.id)
            .eq('status', 'pending');

        const { data: outgoing, error: outError } = await supabase
            .from('friendships')
            .select('*, users!friendships_friend_id_fkey(id, name, profile_picture)')
            .eq('user_id', req.user.id)
            .eq('status', 'pending');

        if (inError || outError) {
            return res.status(500).json({ error: 'Failed to fetch friend requests' });
        }

        res.json({
            incoming: incoming?.map(r => ({
                id: r.id,
                user: r.users,
                createdAt: r.created_at
            })) || [],
            outgoing: outgoing?.map(r => ({
                id: r.id,
                user: r.users,
                createdAt: r.created_at
            })) || []
        });

    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Failed to fetch friend requests' });
    }
});

router.post('/request/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        const { data: targetUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${req.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${req.user.id})`)
            .single();

        if (existingFriendship) {
            if (existingFriendship.status === 'accepted') {
                return res.status(400).json({ error: 'Already friends' });
            }
            if (existingFriendship.status === 'pending') {
                return res.status(400).json({ error: 'Friend request already pending' });
            }
            if (existingFriendship.status === 'blocked') {
                return res.status(400).json({ error: 'Cannot send request to this user' });
            }
        }

        const { data: friendship, error } = await supabase
            .from('friendships')
            .insert({
                user_id: req.user.id,
                friend_id: userId,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to send friend request' });
        }

        await supabase
            .from('notifications')
            .insert({
                recipient_id: userId,
                sender_id: req.user.id,
                type: 'friend_request',
                title: 'New Friend Request',
                message: `${req.user.name} sent you a friend request`,
                link: '/friends',
                related_id: friendship.id
            });

        res.json({ message: 'Friend request sent successfully' });

    } catch (error) {
        console.error('Send request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

router.post('/accept/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: friendship, error: findError } = await supabase
            .from('friendships')
            .select('*')
            .eq('user_id', userId)
            .eq('friend_id', req.user.id)
            .eq('status', 'pending')
            .single();

        if (findError || !friendship) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        const { error } = await supabase
            .from('friendships')
            .update({ 
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', friendship.id);

        if (error) {
            return res.status(500).json({ error: 'Failed to accept friend request' });
        }

        await supabase
            .from('notifications')
            .insert({
                recipient_id: userId,
                sender_id: req.user.id,
                type: 'friend_accepted',
                title: 'Friend Request Accepted',
                message: `${req.user.name} accepted your friend request`,
                link: '/friends'
            });

        res.json({ message: 'Friend request accepted' });

    } catch (error) {
        console.error('Accept request error:', error);
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
});

router.post('/decline/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('user_id', userId)
            .eq('friend_id', req.user.id)
            .eq('status', 'pending');

        if (error) {
            return res.status(500).json({ error: 'Failed to decline friend request' });
        }

        res.json({ message: 'Friend request declined' });

    } catch (error) {
        console.error('Decline request error:', error);
        res.status(500).json({ error: 'Failed to decline friend request' });
    }
});

router.delete('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const { error } = await supabase
            .from('friendships')
            .delete()
            .or(`and(user_id.eq.${req.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${req.user.id})`);

        if (error) {
            return res.status(500).json({ error: 'Failed to remove friend' });
        }

        res.json({ message: 'Friend removed successfully' });

    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

router.get('/status/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: friendship } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${req.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${req.user.id})`)
            .single();

        if (!friendship) {
            return res.json({ status: 'none' });
        }

        let status = friendship.status;
        if (status === 'pending') {
            status = friendship.user_id === req.user.id ? 'pending_sent' : 'pending_received';
        }

        res.json({ status });

    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ error: 'Failed to get friendship status' });
    }
});

module.exports = router;
