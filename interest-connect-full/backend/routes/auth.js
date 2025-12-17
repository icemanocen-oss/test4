const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const supabase = require('../config/supabase');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../services/emailService');
const { authMiddleware } = require('../middleware/auth');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('age').optional().isInt({ min: 16, max: 100 }).withMessage('Age must be between 16 and 100')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, age, interests, skills, location, userType } = req.body;

        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const verificationToken = uuidv4();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const avatarSeed = name.replace(/\s+/g, '');
        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                name,
                age: age || null,
                location: location || null,
                user_type: userType || 'student',
                profile_picture: profilePicture,
                email_verification_token: verificationToken,
                email_verification_expires: verificationExpires.toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return res.status(500).json({ error: 'Failed to create user' });
        }

        if (interests && interests.length > 0) {
            const { data: interestRecords } = await supabase
                .from('interests')
                .select('id, name')
                .in('name', interests);

            if (interestRecords && interestRecords.length > 0) {
                const userInterests = interestRecords.map(interest => ({
                    user_id: newUser.id,
                    interest_id: interest.id
                }));
                
                await supabase.from('user_interests').insert(userInterests);
            }
        }

        if (skills && skills.length > 0) {
            const userSkills = skills.map(skill => ({
                user_id: newUser.id,
                skill_name: skill.trim()
            }));
            
            await supabase.from('user_skills').insert(userSkills);
        }

        await sendVerificationEmail(email, name, verificationToken);

        const token = generateToken(newUser.id);

        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                userType: newUser.user_type,
                isVerified: false,
                emailVerified: false
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        if (!user.password_hash) {
            return res.status(400).json({ 
                error: 'This account uses Google Sign-In. Please login with Google.' 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        await supabase
            .from('users')
            .update({ last_active: new Date().toISOString(), is_online: true })
            .eq('id', user.id);

        const { data: userInterests } = await supabase
            .from('user_interests')
            .select('interests(name)')
            .eq('user_id', user.id);

        const { data: userSkills } = await supabase
            .from('user_skills')
            .select('skill_name')
            .eq('user_id', user.id);

        const token = generateToken(user.id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                age: user.age,
                bio: user.bio,
                location: user.location,
                profilePicture: user.profile_picture,
                userType: user.user_type,
                isVerified: user.is_verified,
                emailVerified: user.email_verified,
                interests: userInterests?.map(ui => ui.interests.name) || [],
                skills: userSkills?.map(us => us.skill_name) || [],
                privacySettings: user.privacy_settings
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email_verification_token', token)
            .single();

        if (error || !user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        if (new Date(user.email_verification_expires) < new Date()) {
            return res.status(400).json({ error: 'Verification token has expired' });
        }

        await supabase
            .from('users')
            .update({
                email_verified: true,
                is_verified: true,
                email_verification_token: null,
                email_verification_expires: null
            })
            .eq('id', user.id);

        await sendWelcomeEmail(user.email, user.name);

        res.json({ 
            message: 'Email verified successfully! You can now access all features.',
            verified: true
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

router.post('/resend-verification', authMiddleware, async (req, res) => {
    try {
        const user = req.user;

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        const { data: fullUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        const verificationToken = uuidv4();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await supabase
            .from('users')
            .update({
                email_verification_token: verificationToken,
                email_verification_expires: verificationExpires.toISOString()
            })
            .eq('id', user.id);

        await sendVerificationEmail(fullUser.email, fullUser.name, verificationToken);

        res.json({ message: 'Verification email sent! Please check your inbox.' });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        res.json({ 
            message: 'If an account with that email exists, we have sent a password reset link.' 
        });

        if (!user) return;

        if (user.google_id && !user.password_hash) {
            return;
        }

        const resetToken = uuidv4();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

        await supabase
            .from('users')
            .update({
                password_reset_token: resetToken,
                password_reset_expires: resetExpires.toISOString()
            })
            .eq('id', user.id);

        await sendPasswordResetEmail(user.email, user.name, resetToken);

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/reset-password', [
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, password } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('password_reset_token', token)
            .single();

        if (error || !user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        if (new Date(user.password_reset_expires) < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        await supabase
            .from('users')
            .update({
                password_hash: passwordHash,
                password_reset_token: null,
                password_reset_expires: null
            })
            .eq('id', user.id);

        res.json({ message: 'Password reset successfully! You can now login with your new password.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_auth_failed' }),
    (req, res) => {
        const token = generateToken(req.user.id);
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
);

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const { data: userInterests } = await supabase
            .from('user_interests')
            .select('interests(name)')
            .eq('user_id', req.user.id);

        const { data: userSkills } = await supabase
            .from('user_skills')
            .select('skill_name')
            .eq('user_id', req.user.id);

        const { data: fullUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .single();

        res.json({
            id: fullUser.id,
            name: fullUser.name,
            email: fullUser.email,
            age: fullUser.age,
            bio: fullUser.bio,
            location: fullUser.location,
            profilePicture: fullUser.profile_picture,
            userType: fullUser.user_type,
            isVerified: fullUser.is_verified,
            emailVerified: fullUser.email_verified,
            interests: userInterests?.map(ui => ui.interests.name) || [],
            skills: userSkills?.map(us => us.skill_name) || [],
            privacySettings: fullUser.privacy_settings,
            createdAt: fullUser.created_at
        });

    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

router.post('/logout', authMiddleware, async (req, res) => {
    try {
        await supabase
            .from('users')
            .update({ is_online: false })
            .eq('id', req.user.id);

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

module.exports = router;
