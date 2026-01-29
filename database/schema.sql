-- ============================================
-- STANDALONE AFFILIATE SYSTEM SCHEMA
-- ============================================

-- 15. Create AffiliateLink table
CREATE TABLE IF NOT EXISTS affiliate_link (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id),
    code VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 16. Create AffiliateVisit table
CREATE TABLE IF NOT EXISTS affiliate_visit (
    id SERIAL PRIMARY KEY,
    visitor_ip VARCHAR(45),
    user_agent VARCHAR(512),
    visited_at TIMESTAMP DEFAULT NOW(),
    affiliate_link_id INTEGER NOT NULL REFERENCES affiliate_link(id)
);

-- 17. Create AffiliateEmailList table
CREATE TABLE IF NOT EXISTS affiliate_email_list (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    email VARCHAR(120) NOT NULL,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uix_affiliate_email_user UNIQUE (user_id, email)
);

-- 18. Create AffiliateReferral table
CREATE TABLE IF NOT EXISTS affiliate_referral (
    id SERIAL PRIMARY KEY,
    sharer_id INTEGER NOT NULL REFERENCES "user"(id),
    referred_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id),
    source VARCHAR(20) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    purchase_tier VARCHAR(10),
    purchase_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 19. Create AffiliateReward table
CREATE TABLE IF NOT EXISTS affiliate_reward (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    reward_type VARCHAR(30) NOT NULL,
    tokens_awarded INTEGER DEFAULT 0,
    tier_before VARCHAR(10),
    tier_after VARCHAR(10),
    referral_id INTEGER REFERENCES affiliate_referral(id),
    created_at TIMESTAMP DEFAULT NOW()
);
