-- InterestConnect Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    age INTEGER CHECK (age >= 16 AND age <= 100),
    bio TEXT,
    location VARCHAR(200),
    profile_picture TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    user_type VARCHAR(50) DEFAULT 'student' CHECK (user_type IN ('student', 'professional', 'hobbyist')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    google_id VARCHAR(255) UNIQUE,
    privacy_settings JSONB DEFAULT '{"showEmail": false, "showAge": true, "showLocation": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interests table (справочник интересов)
CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interests (many-to-many)
CREATE TABLE IF NOT EXISTS user_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, interest_id)
);

-- User skills
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('study', 'sports', 'arts', 'technology', 'business', 'languages', 'music', 'gaming', 'other')),
    image_url TEXT DEFAULT 'https://api.dicebear.com/7.x/shapes/svg?seed=community',
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    max_members INTEGER DEFAULT 100,
    is_private BOOLEAN DEFAULT FALSE,
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community members
CREATE TABLE IF NOT EXISTS community_members (
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (community_id, user_id)
);

-- Community interests
CREATE TABLE IF NOT EXISTS community_interests (
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (community_id, interest_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    location VARCHAR(300),
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    max_participants INTEGER DEFAULT 50,
    category VARCHAR(50) CHECK (category IN ('study', 'sports', 'arts', 'technology', 'business', 'social', 'other')),
    is_online BOOLEAN DEFAULT FALSE,
    meeting_link TEXT,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event participants
CREATE TABLE IF NOT EXISTS event_participants (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT NOT NULL,
    images TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, friend_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link TEXT,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Insert default interests
INSERT INTO interests (name, category, icon) VALUES
    ('Programming', 'technology', 'code'),
    ('Web Development', 'technology', 'globe'),
    ('Mobile Development', 'technology', 'smartphone'),
    ('Machine Learning', 'technology', 'cpu'),
    ('Data Science', 'technology', 'database'),
    ('Cybersecurity', 'technology', 'shield'),
    ('Mathematics', 'study', 'calculator'),
    ('Physics', 'study', 'atom'),
    ('Chemistry', 'study', 'flask'),
    ('Biology', 'study', 'leaf'),
    ('Literature', 'study', 'book'),
    ('History', 'study', 'landmark'),
    ('Economics', 'business', 'trending-up'),
    ('Marketing', 'business', 'megaphone'),
    ('Entrepreneurship', 'business', 'rocket'),
    ('Finance', 'business', 'dollar-sign'),
    ('Football', 'sports', 'dribbble'),
    ('Basketball', 'sports', 'circle'),
    ('Tennis', 'sports', 'target'),
    ('Swimming', 'sports', 'waves'),
    ('Running', 'sports', 'activity'),
    ('Yoga', 'sports', 'heart'),
    ('Guitar', 'music', 'music'),
    ('Piano', 'music', 'music-2'),
    ('Singing', 'music', 'mic'),
    ('Music Production', 'music', 'headphones'),
    ('Photography', 'arts', 'camera'),
    ('Painting', 'arts', 'palette'),
    ('Digital Art', 'arts', 'pen-tool'),
    ('Video Editing', 'arts', 'film'),
    ('Writing', 'arts', 'feather'),
    ('English', 'languages', 'message-circle'),
    ('Spanish', 'languages', 'message-circle'),
    ('French', 'languages', 'message-circle'),
    ('German', 'languages', 'message-circle'),
    ('Japanese', 'languages', 'message-circle'),
    ('Korean', 'languages', 'message-circle'),
    ('Chinese', 'languages', 'message-circle'),
    ('Gaming', 'other', 'gamepad-2'),
    ('Travel', 'other', 'map'),
    ('Cooking', 'other', 'chef-hat'),
    ('Reading', 'other', 'book-open'),
    ('Movies', 'other', 'clapperboard'),
    ('Anime', 'other', 'tv')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_community ON messages(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_community ON events(community_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_member_count
AFTER INSERT OR DELETE ON community_members
    FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_likes_count
AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Function to update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comments_count
AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- RLS Policies (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: These are basic policies. In production, you'd want more granular control
-- For the backend service key, we bypass RLS, but these help if using client-side Supabase

CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Communities are viewable by everyone" ON communities FOR SELECT USING (NOT is_private OR id IN (
    SELECT community_id FROM community_members WHERE user_id::text = auth.uid()::text
));

CREATE POLICY "Posts are viewable by community members" ON posts FOR SELECT USING (
    community_id IN (SELECT community_id FROM community_members WHERE user_id::text = auth.uid()::text)
);

CREATE POLICY "Messages are viewable by participants" ON messages FOR SELECT USING (
    sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text
);

CREATE POLICY "Users can see own notifications" ON notifications FOR SELECT USING (
    recipient_id::text = auth.uid()::text
);
