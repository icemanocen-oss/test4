require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const supabase = require('./config/supabase');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;
        const profilePicture = profile.photos?.[0]?.value || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;

        let { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', googleId)
            .single();

        if (!user) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            if (existingUser) {
                const { data: updatedUser, error } = await supabase
                    .from('users')
                    .update({ 
                        google_id: googleId,
                        profile_picture: existingUser.profile_picture || profilePicture,
                        email_verified: true,
                        is_verified: true
                    })
                    .eq('id', existingUser.id)
                    .select()
                    .single();

                if (error) return done(error);
                user = updatedUser;
            } else {
                const { data: newUser, error } = await supabase
                    .from('users')
                    .insert({
                        email: email.toLowerCase(),
                        name,
                        google_id: googleId,
                        profile_picture: profilePicture,
                        email_verified: true,
                        is_verified: true
                    })
                    .select()
                    .single();

                if (error) return done(error);
                user = newUser;
            }
        }

        await supabase
            .from('users')
            .update({ last_active: new Date().toISOString(), is_online: true })
            .eq('id', user.id);

        done(null, user);
    } catch (error) {
        done(error);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
    done(null, user);
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/communities', require('./routes/communities'));
app.use('/api/events', require('./routes/events'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/', (req, res) => {
    res.json({
        name: 'InterestConnect API',
        version: '2.0.0',
        database: 'Supabase',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            communities: '/api/communities',
            events: '/api/events',
            posts: '/api/posts',
            friends: '/api/friends',
            messages: '/api/messages',
            notifications: '/api/notifications'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const activeUsers = new Map();
const userSockets = new Map();

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { data: user } = await supabase
            .from('users')
            .select('id, name, profile_picture')
            .eq('id', decoded.userId)
            .single();

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${socket.user.name} (${userId})`);

    activeUsers.set(userId, {
        id: userId,
        name: socket.user.name,
        profilePicture: socket.user.profile_picture,
        socketId: socket.id
    });
    userSockets.set(userId, socket.id);

    await supabase
        .from('users')
        .update({ is_online: true, last_active: new Date().toISOString() })
        .eq('id', userId);

    io.emit('user_online', { userId, user: socket.user });
    socket.emit('online_users', Array.from(activeUsers.values()));

    socket.join(userId);

    socket.on('join_community', (communityId) => {
        socket.join(`community_${communityId}`);
        console.log(`User ${socket.user.name} joined community: ${communityId}`);
    });

    socket.on('leave_community', (communityId) => {
        socket.leave(`community_${communityId}`);
        console.log(`User ${socket.user.name} left community: ${communityId}`);
    });

    socket.on('send_message', async (data) => {
        try {
            const { receiverId, communityId, content, messageType = 'text' } = data;

            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    sender_id: userId,
                    receiver_id: receiverId || null,
                    community_id: communityId || null,
                    content,
                    message_type: messageType
                })
                .select()
                .single();

            if (error) {
                socket.emit('message_error', { error: 'Failed to send message' });
                return;
            }

            const messageData = {
                id: message.id,
                content: message.content,
                messageType: message.message_type,
                sender: socket.user,
                createdAt: message.created_at,
                isRead: false
            };

            if (receiverId) {
                socket.emit('message_sent', messageData);
                
                const receiverSocketId = userSockets.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('new_message', {
                        ...messageData,
                        isFromMe: false
                    });
                }

                await supabase.from('notifications').insert({
                    recipient_id: receiverId,
                    sender_id: userId,
                    type: 'new_message',
                    title: 'New Message',
                    message: `${socket.user.name} sent you a message`,
                    link: `/chat/${userId}`,
                    related_id: message.id
                });

                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('new_notification', {
                        type: 'new_message',
                        sender: socket.user,
                        preview: content.substring(0, 50)
                    });
                }
            }

            if (communityId) {
                io.to(`community_${communityId}`).emit('community_message', {
                    communityId,
                    ...messageData
                });
            }
        } catch (error) {
            console.error('Send message error:', error);
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    });

    socket.on('typing', (data) => {
        const { receiverId, communityId, isTyping } = data;

        if (receiverId) {
            const receiverSocketId = userSockets.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_typing', {
                    userId,
                    user: socket.user,
                    isTyping
                });
            }
        }

        if (communityId) {
            socket.to(`community_${communityId}`).emit('user_typing', {
                communityId,
                userId,
                user: socket.user,
                isTyping
            });
        }
    });

    socket.on('mark_read', async (data) => {
        const { messageId } = data;
        
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId)
            .eq('receiver_id', userId);

        const { data: message } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', messageId)
            .single();

        if (message) {
            const senderSocketId = userSockets.get(message.sender_id);
            if (senderSocketId) {
                io.to(senderSocketId).emit('message_read', { messageId });
            }
        }
    });

    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.user.name}`);
        
        activeUsers.delete(userId);
        userSockets.delete(userId);

        await supabase
            .from('users')
            .update({ is_online: false, last_active: new Date().toISOString() })
            .eq('id', userId);

        io.emit('user_offline', { userId });
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 InterestConnect API v2.0                            ║
║                                                           ║
║   Server:     http://localhost:${PORT}                      ║
║   Database:   Supabase                                    ║
║   WebSocket:  Socket.IO Ready                             ║
║                                                           ║
║   Endpoints:                                              ║
║   - Auth:          /api/auth                              ║
║   - Users:         /api/users                             ║
║   - Communities:   /api/communities                       ║
║   - Events:        /api/events                            ║
║   - Posts:         /api/posts                             ║
║   - Friends:       /api/friends                           ║
║   - Messages:      /api/messages                          ║
║   - Notifications: /api/notifications                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = { app, io, server };