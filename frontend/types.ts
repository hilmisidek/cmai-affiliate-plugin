/** Shared types for the Affiliate System Plugin. */

export interface User {
    id: string | number;
    email: string;
    name: string;
    credits: number;
    tier: 'FREE' | 'PRO' | 'VIP' | string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface AuditResult {
    id: number;
    score: number;
    timestamp: string;
    failures: Array<{ issue: string; recommendation: string }>;
    submitted_copy?: string;
    rewrites?: Array<{ trigger?: string; copy: string }>;
}

export interface ApiError {
    message: string;
    code?: string;
    error?: string;
}
