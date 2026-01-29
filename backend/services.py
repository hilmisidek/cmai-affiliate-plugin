"""Affiliate system business logic services."""
import secrets
import string
from datetime import datetime, timedelta
from extensions import db
from affiliate.models import (
    AffiliateLink, 
    AffiliateVisit, 
    AffiliateEmailList, 
    AffiliateReferral, 
    AffiliateReward
)


def generate_affiliate_code(length=8):
    """Generate a unique affiliate code."""
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Check if code already exists
        if not AffiliateLink.query.filter_by(code=code).first():
            return code


def get_or_create_affiliate_link(user_id):
    """Get existing or create new affiliate link for user."""
    link = AffiliateLink.query.filter_by(user_id=user_id).first()
    if not link:
        code = generate_affiliate_code()
        link = AffiliateLink(user_id=user_id, code=code)
        db.session.add(link)
        db.session.commit()
    return link


def track_affiliate_visit(code, visitor_ip=None, user_agent=None):
    """Record a visit from an affiliate link. Returns the link if found."""
    link = AffiliateLink.query.filter_by(code=code).first()
    if link:
        # Check for duplicate visit from same IP within last 30 seconds
        if visitor_ip:
            recent_visit = AffiliateVisit.query.filter_by(
                affiliate_link_id=link.id,
                visitor_ip=visitor_ip
            ).filter(AffiliateVisit.visited_at > datetime.utcnow() - timedelta(seconds=30)).first()
            
            if recent_visit:
                return link

        visit = AffiliateVisit(
            affiliate_link_id=link.id,
            visitor_ip=visitor_ip,
            user_agent=user_agent[:512] if user_agent else None
        )
        db.session.add(visit)
        db.session.commit()
        return link
    return None


def add_marketing_email(user_id, email):
    """Add an email to user's marketing list. Returns (success, message)."""
    email = email.lower().strip()
    
    # Check if already exists
    existing = AffiliateEmailList.query.filter_by(user_id=user_id, email=email).first()
    if existing:
        return False, "Email already in your list"
    
    # Check if this email belongs to the user themselves
    from models import User
    user = User.query.get(user_id)
    if user and user.email.lower() == email:
        return False, "You cannot add your own email"
    
    entry = AffiliateEmailList(user_id=user_id, email=email)
    db.session.add(entry)
    db.session.commit()
    return True, "Email added successfully"


def remove_marketing_email(user_id, email):
    """Remove an email from user's marketing list."""
    email = email.lower().strip()
    entry = AffiliateEmailList.query.filter_by(user_id=user_id, email=email).first()
    if entry:
        db.session.delete(entry)
        db.session.commit()
        return True
    return False


def get_marketing_emails(user_id):
    """Get all marketing emails for a user."""
    return AffiliateEmailList.query.filter_by(user_id=user_id).all()


def send_marketing_email_to_address(user_id, recipient_email, sender_name):
    """Send predefined marketing email to a single address."""
    from flask import current_app
    import resend
    
    try:
        resend.api_key = current_app.config['RESEND_API_KEY']
        domain = current_app.config['DOMAIN']
        
        # Get user's affiliate link
        link = get_or_create_affiliate_link(user_id)
        affiliate_url = f"{domain}/?ref={link.code}"
        
        content = f"""
        <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b;">You're Invited to CopyMindset AI!</h1>
            <p style="font-size: 16px; color: #333;">
                Hey there! {sender_name} thought you might love this AI-powered copywriting tool.
            </p>
            <p style="font-size: 16px; color: #333;">
                CopyMindset AI analyzes your marketing copy and gives you instant feedback to improve conversions.
                Start with a free audit today!
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{affiliate_url}" style="background-color: #f59e0b; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Try CopyMindset AI Free
                </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
                This invitation was sent by {sender_name}. If you didn't expect this email, you can safely ignore it.
            </p>
        </div>
        """
        
        params = {
            "from": f"Copymindset AI <{current_app.config['MAIL_DEFAULT_SENDER']}>",
            "to": [recipient_email],
            "subject": f"{sender_name} invited you to CopyMindset AI",
            "html": content
        }
        
        resend.Emails.send(params)
        
        # Update sent_at timestamp
        entry = AffiliateEmailList.query.filter_by(user_id=user_id, email=recipient_email.lower()).first()
        if entry:
            entry.sent_at = datetime.utcnow()
            db.session.commit()
        
        return True, "Email sent successfully"
    except Exception as e:
        print(f"[Affiliate] Error sending email: {e}")
        return False, str(e)


