const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('recipient_id', req.user.id);

        if (unreadOnly === 'true') {
            query = query.eq('is_read', false);
        }

        query = query.order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: notifications, error, count } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }

        const senderIds = [...new Set(notifications.filter(n => n.sender_id).map(n => n.sender_id))];
        let senderMap = {};
        
        if (senderIds.length > 0) {
            const { data: senders } = await supabase
                .from('users')
                .select('id, name, profile_picture')
                .in('id', senderIds);
            
            senders?.forEach(s => senderMap[s.id] = s);
        }

        const formattedNotifications = notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            sender: n.sender_id ? senderMap[n.sender_id] : null,
            isRead: n.is_read,
            createdAt: n.created_at
        }));

        res.json({
            notifications: formattedNotifications,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.get('/unread/count', authMiddleware, async (req, res) => {
    try {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', req.user.id)
            .eq('is_read', false);

        res.json({ count: count || 0 });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('recipient_id', req.user.id);

        if (error) {
            return res.status(500).json({ error: 'Failed to mark notification as read' });
        }

        res.json({ message: 'Notification marked as read' });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('recipient_id', req.user.id)
            .eq('is_read', false);

        if (error) {
            return res.status(500).json({ error: 'Failed to mark all as read' });
        }

        res.json({ message: 'All notifications marked as read' });

    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('recipient_id', req.user.id);

        if (error) {
            return res.status(500).json({ error: 'Failed to delete notification' });
        }

        res.json({ message: 'Notification deleted' });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

router.delete('/clear-all', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('recipient_id', req.user.id);

        if (error) {
            return res.status(500).json({ error: 'Failed to clear notifications' });
        }

        res.json({ message: 'All notifications cleared' });

    } catch (error) {
        console.error('Clear all error:', error);
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});

module.exports = router;
