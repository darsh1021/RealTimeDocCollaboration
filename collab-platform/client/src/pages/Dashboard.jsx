import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Sparkles, TrendingUp, Zap, Search, LogOut } from 'lucide-react';
import api from '../services/api';
import DocumentCard from '../components/DocumentCard';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data } = await api.get('/documents');
            setDocuments(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching documents:', error);
            setLoading(false);
        }
    };

    const handleCreateDocument = async () => {
        setCreating(true);
        try {
            const { data } = await api.post('/documents');
            navigate(`/document/${data._id}`);
        } catch (error) {
            console.error('Error creating document:', error);
            alert('Failed to create document. Please check if the server is running.');
            setCreating(false);
        }
    };

    const handleDeleteDocument = (documentId) => {
        setDocuments(documents.filter(doc => doc._id !== documentId));
    };

    const handleUpdateDocument = (documentId, updatedDoc) => {
        setDocuments(documents.map(doc =>
            doc._id === documentId ? updatedDoc : doc
        ));
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    // Header section update to include user info and logout
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            {/* Header */}
            <header className="border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Sparkles className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">CollabSync</h1>
                                <p className="text-xs text-slate-500">Welcome back, {user?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleCreateDocument}
                                disabled={creating}
                                className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">New Document</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="p-3 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-red-400"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="glass rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-primary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Documents</p>
                                <p className="text-2xl font-bold text-white">{documents.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Active Today</p>
                                <p className="text-2xl font-bold text-white">{documents.filter(doc => {
                                    const today = new Date();
                                    const updated = new Date(doc.updatedAt);
                                    return today.toDateString() === updated.toDateString();
                                }).length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Collaboration</p>
                                <p className="text-2xl font-bold text-white">Live</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Documents Section */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">Your Documents</h2>
                    <p className="text-sm text-slate-500">
                        {filteredDocuments.length === 0 && searchQuery
                            ? 'No documents match your search'
                            : `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''}`}
                    </p>
                </div>

                {/* Documents Grid */}
                {filteredDocuments.length === 0 && !searchQuery ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-12 h-12 text-slate-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No documents yet</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">
                            Create your first document to start collaborating in real-time with your team.
                        </p>
                        <button
                            onClick={handleCreateDocument}
                            disabled={creating}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-semibold transition-all shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Document
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {filteredDocuments.map((doc) => (
                            <DocumentCard
                                key={doc._id}
                                document={doc}
                                onDelete={handleDeleteDocument}
                                onUpdate={handleUpdateDocument}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Background Decorations */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]"></div>
            </div>
        </div>
    );
};

export default Dashboard;
