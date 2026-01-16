ALTER TABLE t_p61541260_yna_social_network_g.users 
ADD COLUMN IF NOT EXISTS verification_color VARCHAR(20) DEFAULT 'red',
ADD COLUMN IF NOT EXISTS custom_theme VARCHAR(50),
ADD COLUMN IF NOT EXISTS premium_emoji_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS super_likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS boost_active_until TIMESTAMP;

CREATE TABLE IF NOT EXISTS t_p61541260_yna_social_network_g.stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    media_url TEXT NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p61541260_yna_social_network_g.story_views (
    id SERIAL PRIMARY KEY,
    story_id INTEGER,
    user_id INTEGER,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, user_id)
);

ALTER TABLE t_p61541260_yna_social_network_g.posts 
ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;

ALTER TABLE t_p61541260_yna_social_network_g.likes 
ADD COLUMN IF NOT EXISTS is_super_like BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON t_p61541260_yna_social_network_g.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON t_p61541260_yna_social_network_g.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_boosted ON t_p61541260_yna_social_network_g.posts(is_boosted, created_at DESC);