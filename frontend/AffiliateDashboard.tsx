import React, { useEffect, useState } from 'react';
import { User } from '../types';
import {
    Link,
    Mail,
    Copy,
    Check,
    Trash2,
    Send,
    Users,
    TrendingUp,
    Gift,
    UserPlus,
    ExternalLink,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { api } from '../services/api';

interface Props {
    user: User;
}

interface AffiliateStats {
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
}

interface Referral {
    id: number;
    referred_email: string;
    referred_name: string;
    source: 'link' | 'email';
    email_verified: boolean;
    email_verified_at: string | null;
    purchase_tier: string | null;
    purchase_at: string | null;
    created_at: string;
}

interface EmailEntry {
    email: string;
    sent_at: string | null;
    created_at: string;
    isPending?: boolean;
    isDeleting?: boolean;
}

export const AffiliateDashboard: React.FC<Props> = ({ user }) => {
    const [stats, setStats] = useState<AffiliateStats | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [emails, setEmails] = useState<EmailEntry[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [addingEmail, setAddingEmail] = useState(false);
    const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const [dashboardRes, emailsRes] = await Promise.all([
                api.getAffiliateDashboard(),
                api.getAffiliateEmails()
            ]);
            setStats(dashboardRes.stats);
            setReferrals(dashboardRes.referrals || []);
            setEmails(emailsRes.emails || []);
        } catch (err: any) {
            console.error('Failed to load affiliate dashboard:', err);
            setError(err.message || 'Failed to load affiliate data');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (stats?.affiliate_url) {
            await navigator.clipboard.writeText(stats.affiliate_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        const emailToAdd = newEmail.trim();
        if (!emailToAdd) return;

        setNewEmail('');
        setAddingEmail(true);
        setIsSyncing(true);
        setEmailError(null);

        // Optimistic UI update
        const optimisticEntry: EmailEntry = {
            email: emailToAdd,
            sent_at: null,
            created_at: new Date().toISOString(),
            isPending: true
        };
        setEmails(prev => [optimisticEntry, ...prev]);

        try {
            const result = await api.addAffiliateEmail(emailToAdd);
            if (result.all_success) {
                // Replace optimistic entry with real data
                const emailsRes = await api.getAffiliateEmails();
                setEmails(emailsRes.emails || []);
            } else {
                setEmailError(result.results?.[0]?.message || 'Failed to add email');
                // Remove optimistic entry on failure
                setEmails(prev => prev.filter(e => e.email !== emailToAdd));
            }
        } catch (err: any) {
            setEmailError(err.message || 'Failed to add email');
            setEmails(prev => prev.filter(e => e.email !== emailToAdd));
        } finally {
            setAddingEmail(false);
            setIsSyncing(false);
        }
    };

    const handleRemoveEmail = async () => {
        if (!emailToDelete) return;

        const targetEmail = emailToDelete;
        setShowDeleteConfirm(false);
        setEmailToDelete(null);
        setIsSyncing(true);

        // Mark as deleting optimistically
        setEmails(prev => prev.map(e =>
            e.email === targetEmail ? { ...e, isDeleting: true } : e
        ));

        try {
            await api.removeAffiliateEmail(targetEmail);
            // Real removal
            setEmails(prev => prev.filter(e => e.email !== targetEmail));
        } catch (err: any) {
            console.error('Failed to remove email:', err);
            // Revert isDeleting state on error
            setEmails(prev => prev.map(e =>
                e.email === targetEmail ? { ...e, isDeleting: false } : e
            ));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSendEmails = async () => {
        if (emails.length === 0) return;

        setSendingEmails(true);
        try {
            await api.sendAffiliateEmails();
            // Refresh emails to show sent_at
            const emailsRes = await api.getAffiliateEmails();
            setEmails(emailsRes.emails || []);
        } catch (err: any) {
            console.error('Failed to send emails:', err);
        } finally {
            setSendingEmails(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20" data-testid="affiliate-loading">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12" data-testid="affiliate-error">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-400">{error}</p>
                <button
                    onClick={loadDashboard}
                    className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                    data-testid="affiliate-retry-btn"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" data-testid="affiliate-dashboard">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Affiliate Program</h2>
                    <p className="text-slate-400 text-sm">Invite friends and earn rewards</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-card border border-slate-700 rounded-xl p-4 text-center" data-testid="affiliate-stat-visits">
                    <TrendingUp className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white" data-testid="affiliate-visits-count">{stats?.total_visits || 0}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Link Visits</div>
                </div>
                <div className="bg-dark-card border border-slate-700 rounded-xl p-4 text-center" data-testid="affiliate-stat-referrals">
                    <UserPlus className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white" data-testid="affiliate-referrals-count">{stats?.verified_referrals || 0}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Verified Referrals</div>
                </div>
                <div className="bg-dark-card border border-slate-700 rounded-xl p-4 text-center" data-testid="affiliate-stat-purchases">
                    <Gift className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white" data-testid="affiliate-purchases-count">{stats?.purchase_referrals || 0}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Purchases</div>
                </div>
                <div className="bg-dark-card border border-slate-700 rounded-xl p-4 text-center" data-testid="affiliate-stat-tokens">
                    <Gift className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white" data-testid="affiliate-tokens-count">{stats?.total_tokens_earned || 0}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Tokens Earned</div>
                </div>
            </div>

            {/* Rewards Info */}
            <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-xl p-4">
                <h3 className="text-teal-400 font-semibold mb-2 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    How Rewards Work
                </h3>
                <ul className="text-sm text-slate-300 space-y-1">
                    <li>• <span className="text-teal-400 font-medium">First referral:</span> Get upgraded to PRO + 1 free token</li>
                    <li>• <span className="text-teal-400 font-medium">Every referral:</span> Earn 1 token per verified signup</li>
                    <li>• <span className="text-teal-400 font-medium">Referral purchases:</span> Get upgraded to VIP when they buy</li>
                </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Your Affiliate Link */}
                <div className="bg-dark-card border border-slate-700 rounded-xl p-6 space-y-4">
                    <h3 className="text-slate-200 font-semibold flex items-center gap-2">
                        <Link className="w-5 h-5 text-brand-500" />
                        Your Affiliate Link
                    </h3>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={stats?.affiliate_url || ''}
                            className="flex-1 bg-dark-input border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono truncate"
                            data-testid="affiliate-link-input"
                        />
                        <button
                            onClick={handleCopyLink}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-brand-500 hover:bg-brand-600 text-white'
                                }`}
                            data-testid="affiliate-copy-btn"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500">
                        Share this link with friends. When they sign up, you'll earn rewards!
                    </p>
                </div>

                {/* Email Marketing */}
                <div className="bg-dark-card border border-slate-700 rounded-xl p-6 space-y-4">
                    <h3 className="text-slate-200 font-semibold flex items-center gap-2">
                        <Mail className="w-5 h-5 text-brand-500" />
                        Email Invitations
                    </h3>

                    <form onSubmit={handleAddEmail} className="flex gap-2">
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="friend@example.com"
                            className="flex-1 bg-dark-input border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                            data-testid="affiliate-email-input"
                        />
                        <button
                            type="submit"
                            disabled={addingEmail || !newEmail.trim()}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            data-testid="affiliate-add-email-btn"
                        >
                            {addingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                        </button>
                    </form>

                    {emailError && (
                        <p className="text-red-400 text-xs" data-testid="affiliate-email-error">{emailError}</p>
                    )}

                    {/* Email List */}
                    <div className="max-h-32 overflow-y-auto space-y-2" data-testid="affiliate-email-list">
                        {emails.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-2">No emails added yet</p>
                        ) : (
                            emails.map((entry, idx) => (
                                <div
                                    className={`flex items-center justify-between bg-dark-input/50 rounded-lg px-3 py-2 transition-opacity ${entry.isPending || entry.isDeleting ? 'opacity-60' : ''}`}
                                    data-testid={`affiliate-email-item-${idx}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                                        <span className="text-sm text-slate-300 truncate">{entry.email}</span>
                                        {entry.sent_at ? (
                                            <span className="text-xs text-green-400 shrink-0">✓ Sent</span>
                                        ) : entry.isPending ? (
                                            <span className="text-xs text-slate-500 shrink-0 animate-pulse">Syncing...</span>
                                        ) : null}
                                    </div>
                                    {entry.isDeleting ? (
                                        <div className="p-1">
                                            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setEmailToDelete(entry.email);
                                                setShowDeleteConfirm(true);
                                            }}
                                            disabled={isSyncing}
                                            className="text-slate-500 hover:text-red-400 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                            data-testid={`affiliate-remove-email-${idx}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {emails.length > 0 && (
                        <button
                            onClick={handleSendEmails}
                            disabled={sendingEmails || isSyncing}
                            className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isSyncing ? 'bg-slate-700 text-slate-400' : 'bg-teal-500 hover:bg-teal-600 text-white'} disabled:opacity-50`}
                            data-testid="affiliate-send-all-btn"
                        >
                            {sendingEmails || isSyncing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            {isSyncing ? 'Syncing email list...' : `Send Invitations (${emails.filter(e => !e.sent_at && !e.isPending).length} unsent)`}
                        </button>
                    )}
                </div>
            </div>

            {/* Referral History */}
            <div className="bg-dark-card border border-slate-700 rounded-xl p-6">
                <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-500" />
                    Referral History
                </h3>

                {referrals.length === 0 ? (
                    <div className="text-center py-8 text-slate-500" data-testid="affiliate-no-referrals">
                        <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No referrals yet. Share your link to get started!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto" data-testid="affiliate-referrals-table">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-left border-b border-slate-700">
                                    <th className="pb-3 font-medium">User</th>
                                    <th className="pb-3 font-medium">Source</th>
                                    <th className="pb-3 font-medium">Verified</th>
                                    <th className="pb-3 font-medium">Purchase</th>
                                    <th className="pb-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals.map((ref, idx) => (
                                    <tr
                                        key={ref.id}
                                        className="border-b border-slate-700/50"
                                        data-testid={`affiliate-referral-row-${idx}`}
                                    >
                                        <td className="py-3">
                                            <div>
                                                <div className="text-white font-medium">{ref.referred_name}</div>
                                                <div className="text-slate-500 text-xs">{ref.referred_email}</div>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${ref.source === 'link'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-purple-500/20 text-purple-400'
                                                }`}>
                                                {ref.source === 'link' ? (
                                                    <><ExternalLink className="w-3 h-3 inline mr-1" />Link</>
                                                ) : (
                                                    <><Mail className="w-3 h-3 inline mr-1" />Email</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            {ref.email_verified ? (
                                                <span className="text-green-400">✓ Yes</span>
                                            ) : (
                                                <span className="text-slate-500">Pending</span>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            {ref.purchase_tier ? (
                                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium uppercase">
                                                    {ref.purchase_tier}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-slate-400">
                                            {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-dark-card border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-500/20">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white text-center mb-2">Remove Email?</h3>
                            <p className="text-slate-400 text-center text-sm mb-6">
                                Are you sure you want to remove <span className="text-white font-medium">{emailToDelete}</span> from your invitation list?
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleRemoveEmail}
                                    className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
                                    data-testid="confirm-delete-btn"
                                >
                                    Remove Email
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setEmailToDelete(null);
                                    }}
                                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors"
                                    data-testid="cancel-delete-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
