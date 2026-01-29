"""Affiliate system database models."""
from datetime import datetime
from extensions import db


class AffiliateLink(db.Model):
    """Stores unique affiliate code per user."""
    __tablename__ = 'affiliate_link'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    code = db.Column(db.String(32), unique=True, nullable=False)  # Unique affiliate code
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    visits = db.relationship('AffiliateVisit', backref='affiliate_link', lazy='dynamic')
    
    def __repr__(self):
        return f'<AffiliateLink {self.code}>'


class AffiliateVisit(db.Model):
    """Tracks visitors from affiliate links."""
    __tablename__ = 'affiliate_visit'
    
    id = db.Column(db.Integer, primary_key=True)
    affiliate_link_id = db.Column(db.Integer, db.ForeignKey('affiliate_link.id'), nullable=False)
    visitor_ip = db.Column(db.String(45), nullable=True)  # IPv6 compatible
    user_agent = db.Column(db.String(512), nullable=True)
    visited_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AffiliateVisit {self.id}>'


class AffiliateEmailList(db.Model):
    """Stores marketing emails entered by user for affiliate invitations."""
    __tablename__ = 'affiliate_email_list'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    sent_at = db.Column(db.DateTime, nullable=True)  # When marketing email was sent
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint: user can only add same email once
    __table_args__ = (
        db.UniqueConstraint('user_id', 'email', name='uix_affiliate_email_user'),
    )
    
    def __repr__(self):
        return f'<AffiliateEmailList {self.email}>'


class AffiliateReferral(db.Model):
    """Tracks successful referrals (email match or link click)."""
    __tablename__ = 'affiliate_referral'
    
    id = db.Column(db.Integer, primary_key=True)
    sharer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Who referred
    referred_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)  # Who was referred (each user can only be referred once)
    source = db.Column(db.String(20), nullable=False)  # 'link' or 'email'
    email_verified = db.Column(db.Boolean, default=False)  # Whether referred user verified email
    email_verified_at = db.Column(db.DateTime, nullable=True)
    purchase_tier = db.Column(db.String(10), nullable=True)  # daypass/pro/vip when they purchase
    purchase_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AffiliateReferral sharer={self.sharer_id} referred={self.referred_id}>'


class AffiliateReward(db.Model):
    """Logs rewards given to sharers."""
    __tablename__ = 'affiliate_reward'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Who received the reward
    reward_type = db.Column(db.String(30), nullable=False)  # 'first_referral_pro', 'referral_token', 'vip_upgrade'
    tokens_awarded = db.Column(db.Integer, default=0)
    tier_before = db.Column(db.String(10), nullable=True)
    tier_after = db.Column(db.String(10), nullable=True)
    referral_id = db.Column(db.Integer, db.ForeignKey('affiliate_referral.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AffiliateReward {self.reward_type} for user {self.user_id}>'