def send_all_marketing_emails(user_id, sender_name):
    """Send marketing emails to all addresses in user's list."""
    emails = get_marketing_emails(user_id)
    results = []
    for entry in emails:
        success, msg = send_marketing_email_to_address(user_id, entry.email, sender_name)
        results.append({"email": entry.email, "success": success, "message": msg})
    return results


def match_registration_to_affiliate(registered_email, affiliate_code=None):
    """
    Check if a new registration matches an affiliate source.
    Returns (sharer_user_id, source) or (None, None).
    
    Priority: affiliate_code (link) > email list match
    """
    registered_email = registered_email.lower().strip()
    
    # First, check if came from affiliate link
    if affiliate_code:
        link = AffiliateLink.query.filter_by(code=affiliate_code).first()
        if link:
            return link.user_id, 'link'
    
    # Then, check email list matches
    email_entry = AffiliateEmailList.query.filter_by(email=registered_email).first()
    if email_entry:
        return email_entry.user_id, 'email'
    
    return None, None


def create_referral(sharer_id, referred_id, source):
    """Create an affiliate referral record."""
    # Check if referral already exists for this referred user
    existing = AffiliateReferral.query.filter_by(referred_id=referred_id).first()
    if existing:
        return existing
    
    referral = AffiliateReferral(
        sharer_id=sharer_id,
        referred_id=referred_id,
        source=source
    )
    db.session.add(referral)
    db.session.commit()
    return referral


def process_email_verified_reward(referred_user_id):
    """
    Process rewards when a referred user verifies their email.
    - First referral for sharer: PRO upgrade + 1 token
    - Subsequent referrals: +1 token only
    
    Returns (reward_given, reward_type, message) or (False, None, reason)
    """
    from models import User
    
    # Find the referral record
    referral = AffiliateReferral.query.filter_by(referred_id=referred_user_id).first()
    if not referral:
        return False, None, "No referral record found"
    
    if referral.email_verified:
        return False, None, "Already processed"
    
    # Mark as verified
    referral.email_verified = True
    referral.email_verified_at = datetime.utcnow()
    
    # Get sharer
    sharer = User.query.get(referral.sharer_id)
    if not sharer:
        db.session.commit()
        return False, None, "Sharer not found"
    
    # Check if this is the first referral for the sharer
    verified_referral_count = AffiliateReferral.query.filter_by(
        sharer_id=referral.sharer_id,
        email_verified=True
    ).count()
    
    tier_before = sharer.tier
    
    # First verified referral (count is 1 after we marked this one as verified)
    if verified_referral_count == 1:
        # Upgrade to PRO if not already PRO or higher
        if sharer.tier == 'FREE':
            sharer.tier = 'PRO'
        
        # Add 1 token
        sharer.credits = (sharer.credits or 0) + 1
        
        reward = AffiliateReward(
            user_id=sharer.id,
            reward_type='first_referral_pro',
            tokens_awarded=1,
            tier_before=tier_before,
            tier_after=sharer.tier,
            referral_id=referral.id
        )
        db.session.add(reward)
        db.session.commit()
        
        print(f"[Affiliate] First referral reward: User {sharer.id} upgraded to {sharer.tier} with +1 token")
        return True, 'first_referral_pro', f"Upgraded to PRO and received 1 token"
    
    else:
        # Subsequent referral: just +1 token
        sharer.credits = (sharer.credits or 0) + 1
        
        reward = AffiliateReward(
            user_id=sharer.id,
            reward_type='referral_token',
            tokens_awarded=1,
            tier_before=tier_before,
            tier_after=sharer.tier,
            referral_id=referral.id
        )
        db.session.add(reward)
        db.session.commit()
        
        print(f"[Affiliate] Referral token reward: User {sharer.id} received +1 token")
        return True, 'referral_token', "Received 1 token"


