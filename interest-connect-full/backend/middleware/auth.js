const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No authentication token provided' });
        }

        const token = authHeader.replace('Bearer ', '');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, age, bio, location, profile_picture, user_type, is_verified, is_online, privacy_settings')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'User not found or token invalid' });
        }

        await supabase
            .from('users')
            .update({ last_active: new Date().toISOString(), is_online: true })
            .eq('id', user.id);

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { data: user } = await supabase
            .from('users')
            .select('id, email, name, profile_picture')
            .eq('id', decoded.userId)
            .single();

        if (user) {
            req.user = user;
        }
        next();
    } catch (error) {
        next();
    }
};

module.exports = { authMiddleware, optionalAuth };
