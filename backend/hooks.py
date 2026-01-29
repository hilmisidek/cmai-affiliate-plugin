"""Affiliate system event hooks.

These functions should be called from existing code at appropriate points:
- on_user_registered: After a new user is created (before email verification)
- on_email_verified: After a user verifies their email
- on_payment_success: After a successful payment
"""
from affiliate.services import (
    match_registration_to_affiliate,
    create_referral,
    process_email_verified_reward,
    process_purchase_reward
)


def on_user_registered(user_id, user_email, affiliate_code=None):
    """
    Called when a new user registers.
    Checks if they came from an affiliate link or match an email list.
    Creates a referral record if so.
    
    Args:
        user_id: The newly registered user's ID
        user_email: The newly registered user's email
        affiliate_code: The affiliate code from URL query param (if any)
    
    Returns:
        (sharer_id, source) if matched, (None, None) otherwise
    """
    sharer_id, source = match_registration_to_affiliate(user_email, affiliate_code)
    
    if sharer_id:
        # Don't let users refer themselves
        if sharer_id == user_id:
            print(f"[Affiliate] Ignoring self-referral for user {user_id}")
            return None, None
        
        referral = create_referral(sharer_id, user_id, source)
        print(f"[Affiliate] Created referral: sharer={sharer_id}, referred={user_id}, source={source}")
        return sharer_id, source
    
    return None, None


def on_email_verified(user_id):
    """
    Called when a user verifies their email.
    Awards rewards to the sharer if this user was referred:
    - First referral: PRO upgrade + 1 token
    - Subsequent referrals: +1 token only
    
    Args:
        user_id: The user who just verified their email
    
    Returns:
        (success, reward_type, message)
    """
    success, reward_type, message = process_email_verified_reward(user_id)
    
    if success:
        print(f"[Affiliate] Email verified reward processed for referred user {user_id}: {reward_type}")
    
    return success, reward_type, message


def on_payment_success(user_id, plan_type):
    """
    Called when a user makes a successful purchase.
    Awards VIP upgrade to the sharer if this user was referred.
    
    Args:
        user_id: The user who made the purchase
        plan_type: 'daypass', 'pro', or 'vip'
    
    Returns:
        (success, message)
    """
    if plan_type not in ['daypass', 'pro', 'vip']:
        return False, f"Invalid plan type: {plan_type}"
    
    success, message = process_purchase_reward(user_id, plan_type)
    
    if success:
        print(f"[Affiliate] Purchase reward processed for referred user {user_id}: {message}")
    
    return success, message
