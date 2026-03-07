import React, { useState } from 'react';
import { Share2, Copy, Check, Users, Lock, Globe } from 'lucide-react';
import api from '../services/api';

const ShareModal = ({ isOpen, onClose, documentId, isPublic, shareToken, collaborators, onUpdate }) => {
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [inviteError, setInviteError] = useState(null);

    if (!isOpen) return null;

    const shareUrl = `${window.location.origin}/document/${documentId}?share=${shareToken || ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const togglePublicShare = async () => {
        setLoading(true);
        try {
            if (isPublic) {
                await api.post(`/documents/${documentId}/unshare`);
                onUpdate({ isPublic: false });
            } else {
                const { data } = await api.post(`/documents/${documentId}/share`);
                onUpdate({ isPublic: true, shareToken: data.shareToken });
            }
        } catch (error) {
            console.error('Error toggling share:', error);
        }
        setLoading(false);
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        setInviteError(null);
        try {
            const { data } = await api.post(`/documents/${documentId}/invite`, { email });
            onUpdate({ collaborators: data });
            setEmail('');
        } catch (error) {
            console.error('Error inviting user:', error);
            setInviteError(error.response?.data?.message || 'Failed to invite user');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl border border-white/10 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-primary-400" />
                            Share Document
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Section 1: Public Link */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPublic ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">Public Access</h3>
                                    <p className="text-xs text-slate-400">
                                        {isPublic ? 'Anyone with the link can view' : 'Only invited people can access'}
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isPublic}
                                    onChange={togglePublicShare}
                                    disabled={loading}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>

                        {isPublic && (
                            <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="bg-transparent flex-1 text-sm text-slate-300 focus:outline-none truncate px-2"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-primary-400"
                                    title="Copy Link"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Invite People */}
                    <div>
                        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary-400" />
                            Invite Collaborators
                        </h3>
                        <form onSubmit={handleInvite} className="flex gap-2 mb-4">
                            <input
                                type="email"
                                placeholder="Enter email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary-500/50 transition-colors"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                            >
                                Invite
                            </button>
                        </form>

                        {inviteError && (
                            <p className="text-red-400 text-xs mb-4">{inviteError}</p>
                        )}

                        {/* Collaborators List */}
                        <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                            {collaborators && collaborators.length > 0 ? (
                                collaborators.map((collab) => (
                                    <div key={collab._id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 uppercase">
                                            {collab.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-sm text-white font-medium">{collab.name}</p>
                                            <p className="text-xs text-slate-500">{collab.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 text-center py-2">No collaborators yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
