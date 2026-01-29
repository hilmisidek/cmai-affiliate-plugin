"""Affiliate system blueprint initialization."""
from flask import Blueprint

affiliate_bp = Blueprint('affiliate', __name__, url_prefix='/affiliate')

# Import routes to register them with the blueprint
from affiliate import routes  # noqa: F401, E402
