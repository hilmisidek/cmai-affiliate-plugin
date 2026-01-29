# AI Integration Guide: Affiliate System Plugin

This guide is intended for AI agents (like yourself) to help a developer integrate this Affiliate System Plugin into an existing Flask (backend) and React (frontend) application.

## 1. Backend Integration (Flask)

### Prerequisites
- Flask-SQLAlchemy
- A `User` model with at least: `id`, `email`, `name`, `credits`, `tier`.
- `resend` Python library for emails.

### Steps
1. **Copy Files**: Copy the `backend/` directory into the host project (e.g., into an `affiliate/` directory).
2. **Register Blueprint**:
   ```python
   from affiliate import affiliate_bp
   app.register_blueprint(affiliate_bp)
   ```
3. **Database Setup**:
   - The plugin expects a `db` instance from `extensions.py`. Ensure the host project has this or update the imports in `models.py` and `services.py`.
   - Run the SQL in `database/schema.sql` or use SQLAlchemy to create tables.
4. **Environment Variables**:
   Add these to the host's `.env`:
   - `RESEND_API_KEY`
   - `MAIL_DEFAULT_SENDER`
   - `DOMAIN` (e.g., `https://yourapp.com`)
5. **Connect Hooks**:
   In `backend/hooks.py`, you'll find functions to call during:
   - Registration (`match_registration_to_affiliate`, `create_referral`)
   - Email Verification (`process_email_verified_reward`)
   - Purchase (`process_purchase_reward`)

## 2. Frontend Integration (React)

### Prerequisites
- Tailwind CSS
- Lucide React (`lucide-react`)
- A shared API service or Axios instance.

### Steps
1. **Copy Component**: Copy `AffiliateDashboard.tsx` to your components folder.
2. **API Layer**:
   - Use `api_service_reference.ts` as a guide to implement fetch calls in your project's existing API service.
   - The dashboard expects an `api` object with methods like `getAffiliateDashboard()`, `addAffiliateEmail()`, etc.
3. **Routing**:
   - Add a route (e.g., `/dashboard/affiliate`) that renders `<AffiliateDashboard user={currentUser} />`.
4. **Tracking**:
   - On your landing page or entry point, check for the `ref` query parameter.
   - Call the `track` endpoint (provided in routes) to log the visit.

## 3. Reward System Logic
The plugin provides a tiered reward system:
- **First Referral**: Upgrades user to `PRO` and adds 1 token.
- **Subsequent Referrals**: Adds 1 token per verified signup.
- **Referral Purchase**: Upgrades user to `VIP`.

> [!TIP]
> When integrating, make sure to adjust the `User` model references in `services.py` if the host project's user model is named differently or located in a different path.
