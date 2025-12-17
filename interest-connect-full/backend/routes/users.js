const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

router.get('/profile/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, age, bio, location, profile_picture, user_type, is_verified, is_online, last_active, privacy_settings, created_at')
            .eq('id', id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { data: userInterests } = await supabase
            .from('user_interests')
            .select('interests(id, name, category)')
            .eq('user_id', id);

        const { data: userSkills } = await supabase
            .from('user_skills')
            .select('skill_name')
            .eq('user_id', id);

        const { data: communities } = await supabase
            .from('community_members')
            .select('communities(id, name, image_url)')
            .eq('user_id', id)
            .limit(5);

        const privacySettings = user.privacy_settings || {};
        const isOwnProfile = req.user.id === id;

        const profileData = {
            id: user.id,
            name: user.name,
            email: isOwnProfile || privacySettings.showEmail ? user.email : null,
            age: isOwnProfile || privacySettings.showAge ? user.age : null,
            bio: user.bio,
            location: isOwnProfile || privacySettings.showLocation ? user.location : null,
            profilePicture: user.profile_picture,
            userType: user.user_type,
            isVerified: user.is_verified,
            isOnline: user.is_online,
            lastActive: user.last_active,
            interests: userInterests?.map(ui => ui.interests) || [],
            skills: userSkills?.map(us => us.skill_name) || [],
            communities: communities?.map(c => c.communities) || [],
            createdAt: user.created_at
        };

        res.json(profileData);

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

router.put('/profile', authMiddleware, [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('bio').optional().isLength({ max: 500 }),
    body('age').optional().isInt({ min: 16, max: 100 }),
    body('location').optional().isLength({ max: 200 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, bio, age, location, userType, interests, skills, privacySettings } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;
        if (age !== undefined) updateData.age = age;
        if (location !== undefined) updateData.location = location;
        if (userType) updateData.user_type = userType;
        if (privacySettings) updateData.privacy_settings = privacySettings;

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to update profile' });
        }

        if (interests && Array.isArray(interests)) {
            await supabase
                .from('user_interests')
                .delete()
                .eq('user_id', req.user.id);

            if (interests.length > 0) {
                const { data: interestRecords } = await supabase
                    .from('interests')
                    .select('id, name')
                    .in('name', interests);

                if (interestRecords && interestRecords.length > 0) {
                    const userInterests = interestRecords.map(interest => ({
                        user_id: req.user.id,
                        interest_id: interest.id
                    }));
                    
                    await supabase.from('user_interests').insert(userInterests);
                }
            }
        }

        if (skills && Array.isArray(skills)) {
            await supabase
                .from('user_skills')
                .delete()
                .eq('user_id', req.user.id);

            if (skills.length > 0) {
                const userSkills = skills.map(skill => ({
                    user_id: req.user.id,
                    skill_name: skill.trim()
                }));
                
                await supabase.from('user_skills').insert(userSkills);
            }
        }

        const { data: userInterests } = await supabase
            .from('user_interests')
            .select('interests(name)')
            .eq('user_id', req.user.id);

        const { data: userSkills } = await supabase
            .from('user_skills')
            .select('skill_name')
            .eq('user_id', req.user.id);

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                age: updatedUser.age,
                bio: updatedUser.bio,
                location: updatedUser.location,
                profilePicture: updatedUser.profile_picture,
                userType: updatedUser.user_type,
                interests: userInterests?.map(ui => ui.interests.name) || [],
                skills: userSkills?.map(us => us.skill_name) || [],
                privacySettings: updatedUser.privacy_settings
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { q, interests, userType, location, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('users')
            .select('id, name, bio, location, profile_picture, user_type, is_verified, is_online', { count: 'exact' })
            .neq('id', req.user.id);

        if (q) {
            query = query.or(`name.ilike.%${q}%,bio.ilike.%${q}%`);
        }

        if (userType) {
            query = query.eq('user_type', userType);
        }

        if (location) {
            query = query.ilike('location', `%${location}%`);
        }

        query = query.range(offset, offset + limit - 1);

        const { data: users, error, count } = await query;

        if (error) {
            return res.status(500).json({ error: 'Search failed' });
        }

        const usersWithInterests = await Promise.all(users.map(async (user) => {
            const { data: userInterests } = await supabase
                .from('user_interests')
                .select('interests(name)')
                .eq('user_id', user.id);

            return {
                ...user,
                interests: userInterests?.map(ui => ui.interests.name) || []
            };
        }));

        let filteredUsers = usersWithInterests;
        if (interests) {
            const interestArray = interests.split(',').map(i => i.trim().toLowerCase());
            filteredUsers = usersWithInterests.filter(user => 
                user.interests.some(i => interestArray.includes(i.toLowerCase()))
            );
        }

        res.json({
            users: filteredUsers,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/matches', authMiddleware, async (req, res) => {
    try {
        const { data: currentUserInterests } = await supabase
            .from('user_interests')
            .select('interest_id')
            .eq('user_id', req.user.id);

        const interestIds = currentUserInterests?.map(ui => ui.interest_id) || [];

        if (interestIds.length === 0) {
            return res.json({ matches: [], message: 'Add some interests to find matches!' });
        }

        const { data: matchingUsers } = await supabase
            .from('user_interests')
            .select('user_id, interest_id')
            .in('interest_id', interestIds)
            .neq('user_id', req.user.id);

        const userMatchScores = {};
        matchingUsers?.forEach(match => {
            if (!userMatchScores[match.user_id]) {
                userMatchScores[match.user_id] = 0;
            }
            userMatchScores[match.user_id]++;
        });

        const sortedUserIds = Object.entries(userMatchScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([userId]) => userId);

        if (sortedUserIds.length === 0) {
            return res.json({ matches: [] });
        }

        const { data: users } = await supabase
            .from('users')
            .select('id, name, bio, location, profile_picture, user_type, is_online')
            .in('id', sortedUserIds);

        const matches = await Promise.all(users.map(async (user) => {
            const { data: userInterests } = await supabase
                .from('user_interests')
                .select('interests(name)')
                .eq('user_id', user.id);

            const matchScore = Math.round((userMatchScores[user.id] / interestIds.length) * 100);

            return {
                ...user,
                interests: userInterests?.map(ui => ui.interests.name) || [],
                matchScore
            };
        }));

        matches.sort((a, b) => b.matchScore - a.matchScore);

        res.json({ matches });

    } catch (error) {
        console.error('Matches error:', error);
        res.status(500).json({ error: 'Failed to find matches' });
    }
});

router.get('/interests', async (req, res) => {
    try {
        const { data: interests, error } = await supabase
            .from('interests')
            .select('*')
            .order('category')
            .order('name');

        if (error) {
            return res.status(500).json({ error: 'Failed to get interests' });
        }

        const grouped = interests.reduce((acc, interest) => {
            const category = interest.category || 'other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(interest);
            return acc;
        }, {});

        res.json({ interests, grouped });

    } catch (error) {
        console.error('Get interests error:', error);
        res.status(500).json({ error: 'Failed to get interests' });
    }
});

router.post('/block/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }

        const { error } = await supabase
            .from('blocked_users')
            .insert({
                blocker_id: req.user.id,
                blocked_id: userId
            });

        if (error && error.code !== '23505') {
            return res.status(500).json({ error: 'Failed to block user' });
        }

        res.json({ message: 'User blocked successfully' });

    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
});

router.delete('/block/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        await supabase
            .from('blocked_users')
            .delete()
            .eq('blocker_id', req.user.id)
            .eq('blocked_id', userId);

        res.json({ message: 'User unblocked successfully' });

    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});

module.exports = router;
