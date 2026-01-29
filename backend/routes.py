"""Affiliate system API routes."""
from flask import request, jsonify, g
from urllib.parse import unquote
from affiliate import affiliate_bp
from affiliate.models import AffiliateEmailList
from affiliate.services import (
    get_or_create_affiliate_link,
    track_affiliate_visit,
    add_marketing_email,
    remove_marketing_email,
    get_marketing_emails,
    send_all_marketing_emails,
    send_marketing_email_to_address,
    get_affiliate_stats,
    get_referral_history
)
from utils import token_required


@affiliate_bp.route('/link', methods=['GET'])
@token_required
def get_affiliate_link():
    """Get the current user's affiliate link."""
    user = g.user
    link = get_or_create_affiliate_link(user.id)
    
    from flask import current_app
    domain = current_app.config.get('DOMAIN', 'http://localhost:5000')
    full_url = f"{domain}/?ref={link.code}"
    
    return jsonify({
        'code': link.code,
        'url': full_url
    }), 200


@affiliate_bp.route('/track', methods=['POST'])
def track_visit():
    """Track an affiliate link visit (public endpoint)."""
    data = request.get_json() or {}
    code = data.get('code')
    
    if not code:
        return jsonify({'message': 'Affiliate code required'}), 400
    
    visitor_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    
    link = track_affiliate_visit(code, visitor_ip, user_agent)
    
    if link:
        return jsonify({'message': 'Visit tracked', 'valid': True}), 200
    else:
        return jsonify({'message': 'Invalid affiliate code', 'valid': False}), 404


@affiliate_bp.route('/emails', methods=['GET'])
@token_required
def list_marketing_emails():
    """Get user's marketing email list."""
    user = g.user
    emails = get_marketing_emails(user.id)
    
    return jsonify({
        'emails': [
            {
                'email': e.email,
                'sent_at': e.sent_at.isoformat() if e.sent_at else None,
                'created_at': e.created_at.isoformat() if e.created_at else None
            }
            for e in emails
        ]
    }), 200


@affiliate_bp.route('/emails', methods=['POST'])
@token_required
def add_email():
    """Add email(s) to marketing list."""
    user = g.user
    data = request.get_json() or {}
    
    # Accept single email or list of emails
    emails = data.get('emails', [])
    if isinstance(emails, str):
        emails = [emails]
    
    # Also accept 'email' for single entry
    if not emails and data.get('email'):
        emails = [data.get('email')]
    
    if not emails:
        return jsonify({'message': 'At least one email is required'}), 400
    
    results = []
    for email in emails:
        success, msg = add_marketing_email(user.id, email)
        results.append({'email': email, 'success': success, 'message': msg})
    
    all_success = all(r['success'] for r in results)
    
    return jsonify({
        'results': results,
        'all_success': all_success
    }), 200 if all_success else 207  # 207 Multi-Status


@affiliate_bp.route('/emails/<path:email>', methods=['DELETE'])
@token_required
def delete_email(email):
    """Remove an email from marketing list."""
    email = unquote(email)
    print(f"DEBUG: Affiliate delete_email called for: {email}")
    user = g.user
    
    success = remove_marketing_email(user.id, email)
    
    if success:
        return jsonify({'message': 'Email removed'}), 200
    else:
        return jsonify({'message': 'Email not found in your list'}), 404


@affiliate_bp.route('/send-emails', methods=['POST'])
@token_required
def send_emails():
    """Send marketing emails to all addresses in user's list."""
    user = g.user
    
    emails = get_marketing_emails(user.id)
    if not emails:
        return jsonify({'message': 'No emails in your list'}), 400
    
    results = send_all_marketing_emails(user.id, user.name)
    
    sent_count = sum(1 for r in results if r['success'])
    
    return jsonify({
        'message': f'Sent {sent_count} of {len(results)} emails',
        'results': results
    }), 200


@affiliate_bp.route('/send-email', methods=['POST'])
@token_required
def send_single_email():
    """Send marketing email to a single address."""
    user = g.user
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    success, msg = send_marketing_email_to_address(user.id, email, user.name)
    
    if success:
        return jsonify({'message': msg}), 200
    else:
        return jsonify({'message': msg}), 500


@affiliate_bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    """Get affiliate dashboard statistics."""
    user = g.user
    
    stats = get_affiliate_stats(user.id)
    history = get_referral_history(user.id)
    
    # Build full affiliate URL
    from flask import current_app
    domain = current_app.config.get('DOMAIN', 'http://localhost:5000')
    if stats['affiliate_code']:
        stats['affiliate_url'] = f"{domain}/?ref={stats['affiliate_code']}"
    else:
        # Generate link if not exists
        link = get_or_create_affiliate_link(user.id)
        stats['affiliate_code'] = link.code
        stats['affiliate_url'] = f"{domain}/?ref={link.code}"
    
    return jsonify({
        'stats': stats,
        'referrals': history
    }), 200
