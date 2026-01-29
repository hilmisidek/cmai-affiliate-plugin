import { AuthResponse, AuditResult } from './types';


// Use /api prefix for production (Vercel rewrites), fallback to localhost for dev
const BASE_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000');

class ApiService {
  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return this.handleResponse(res);
  }

  async register(username: string, password: string, name: string, email: string, affiliateCode?: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name, email, affiliate_code: affiliateCode }),
    });
    return this.handleResponse(res);
  }

  async auditCopy(copyText: string): Promise<AuditResult> {
    const res = await fetch(`${BASE_URL}/audit_copy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ copy: copyText }),
    });
    return this.handleResponse(res);
  }

  async createCheckoutSession(plan: 'pro' | 'vip' | 'daypass'): Promise<{ url: string }> {
    const res = await fetch(`${BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ plan }),
    });
    return this.handleResponse(res);
  }

  async getCurrentUser(): Promise<{ user: any }> {
    const res = await fetch(`${BASE_URL}/user/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async verifyEmail(token: string): Promise<{ message: string; verified: boolean }> {
    const res = await fetch(`${BASE_URL}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return this.handleResponse(res);
  }

  async resendVerification(email: string): Promise<{ message: string; email_sent: boolean }> {
    const res = await fetch(`${BASE_URL}/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.handleResponse(res);
  }

  async getAuditHistory(page: number = 1, perPage: number = 10): Promise<{
    audits: Array<{
      id: number;
      score: number;
      timestamp: string;
      failures: Array<{ issue: string; recommendation: string }>;
      submitted_copy?: string;
      rewrites?: Array<{ trigger?: string; copy: string }>;
    }>;
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const res = await fetch(`${BASE_URL}/audit_history?page=${page}&per_page=${perPage}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async getCourses(): Promise<{
    courses: Array<{
      id: number;
      title: string;
      description: string;
      filename: string;
      duration: string;
    }>;
  }> {
    const res = await fetch(`${BASE_URL}/courses`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  downloadCourse(courseId: number): void {
    const token = localStorage.getItem('token');
    const url = `${BASE_URL}/courses/${courseId}/download`;

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');

    // Add authorization header via fetch and create blob URL
    fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(err => console.error('Download failed:', err));
  }

  async getCourseContent(courseId: number): Promise<{
    id: number;
    title: string;
    description: string;
    html_content: string;
    duration: string;
  }> {
    const res = await fetch(`${BASE_URL}/courses/${courseId}/content`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async getGlobalPoolStatus() {
    const res = await fetch(`${BASE_URL}/global_pool_status`, {
      method: 'GET',
    });
    return this.handleResponse(res);
  }

  async cancelSubscription(): Promise<{ message: string; cancel_at: number; subscription_status: string }> {
    const res = await fetch(`${BASE_URL}/cancel-subscription`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async requestPasswordReset(email: string): Promise<{ message: string; email_sent: boolean }> {
    const res = await fetch(`${BASE_URL}/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.handleResponse(res);
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    return this.handleResponse(res);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return this.handleResponse(res);
  }

  // ==================== Affiliate API ====================

  async getAffiliateLink(): Promise<{ code: string; url: string }> {
    const res = await fetch(`${BASE_URL}/affiliate/link`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async getAffiliateDashboard(): Promise<{
    stats: {
      affiliate_code: string;
      affiliate_url: string;
      total_visits: number;
      total_emails: number;
      total_referrals: number;
      verified_referrals: number;
      purchase_referrals: number;
      total_tokens_earned: number;
      rewards: Array<{
        type: string;
        tokens: number;
        tier_before: string | null;
        tier_after: string | null;
        created_at: string | null;
      }>;
    };
    referrals: Array<{
      id: number;
      referred_email: string;
      referred_name: string;
      source: 'link' | 'email';
      email_verified: boolean;
      email_verified_at: string | null;
      purchase_tier: string | null;
      purchase_at: string | null;
      created_at: string;
    }>;
  }> {
    const res = await fetch(`${BASE_URL}/affiliate/dashboard`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async getAffiliateEmails(): Promise<{
    emails: Array<{
      email: string;
      sent_at: string | null;
      created_at: string;
    }>;
  }> {
    const res = await fetch(`${BASE_URL}/affiliate/emails`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async addAffiliateEmail(email: string): Promise<{
    results: Array<{ email: string; success: boolean; message: string }>;
    all_success: boolean;
  }> {
    const res = await fetch(`${BASE_URL}/affiliate/emails`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email }),
    });
    return this.handleResponse(res);
  }

  async removeAffiliateEmail(email: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/affiliate/emails/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async sendAffiliateEmails(): Promise<{
    message: string;
    results: Array<{ email: string; success: boolean; message: string }>;
  }> {
    const res = await fetch(`${BASE_URL}/affiliate/send-emails`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async trackAffiliateVisit(code: string): Promise<{ message: string; valid: boolean }> {
    const res = await fetch(`${BASE_URL}/affiliate/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return this.handleResponse(res);
  }

  private async handleResponse(res: Response) {
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const error: any = new Error('RATE_LIMIT_EXCEEDED');
        error.retryAfter = retryAfter ? parseInt(retryAfter, 10) : 600; // Default to 10 minutes if missing
        throw error;
      }
      // Preserve error code if present
      const error: any = new Error(data.message || data.error || 'An unexpected error occurred');
      if (data.code) error.code = data.code;
      if (data.email) error.email = data.email; // Pass email if returned by backend
      throw error;
    }
    return data;
  }
}

export const api = new ApiService();
