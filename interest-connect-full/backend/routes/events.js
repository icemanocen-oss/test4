const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('description').trim().notEmpty().isLength({ max: 2000 }),
    body('communityId').notEmpty(),
    body('location').trim().notEmpty(),
    body('eventDate').isISO8601(),
    body('category').isIn(['study', 'sports', 'arts', 'technology', 'business', 'social', 'other'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, communityId, location, eventDate, duration, maxParticipants, category, isOnline, meetingLink } = req.body;

        const { data: membership } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', communityId)
            .eq('user_id', req.user.id)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You must be a member of the community to create events' });
        }

        const { data: event, error } = await supabase
            .from('events')
            .insert({
                title,
                description,
                organizer_id: req.user.id,
                community_id: communityId,
                location,
                event_date: eventDate,
                duration: duration || 60,
                max_participants: maxParticipants || 50,
                category,
                is_online: isOnline || false,
                meeting_link: meetingLink || null
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to create event' });
        }

        await supabase.from('event_participants').insert({ event_id: event.id, user_id: req.user.id });

        res.status(201).json({ message: 'Event created successfully', event });

    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { category, communityId, status = 'upcoming', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase.from('events').select('*', { count: 'exact' });

        if (category) query = query.eq('category', category);
        if (communityId) query = query.eq('community_id', communityId);
        if (status === 'upcoming') {
            query = query.gte('event_date', new Date().toISOString()).eq('status', 'upcoming');
        }

        query = query.order('event_date', { ascending: true }).range(offset, offset + limit - 1);

        const { data: events, error, count } = await query;

        if (error) return res.status(500).json({ error: 'Failed to fetch events' });

        res.json({ events, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

router.get('/community/:communityId', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;

        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .eq('community_id', communityId)
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true });

        if (error) return res.status(500).json({ error: 'Failed to fetch events' });

        res.json({ events });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: event, error } = await supabase.from('events').select('*').eq('id', id).single();

        if (error || !event) return res.status(404).json({ error: 'Event not found' });

        const { data: participants } = await supabase
            .from('event_participants')
            .select('user_id, users(id, name, profile_picture)')
            .eq('event_id', id);

        const { data: community } = await supabase.from('communities').select('id, name').eq('id', event.community_id).single();
        const { data: organizer } = await supabase.from('users').select('id, name, profile_picture').eq('id', event.organizer_id).single();

        const isParticipant = participants?.some(p => p.user_id === req.user.id);

        res.json({
            ...event,
            organizer,
            community,
            participants: participants?.map(p => p.users) || [],
            participantCount: participants?.length || 0,
            isParticipant,
            isOrganizer: event.organizer_id === req.user.id
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

router.post('/:id/join', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: event } = await supabase.from('events').select('*').eq('id', id).single();
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const { data: existing } = await supabase
            .from('event_participants')
            .select('*')
            .eq('event_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (existing) return res.status(400).json({ error: 'Already registered for this event' });

        const { count } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', id);

        if (count >= event.max_participants) {
            return res.status(400).json({ error: 'Event is full' });
        }

        await supabase.from('event_participants').insert({ event_id: id, user_id: req.user.id });

        res.json({ message: 'Registered for event successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to join event' });
    }
});

router.post('/:id/leave', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        await supabase.from('event_participants').delete().eq('event_id', id).eq('user_id', req.user.id);

        res.json({ message: 'Left event successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to leave event' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: event } = await supabase.from('events').select('organizer_id').eq('id', id).single();

        if (event?.organizer_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the organizer can delete the event' });
        }

        await supabase.from('events').delete().eq('id', id);

        res.json({ message: 'Event deleted successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = router;
