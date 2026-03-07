import React, { useEffect, useState } from 'react';
import { History, RotateCcw, ArrowRight, Edit3, RefreshCw, Type } from 'lucide-react';
import api from '../services/api';

const ACTION_META = {
    edit: {
        label: 'edited the document',
        icon: Edit3,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20'
    },
    restore: {
        label: 'restored a previous version',
        icon: RefreshCw,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
    },
    rename: {
        label: 'renamed the document',
        icon: Type,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
    }
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const VersionHistoryPanel = ({ isOpen, onClose, documentId, onRestore, isOwner }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [restoring, setRestoring] = useState(false);
    const [restoreSuccess, setRestoreSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchVersions();
            setRestoreSuccess(false);
        }
    }, [isOpen, documentId]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/documents/${documentId}/versions`);
            setVersions(data);
            if (data.length > 0) setSelectedVersion(data[0]);
        } catch (error) {
            console.error('Error fetching versions:', error);
        }
        setLoading(false);
    };

    const handleRestore = async () => {
        if (!selectedVersion) return;
        setRestoring(true);
        try {
            const { data } = await api.post(`/documents/${documentId}/restore/${selectedVersion._id}`);
            onRestore(data.content);
            setRestoreSuccess(true);
            setTimeout(() => {
                onClose();
                setRestoreSuccess(false);
            }, 1200);
        } catch (error) {
            console.error('Error restoring version:', error);
            alert(error.response?.data?.message || 'Failed to restore version');
        }
        setRestoring(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Slide-in Panel */}
            <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#1a2236] shadow-2xl z-50 border-l border-white/10 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
                            <History className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Version History</h2>
                            <p className="text-xs text-slate-500">{versions.length} snapshot{versions.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Close"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Version List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                            <History className="w-8 h-8 opacity-30" />
                            <p className="text-sm">No history available yet.</p>
                            <p className="text-xs text-slate-600">Edits will appear here after saving.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2">
                            {versions.map((version, idx) => {
                                const meta = ACTION_META[version.action] || ACTION_META.edit;
                                const ActionIcon = meta.icon;
                                const isSelected = selectedVersion?._id === version._id;

                                return (
                                    <div
                                        key={version._id}
                                        onClick={() => setSelectedVersion(version)}
                                        className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-150
                                            ${isSelected
                                                ? 'bg-primary-500/10 border-primary-500/40 shadow-md shadow-primary-500/10'
                                                : 'bg-white/3 border-white/5 hover:bg-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Action Icon */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg} border ${meta.border}`}>
                                                <ActionIcon className={`w-4 h-4 ${meta.color}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-sm font-semibold text-white truncate">
                                                        {version.createdByName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                                                        {formatDate(version.createdAt)}
                                                    </span>
                                                </div>
                                                <p className={`text-xs mb-2 ${meta.color}`}>{meta.label}</p>

                                                {/* Preview snippet */}
                                                {version.preview && (
                                                    <p className="text-xs text-slate-500 font-mono bg-black/30 rounded-lg px-2.5 py-1.5 line-clamp-2 leading-relaxed">
                                                        {version.preview || '(empty document)'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Latest badge */}
                                        {idx === 0 && (
                                            <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                                                LATEST
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer — Restore Action */}
                <div className="p-5 border-t border-white/10 bg-[#0f172a] flex-shrink-0">
                    {restoreSuccess ? (
                        <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 font-semibold text-sm">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            Version restored successfully!
                        </div>
                    ) : selectedVersion ? (
                        <div>
                            <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-400 font-medium">Selected version</p>
                                    <p className="text-sm text-white font-semibold truncate">
                                        by {selectedVersion.createdByName}
                                    </p>
                                    <p className="text-xs text-slate-500">{formatDate(selectedVersion.createdAt)}</p>
                                </div>
                            </div>

                            {isOwner ? (
                                <button
                                    onClick={handleRestore}
                                    disabled={restoring}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {restoring ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <RotateCcw className="w-4 h-4" />
                                            Restore This Version
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="text-center py-2 px-4 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-500">Only the document owner can restore versions.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-2">Select a version to restore</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default VersionHistoryPanel;
