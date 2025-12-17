const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, [
    body('name').trim().notEmpty().isLength({ min: 3, max: 200 }),
    body('description').trim().notEmpty().isLength({ max: 2000 }),
    body('category').isIn(['study', 'sports', 'arts', 'technology', 'business', 'languages', 'music', 'gaming', 'other'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, category, interests, maxMembers, isPrivate } = req.body;

        const imageSeed = name.replace(/\s+/g, '').toLowerCase();
        const imageUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${imageSeed}`;

        const { data: community, error: createError } = await supabase
            .from('communities')
            .insert({
                name,
                description,
                category,
                image_url: imageUrl,
                creator_id: req.user.id,
                max_members: maxMembers || 100,
                is_private: isPrivate || false,
                member_count: 1
            })
            .select()
            .single();

        if (createError) {
            console.error('Create community error:', createError);
            return res.status(500).json({ error: 'Failed to create community' });
        }

        await supabase
            .from('community_members')
            .insert({
                community_id: community.id,
                user_id: req.user.id,
                role: 'admin'
            });

        if (interests && interests.length > 0) {
            const { data: interestRecords } = await supabase
                .from('interests')
                .select('id')
                .in('name', interests);

            if (interestRecords && interestRecords.length > 0) {
                const communityInterests = interestRecords.map(interest => ({
                    community_id: community.id,
                    interest_id: interest.id
                }));

                await supabase.from('community_interests').insert(communityInterests);
            }
        }

        res.status(201).json({
            message: 'Community created successfully',
            community: {
                ...community,
                interests: interests || [],
                memberCount: 1,
                isCreator: true,
                isMember: true
            }
        });

    } catch (error) {
        console.error('Create community error:', error);
        res.status(500).json({ error: 'Failed to create community' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { category, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('communities')
            .select(`
                *,
                creator:users!communities_creator_id_fkey(id, name, profile_picture)
            `, { count: 'exact' })
            .eq('is_private', false);

        if (category) {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        query = query.order('member_count', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: communities, error, count } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch communities' });
        }

        const { data: userMemberships } = await supabase
            .from('community_members')
            .select('community_id, role')
            .eq('user_id', req.user.id);

        const membershipMap = {};
        userMemberships?.forEach(m => {
            membershipMap[m.community_id] = m.role;
        });

        const communitiesWithMembership = await Promise.all(communities.map(async (community) => {
            const { data: communityInterests } = await supabase
                .from('community_interests')
                .select('interests(name)')
                .eq('community_id', community.id);

            return {
                id: community.id,
                name: community.name,
                description: community.description,
                category: community.category,
                imageUrl: community.image_url,
                creator: community.creator,
                memberCount: community.member_count,
                maxMembers: community.max_members,
                isPrivate: community.is_private,
                interests: communityInterests?.map(ci => ci.interests.name) || [],
                isMember: !!membershipMap[community.id],
                role: membershipMap[community.id] || null,
                createdAt: community.created_at,
                lastActivity: community.last_activity
            };
        }));

        res.json({
            communities: communitiesWithMembership,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('Get communities error:', error);
        res.status(500).json({ error: 'Failed to fetch communities' });
    }
});

router.get('/my', authMiddleware, async (req, res) => {
    try {
        const { data: memberships, error } = await supabase
            .from('community_members')
            .select(`
                role,
                communities(
                    *,
                    creator:users!communities_creator_id_fkey(id, name, profile_picture)
                )
            `)
            .eq('user_id', req.user.id)
            .order('joined_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch communities' });
        }

        const communities = memberships.map(m => ({
            id: m.communities.id,
            name: m.communities.name,
            description: m.communities.description,
            category: m.communities.category,
            imageUrl: m.communities.image_url,
            creator: m.communities.creator,
            memberCount: m.communities.member_count,
            role: m.role,
            isMember: true,
            lastActivity: m.communities.last_activity
        }));

        res.json({ communities });

    } catch (error) {
        console.error('Get my communities error:', error);
        res.status(500).json({ error: 'Failed to fetch communities' });
    }
});

router.get('/recommendations', authMiddleware, async (req, res) => {
    try {
        const { data: userInterests } = await supabase
            .from('user_interests')
            .select('interest_id')
            .eq('user_id', req.user.id);

        const { data: userCommunities } = await supabase
            .from('community_members')
            .select('community_id')
            .eq('user_id', req.user.id);

        const userCommunityIds = userCommunities?.map(uc => uc.community_id) || [];
        const userInterestIds = userInterests?.map(ui => ui.interest_id) || [];

        let query = supabase
            .from('communities')
            .select(`
                *,
                creator:users!communities_creator_id_fkey(id, name, profile_picture)
            `)
            .eq('is_private', false)
            .order('member_count', { ascending: false })
            .limit(10);

        if (userCommunityIds.length > 0) {
            query = query.not('id', 'in', `(${userCommunityIds.join(',')})`);
        }

        const { data: communities, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch recommendations' });
        }

        const recommendationsWithScores = await Promise.all(communities.map(async (community) => {
            const { data: communityInterests } = await supabase
                .from('community_interests')
                .select('interest_id, interests(name)')
                .eq('community_id', community.id);

            const communityInterestIds = communityInterests?.map(ci => ci.interest_id) || [];
            const matchingInterests = communityInterestIds.filter(id => userInterestIds.includes(id));
            const matchScore = userInterestIds.length > 0 
                ? Math.round((matchingInterests.length / userInterestIds.length) * 100) 
                : 0;

            return {
                id: community.id,
                name: community.name,
                description: community.description,
                category: community.category,
                imageUrl: community.image_url,
                creator: community.creator,
                memberCount: community.member_count,
                interests: communityInterests?.map(ci => ci.interests.name) || [],
                matchScore
            };
        }));

        recommendationsWithScores.sort((a, b) => b.matchScore - a.matchScore);

        res.json({ recommendations: recommendationsWithScores });

    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: community, error } = await supabase
            .from('communities')
            .select(`
                *,
                creator:users!communities_creator_id_fkey(id, name, profile_picture)
            `)
            .eq('id', id)
            .single();

        if (error || !community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const { data: membership } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (community.is_private && !membership) {
            return res.status(403).json({ error: 'This community is private' });
        }

        const { data: members } = await supabase
            .from('community_members')
            .select(`
                role,
                joined_at,
                users(id, name, profile_picture, is_online)
            `)
            .eq('community_id', id)
            .order('joined_at', { ascending: true });

        const { data: communityInterests } = await supabase
            .from('community_interests')
            .select('interests(name)')
            .eq('community_id', id);

        res.json({
            id: community.id,
            name: community.name,
            description: community.description,
            category: community.category,
            imageUrl: community.image_url,
            creator: community.creator,
            memberCount: community.member_count,
            maxMembers: community.max_members,
            isPrivate: community.is_private,
            interests: communityInterests?.map(ci => ci.interests.name) || [],
            members: members?.map(m => ({
                ...m.users,
                role: m.role,
                joinedAt: m.joined_at
            })) || [],
            isMember: !!membership,
            role: membership?.role || null,
            isCreator: community.creator_id === req.user.id,
            createdAt: community.created_at,
            lastActivity: community.last_activity
        });

    } catch (error) {
        console.error('Get community error:', error);
        res.status(500).json({ error: 'Failed to fetch community' });
    }
});

router.post('/:id/join', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: community, error: communityError } = await supabase
            .from('communities')
            .select('*')
            .eq('id', id)
            .single();

        if (communityError || !community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const { data: existingMembership } = await supabase
            .from('community_members')
            .select('*')
            .eq('community_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (existingMembership) {
            return res.status(400).json({ error: 'Already a member of this community' });
        }

        if (community.member_count >= community.max_members) {
            return res.status(400).json({ error: 'Community is full' });
        }

        if (community.is_private) {
            return res.status(403).json({ error: 'This community is private. Request an invitation.' });
        }

        const { error: joinError } = await supabase
            .from('community_members')
            .insert({
                community_id: id,
                user_id: req.user.id,
                role: 'member'
            });

        if (joinError) {
            return res.status(500).json({ error: 'Failed to join community' });
        }

        await supabase
            .from('communities')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', id);

        res.json({ message: 'Joined community successfully' });

    } catch (error) {
        console.error('Join community error:', error);
        res.status(500).json({ error: 'Failed to join community' });
    }
});

router.post('/:id/leave', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: community } = await supabase
            .from('communities')
            .select('creator_id')
            .eq('id', id)
            .single();

        if (community?.creator_id === req.user.id) {
            return res.status(400).json({ error: 'Creator cannot leave. Transfer ownership or delete the community.' });
        }

        const { error } = await supabase
            .from('community_members')
            .delete()
            .eq('community_id', id)
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(500).json({ error: 'Failed to leave community' });
        }

        res.json({ message: 'Left community successfully' });

    } catch (error) {
        console.error('Leave community error:', error);
        res.status(500).json({ error: 'Failed to leave community' });
    }
});

router.get('/:id/members', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { data: members, error, count } = await supabase
            .from('community_members')
            .select(`
                role,
                joined_at,
                users(id, name, profile_picture, bio, is_online, user_type)
            `, { count: 'exact' })
            .eq('community_id', id)
            .order('joined_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch members' });
        }

        const formattedMembers = members.map(m => ({
            ...m.users,
            role: m.role,
            joinedAt: m.joined_at
        }));

        res.json({
            members: formattedMembers,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, isPrivate, maxMembers } = req.body;

        const { data: membership } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can edit the community' });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (category) updateData.category = category;
        if (isPrivate !== undefined) updateData.is_private = isPrivate;
        if (maxMembers) updateData.max_members = maxMembers;

        const { data: updatedCommunity, error } = await supabase
            .from('communities')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to update community' });
        }

        res.json({ message: 'Community updated successfully', community: updatedCommunity });

    } catch (error) {
        console.error('Update community error:', error);
        res.status(500).json({ error: 'Failed to update community' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: community } = await supabase
            .from('communities')
            .select('creator_id')
            .eq('id', id)
            .single();

        if (community?.creator_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the creator can delete the community' });
        }

        await supabase.from('communities').delete().eq('id', id);

        res.json({ message: 'Community deleted successfully' });

    } catch (error) {
        console.error('Delete community error:', error);
        res.status(500).json({ error: 'Failed to delete community' });
    }
});

module.exports = router;
