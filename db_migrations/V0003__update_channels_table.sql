ALTER TABLE t_p61541260_yna_social_network_g.channels 
ADD COLUMN IF NOT EXISTS owner_id INTEGER,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

UPDATE t_p61541260_yna_social_network_g.channels 
SET subscribers_count = COALESCE(members_count, 0) 
WHERE subscribers_count = 0;