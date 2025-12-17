const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

router.get('/conversations', authMiddleware, async (req, res) => {
    try {
        const { data: sentMessages } = await supabase
            .from('messages')
            .select('receiver_id')
            .eq('sender_id', req.user.id)
            .not('receiver_id', 'is', null);

        const { data: receivedMessages } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('receiver_id', req.user.id);

        const userIds = new Set();
        sentMessages?.forEach(m => userIds.add(m.receiver_id));
        receivedMessages?.forEach(m => userIds.add(m.sender_id));

        if (userIds.size === 0) {
            return res.json({ conversations: [] });
        }

        const conversations = await Promise.all(Array.from(userIds).map(async (partnerId) => {
            const { data: partner } = await supabase
                .from('users')
                .select('id, name, profile_picture, is_online')
                .eq('id', partnerId)
                .single();

            const { data: lastMessage } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${req.user.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const { count: unreadCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', partnerId)
                .eq('receiver_id', req.user.id)
                .eq('is_read', false);

            return {
                partner,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    createdAt: lastMessage.created_at,
                    isFromMe: lastMessage.sender_id === req.user.id
                } : null,
                unreadCount: unreadCount || 0
            };
        }));

        conversations.sort((a, b) => {
            const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
            const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
            return dateB - dateA;
        });

        res.json({ conversations });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const { data: messages, error, count } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${req.user.id})`)
            .is('community_id', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }

        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', userId)
            .eq('receiver_id', req.user.id)
            .eq('is_read', false);

        const formattedMessages = messages.reverse().map(m => ({
            id: m.id,
            content: m.content,
            messageType: m.message_type,
            isFromMe: m.sender_id === req.user.id,
            isRead: m.is_read,
            createdAt: m.created_at
        }));

        res.json({
            messages: formattedMessages,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.get('/community/:communityId', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const { data: membership } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', communityId)
            .eq('user_id', req.user.id)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You must be a member to view messages' });
        }

        const { data: messages, error, count } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('community_id', communityId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }

        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const { data: senders } = await supabase
            .from('users')
            .select('id, name, profile_picture')
            .in('id', senderIds);

        const senderMap = {};
        senders?.forEach(s => senderMap[s.id] = s);

        const formattedMessages = messages.reverse().map(m => ({
            id: m.id,
            content: m.content,
            messageType: m.message_type,
            sender: senderMap[m.sender_id],
            isFromMe: m.sender_id === req.user.id,
            createdAt: m.created_at
        }));

        res.json({
            messages: formattedMessages,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('Get community messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post('/send', authMiddleware, [
    body('content').trim().notEmpty().isLength({ max: 2000 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { receiverId, communityId, content, messageType = 'text' } = req.body;

        if (!receiverId && !communityId) {
            return res.status(400).json({ error: 'Either receiverId or communityId is required' });
        }

        if (communityId) {
            const { data: membership } = await supabase
                .from('community_members')
                .select('role')
                .eq('community_id', communityId)
                .eq('user_id', req.user.id)
                .single();

            if (!membership) {
                return res.status(403).json({ error: 'You must be a member to send messages' });
            }
        }

        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                sender_id: req.user.id,
                receiver_id: receiverId || null,
                community_id: communityId || null,
                content,
                message_type: messageType
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to send message' });
        }

        res.status(201).json({ message: 'Message sent', data: message });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.put('/read/:messageId', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;

        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId)
            .eq('receiver_id', req.user.id);

        if (error) {
            return res.status(500).json({ error: 'Failed to mark message as read' });
        }

        res.json({ message: 'Message marked as read' });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});

router.get('/unread/count', authMiddleware, async (req, res) => {
    try {
        const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', req.user.id)
            .eq('is_read', false);

        res.json({ count: count || 0 });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

module.exports = router;
