import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Save, Users, Share2, MousePointer2, Lock, ShieldCheck, Globe, History } from 'lucide-react';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import { AuthContext } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import VersionHistoryPanel from '../components/VersionHistoryPanel';

const DocumentPage = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const shareToken = searchParams.get('share');
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // Document State
    const [document, setDocument] = useState(null);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permission, setPermission] = useState('viewer'); // 'owner', 'editor', 'viewer'

    // Sharing State
    const [showShareModal, setShowShareModal] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    // User Presence State
    const [activeUsers, setActiveUsers] = useState([]);
    const [cursors, setCursors] = useState({});
    const [typingUser, setTypingUser] = useState(null);

    // Current user random color for cursor
    const [myColor] = useState(() => {
        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e'];
        return colors[Math.floor(Math.random() * colors.length)];
    });

    const socket = useSocket();
    const contentRef = useRef("");
    const typingTimeoutRef = useRef(null);

    // Fetch Document and Check Permissions
    useEffect(() => {
        const fetchDocument = async () => {
            try {
                // Pass share token if available (for public access)
                const config = shareToken ? { params: { share: shareToken } } : {};
                const { data } = await api.get(`/documents/${id}`, config);

                setDocument(data);
                setContent(data.content || "");
                contentRef.current = data.content || "";

                // Determine permission level
                if (user && data.owner._id === user._id) {
                    setPermission('owner');
                } else if (user && data.collaborators.some(c => c._id === user._id)) {
                    setPermission('editor');
                } else if (data.isPublic && shareToken === data.shareToken) {
                    setPermission('editor');
                } else {
                    setPermission('viewer');
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching document:', error);
                if (error.response && error.response.status === 403) {
                    alert('You do not have permission to view this document.');
                    navigate('/dashboard');
                } else if (error.response && error.response.status === 401) {
                    navigate('/login');
                } else {
                    setLoading(false);
                }
            }
        };

        fetchDocument();
    }, [id, user, navigate, shareToken]);

    // Socket Connection & Presence Logic
    useEffect(() => {
        if (!socket || !id) return;

        // Use guest name if not logged in
        const username = user?.name || `Guest-${Math.floor(Math.random() * 1000)}`;

        socket.emit('join-document', {
            documentId: id,
            username: username,
            color: myColor
        });

        socket.on('users-update', (users) => {
            setActiveUsers(users);
        });

        socket.on('receive-changes', (newContent) => {
            setContent(newContent);
            contentRef.current = newContent;
        });

        socket.on('cursor-update', ({ socketId, x, y }) => {
            setCursors(prev => ({
                ...prev,
                [socketId]: { x, y }
            }));
        });

        socket.on('user-typing', (username) => {
            setTypingUser(username);
        });

        socket.on('user-stop-typing', () => {
            setTypingUser(null);
        });

        return () => {
            socket.off('users-update');
            socket.off('receive-changes');
            socket.off('cursor-update');
            socket.off('user-typing');
            socket.off('user-stop-typing');
        };
    }, [socket, id, user, myColor]);

    // Auto-save Interval — emits userId + userName for version attribution
    useEffect(() => {
        if (!socket || !id || permission === 'viewer') return;

        const interval = setInterval(() => {
            setSaving(true);
            socket.emit('save-document', {
                documentId: id,
                content: contentRef.current,
                userId: user?._id,
                userName: user?.name || 'Unknown'
            });
            setTimeout(() => setSaving(false), 800);
        }, 20000); // Every 20 seconds

        return () => clearInterval(interval);
    }, [socket, id, permission, user]);

    // Cursor Tracking
    const handleMouseMove = (e) => {
        if (!socket || !id) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        socket.emit('cursor-move', { documentId: id, x, y });
    };

    // Typing Indicator
    const handleTextChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);
        contentRef.current = newContent;

        if (socket && id) {
            socket.emit('send-changes', { documentId: id, content: newContent });

            const username = user?.name || 'Guest';
            socket.emit('typing', { documentId: id, username });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stop-typing', { documentId: id });
            }, 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!document) return null;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-primary-500/30">
            {/* Toolbar */}
            <header className="border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-white">{document.title}</span>
                                {permission === 'owner' ? (
                                    <span className="bg-primary-500/10 text-primary-400 text-[10px] px-2 py-0.5 rounded-full border border-primary-500/20 font-medium flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Owner
                                    </span>
                                ) : (
                                    <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 font-medium flex items-center gap-1">
                                        <Users className="w-3 h-3" /> {user ? 'Editor' : 'Guest'}
                                    </span>
                                )}
                                {document.isPublic && (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1" title="Public Link Active">
                                        <Globe className="w-3 h-3" /> Public
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 h-4">
                                {saving ? (
                                    <span className="text-[10px] text-primary-400 font-medium flex items-center gap-1 animation-pulse">
                                        <div className="w-1 h-1 bg-primary-400 rounded-full animate-ping"></div>
                                        Saving...
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                        Saved
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Users & Share */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex -space-x-2">
                            {activeUsers.slice(0, 5).map((u) => (
                                <div
                                    key={u.socketId}
                                    className="w-8 h-8 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold text-white shadow-lg relative cursor-default"
                                    style={{ backgroundColor: u.color }}
                                    title={u.username}
                                >
                                    {u.username.substring(0, 2).toUpperCase()}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowVersionHistory(true)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                            title="Version History"
                        >
                            <History className="w-5 h-5" />
                        </button>

                        {permission === 'owner' && (
                            <>
                                <div className="h-8 w-px bg-white/10 mx-2"></div>
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all shadow-lg shadow-primary-500/20 text-sm font-semibold hover:scale-105 active:scale-95"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Editor Area */}
            <main className="max-w-4xl mx-auto py-12 px-6 relative z-10">
                {/* Typing Indicator */}
                <div className="h-6 mb-2">
                    {typingUser && (
                        <div className="text-xs text-primary-400 font-medium animate-pulse flex items-center gap-2">
                            <div className="flex gap-0.5">
                                <div className="w-1 h-1 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1 h-1 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1 h-1 bg-primary-400 rounded-full animate-bounce"></div>
                            </div>
                            {typingUser} is typing...
                        </div>
                    )}
                </div>

                <div
                    className="glass rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 relative cursor-text min-h-[70vh]"
                    onMouseMove={handleMouseMove}
                >
                    {/* Render Other Users Cursors */}
                    {Object.entries(cursors).map(([socketId, pos]) => {
                        const cursorUser = activeUsers.find(u => u.socketId === socketId);
                        if (!cursorUser || socketId === socket?.id) return null;

                        return (
                            <div
                                key={socketId}
                                className="absolute pointer-events-none z-50 transition-all duration-150 ease-out"
                                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            >
                                <MousePointer2
                                    className="w-4 h-4"
                                    style={{ color: cursorUser.color, fill: cursorUser.color }}
                                />
                                <div
                                    className="ml-3 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-md opacity-80"
                                    style={{ backgroundColor: cursorUser.color }}
                                >
                                    {cursorUser.username}
                                </div>
                            </div>
                        );
                    })}

                    <textarea
                        className="w-full min-h-[70vh] p-12 bg-transparent text-slate-300 text-xl leading-relaxed resize-none focus:outline-none placeholder-slate-600"
                        placeholder="Start typing your ideas here..."
                        value={content}
                        onChange={handleTextChange}
                        disabled={permission === 'viewer'}
                    />
                </div>

                <div className="mt-8 flex items-center justify-between text-slate-500 text-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-slate-400">{activeUsers.length} Online</span>
                        </div>
                        {document.isPublic ? (
                            <span className="flex items-center gap-1 text-emerald-400/80">
                                <Globe className="w-3 h-3" />
                                Public Link Active
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3 text-slate-500" />
                                Private Document
                            </span>
                        )}
                    </div>
                </div>
            </main>

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    documentId={id}
                    isPublic={document.isPublic}
                    shareToken={document.shareToken}
                    collaborators={document.collaborators}
                    onUpdate={(updates) => setDocument(prev => ({ ...prev, ...updates }))}
                />
            )}

            {/* Version History Panel */}
            {showVersionHistory && (
                <VersionHistoryPanel
                    isOpen={showVersionHistory}
                    onClose={() => setShowVersionHistory(false)}
                    documentId={id}
                    isOwner={permission === 'owner'}
                    onRestore={(restoredContent) => {
                        setContent(restoredContent);
                        contentRef.current = restoredContent;
                        // Broadcast restored content to other connected clients via socket
                        if (socket) {
                            socket.emit('send-changes', { documentId: id, content: restoredContent });
                        }
                    }}
                />
            )}


            {/* Background Decorations */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]"></div>
            </div>
        </div>
    );
};

export default DocumentPage;