def process_purchase_reward(referred_user_id, plan_type):
    """
    Process VIP upgrade when a referred user makes a purchase.
    
    Returns (reward_given, message) or (False, reason)
    """
    from models import User
    
    # Find the referral record
    referral = AffiliateReferral.query.filter_by(referred_id=referred_user_id).first()
    if not referral:
        return False, "No referral record found"
    
    # Check if already rewarded for purchase
    existing_vip_reward = AffiliateReward.query.filter_by(
        referral_id=referral.id,
        reward_type='vip_upgrade'
    ).first()
    if existing_vip_reward:
        return False, "VIP upgrade already awarded for this referral"
    
    # Update referral with purchase info
    referral.purchase_tier = plan_type
    referral.purchase_at = datetime.utcnow()
    
    # Get sharer
    sharer = User.query.get(referral.sharer_id)
    if not sharer:
        db.session.commit()
        return False, "Sharer not found"
    
    tier_before = sharer.tier
    
    # Upgrade sharer to VIP
    if sharer.tier != 'VIP':
        sharer.tier = 'VIP'
        
        reward = AffiliateReward(
            user_id=sharer.id,
            reward_type='vip_upgrade',
            tokens_awarded=0,
            tier_before=tier_before,
            tier_after='VIP',
            referral_id=referral.id
        )
        db.session.add(reward)
        db.session.commit()
        
        print(f"[Affiliate] VIP upgrade reward: User {sharer.id} upgraded to VIP")
        return True, "Upgraded to VIP"
    
    db.session.commit()
    return False, "Sharer already VIP"


def get_affiliate_stats(user_id):
    """Get affiliate dashboard statistics for a user."""
    link = AffiliateLink.query.filter_by(user_id=user_id).first()
    
    stats = {
        'affiliate_code': link.code if link else None,
        'total_visits': 0,
        'total_emails': 0,
        'total_referrals': 0,
        'verified_referrals': 0,
        'purchase_referrals': 0,
        'total_tokens_earned': 0,
        'rewards': []
    }
    
    if link:
        stats['total_visits'] = AffiliateVisit.query.filter_by(affiliate_link_id=link.id).count()
    
    stats['total_emails'] = AffiliateEmailList.query.filter_by(user_id=user_id).count()
    
    referrals = AffiliateReferral.query.filter_by(sharer_id=user_id).all()
    stats['total_referrals'] = len(referrals)
    stats['verified_referrals'] = sum(1 for r in referrals if r.email_verified)
    stats['purchase_referrals'] = sum(1 for r in referrals if r.purchase_tier)
    
    rewards = AffiliateReward.query.filter_by(user_id=user_id).all()
    stats['total_tokens_earned'] = sum(r.tokens_awarded for r in rewards)
    stats['rewards'] = [
        {
            'type': r.reward_type,
            'tokens': r.tokens_awarded,
            'tier_before': r.tier_before,
            'tier_after': r.tier_after,
            'created_at': r.created_at.isoformat() if r.created_at else None
        }
        for r in rewards
    ]
    
    return stats


def get_referral_history(user_id):
    """Get detailed referral history for a user."""
    from models import User
    
    referrals = AffiliateReferral.query.filter_by(sharer_id=user_id).order_by(
        AffiliateReferral.created_at.desc()
    ).all()
    
    history = []
    for r in referrals:
        referred_user = User.query.get(r.referred_id)
        history.append({
            'id': r.id,
            'referred_email': referred_user.email if referred_user else 'Unknown',
            'referred_name': referred_user.name if referred_user else 'Unknown',
            'source': r.source,
            'email_verified': r.email_verified,
            'email_verified_at': r.email_verified_at.isoformat() if r.email_verified_at else None,
            'purchase_tier': r.purchase_tier,
            'purchase_at': r.purchase_at.isoformat() if r.purchase_at else None,
            'created_at': r.created_at.isoformat() if r.created_at else None
        })
    
    return history
