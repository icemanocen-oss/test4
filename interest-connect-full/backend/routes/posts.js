const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, [
    body('communityId').notEmpty(),
    body('content').trim().notEmpty().isLength({ max: 5000 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { communityId, title, content, images } = req.body;

        const { data: membership } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', communityId)
            .eq('user_id', req.user.id)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You must be a member to post in this community' });
        }

        const { data: post, error } = await supabase
            .from('posts')
            .insert({
                author_id: req.user.id,
                community_id: communityId,
                title: title || null,
                content,
                images: images || []
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to create post' });
        }

        await supabase
            .from('communities')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', communityId);

        res.status(201).json({ message: 'Post created successfully', post });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

router.get('/community/:communityId', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { data: membership } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', communityId)
            .eq('user_id', req.user.id)
            .single();

        const { data: community } = await supabase
            .from('communities')
            .select('is_private')
            .eq('id', communityId)
            .single();

        if (community?.is_private && !membership) {
            return res.status(403).json({ error: 'You must be a member to view posts' });
        }

        const { data: posts, error, count } = await supabase
            .from('posts')
            .select('*', { count: 'exact' })
            .eq('community_id', communityId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch posts' });
        }

        const { data: userLikes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', req.user.id);

        const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

        const postsWithDetails = await Promise.all(posts.map(async (post) => {
            const { data: author } = await supabase
                .from('users')
                .select('id, name, profile_picture')
                .eq('id', post.author_id)
                .single();

            const { data: comments } = await supabase
                .from('post_comments')
                .select('*, users(id, name, profile_picture)')
                .eq('post_id', post.id)
                .order('created_at', { ascending: true })
                .limit(5);

            return {
                id: post.id,
                title: post.title,
                content: post.content,
                images: post.images,
                author,
                likesCount: post.likes_count,
                commentsCount: post.comments_count,
                isPinned: post.is_pinned,
                isLiked: likedPostIds.has(post.id),
                isAuthor: post.author_id === req.user.id,
                comments: comments?.map(c => ({
                    id: c.id,
                    content: c.content,
                    user: c.users,
                    createdAt: c.created_at
                })) || [],
                createdAt: post.created_at
            };
        }));

        res.json({
            posts: postsWithDetails,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const { data: author } = await supabase
            .from('users')
            .select('id, name, profile_picture')
            .eq('id', post.author_id)
            .single();

        const { data: comments } = await supabase
            .from('post_comments')
            .select('*, users(id, name, profile_picture)')
            .eq('post_id', id)
            .order('created_at', { ascending: true });

        const { data: userLike } = await supabase
            .from('post_likes')
            .select('*')
            .eq('post_id', id)
            .eq('user_id', req.user.id)
            .single();

        res.json({
            id: post.id,
            title: post.title,
            content: post.content,
            images: post.images,
            author,
            likesCount: post.likes_count,
            commentsCount: post.comments_count,
            isPinned: post.is_pinned,
            isLiked: !!userLike,
            isAuthor: post.author_id === req.user.id,
            comments: comments?.map(c => ({
                id: c.id,
                content: c.content,
                user: c.users,
                createdAt: c.created_at
            })) || [],
            createdAt: post.created_at
        });

    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existingLike } = await supabase
            .from('post_likes')
            .select('*')
            .eq('post_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (existingLike) {
            await supabase
                .from('post_likes')
                .delete()
                .eq('post_id', id)
                .eq('user_id', req.user.id);

            res.json({ message: 'Post unliked', liked: false });
        } else {
            await supabase
                .from('post_likes')
                .insert({ post_id: id, user_id: req.user.id });

            res.json({ message: 'Post liked', liked: true });
        }

    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

router.post('/:id/comments', authMiddleware, [
    body('content').trim().notEmpty().isLength({ max: 1000 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { content } = req.body;

        const { data: comment, error } = await supabase
            .from('post_comments')
            .insert({
                post_id: id,
                user_id: req.user.id,
                content
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to add comment' });
        }

        res.status(201).json({ message: 'Comment added', comment });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: post } = await supabase
            .from('posts')
            .select('author_id, community_id')
            .eq('id', id)
            .single();

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const { data: membership } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', post.community_id)
            .eq('user_id', req.user.id)
            .single();

        const canDelete = post.author_id === req.user.id || membership?.role === 'admin';

        if (!canDelete) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        await supabase.from('posts').delete().eq('id', id);

        res.json({ message: 'Post deleted successfully' });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

router.delete('/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const { commentId } = req.params;

        const { data: comment } = await supabase
            .from('post_comments')
            .select('user_id')
            .eq('id', commentId)
            .single();

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        await supabase.from('post_comments').delete().eq('id', commentId);

        res.json({ message: 'Comment deleted successfully' });

    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

module.exports = router;
