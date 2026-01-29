# Affiliate System Plugin 🚀

This is a standalone extraction of the https://copymindset.com Affiliate System, designed to be integrated into any Flask/React project.

## Project Structure

```text
affiliate-plugin/
├── backend/            # Flask Blueprint & Services
│   ├── __init__.py     # Blueprint definition
│   ├── models.py       # SQLAlchemy models
│   ├── routes.py       # API endpoints (add/delete emails, track visits)
│   ├── services.py     # Business logic (reward processing, link generation)
│   └── hooks.py        # Event handlers for registration/payment
├── frontend/           # React Components
│   ├── AffiliateDashboard.tsx  # Full-featured dashboard (Tailwind + Lucide)
│   └── api_service_reference.ts # Reference for API calls
└── database/
    └── schema.sql      # Raw SQL for table creation
```

## Integration Steps

### 1. Backend Integration (Flask)
- Copy the `backend/` folder into your Python project.
- Register the blueprint in your `app.py` or `routes/__init__.py`:
  ```python
  from affiliate import affiliate_bp
  app.register_blueprint(affiliate_bp)
  ```
- Ensure your `User` model matches the expectations (specifically the `id`, `email`, `name`, `credits`, and `tier` columns).

### 2. Frontend Integration (React)
- Copy `AffiliateDashboard.tsx` to your components folder.
- Ensure you have `lucide-react` and `Tailwind CSS` installed.
- Update the `api` imports in the component to match your project's service layer.
- Use `api_service_reference.ts` to implement the necessary fetch calls.

### 3. Database
- Run `database/schema.sql` against your PostgreSQL database to create the necessary tables.

## Environment Variables

### Backend (.env)
Required for email delivery and link generation:
- `RESEND_API_KEY`: Your Resend API key.
- `MAIL_DEFAULT_SENDER`: The email address to send invites from (must be verified in Resend).
- `DOMAIN`: The base URL of your application (e.g., `http://localhost:3000` or `https://your-app.com`).
- `SQLALCHEMY_DATABASE_URI`: Your PostgreSQL connection string.
- `SECRET_KEY`: A secure random string for Flask sessions.

### Frontend (.env)
- `VITE_API_URL`: (Optional) The URL of your backend API if running on a different port/domain.

## Features Included
- **Referral Link Tracking**: Automated unique code generation and visit logging.
- **Email Invitations**: Users can add, delete, and batch-send marketing emails.
- **Optimistic UI**: Pre-built logic for instant UI updates and background synchronization.
- **Reward Logic**: Hooks for awarding tokens on verification and upgrades on purchase.

## Dependencies
- Backend: `Flask`, `Flask-SQLAlchemy`, `resend` (for emails).
- Frontend: `React`, `Lucide-React`, `Tailwind CSS`.
