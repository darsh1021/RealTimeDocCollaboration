import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Trash2, Edit2, ExternalLink, Shield, Users } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const DocumentCard = ({ document, onDelete, onUpdate }) => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(document.title);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false); // Guard against double submissions

    // Check if current user is owner
    // Note: Assuming backend populates owner field with user object, check if _id matches
    // Or if backend returns owner ID, check against that.
    // Handling typical populated vs raw ID scenarios safely.
    const isOwner = document.owner === user._id || document.owner?._id === user._id;

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${document.title}"?`)) {
            setIsDeleting(true);
            try {
                await api.delete(`/documents/${document._id}`);
                onDelete(document._id);
            } catch (error) {
                console.error('Error deleting document:', error);
                alert('Failed to delete document');
                setIsDeleting(false);
            }
        }
    };

    const handleTitleUpdate = async (e) => {
        if (e) e.stopPropagation();
        if (isUpdating) return;

        if (title.trim() === '') {
            setTitle(document.title);
            setIsEditing(false);
            return;
        }

        // Only update if changed
        if (title === document.title) {
            setIsEditing(false);
            return;
        }

        setIsUpdating(true);
        try {
            const { data } = await api.put(`/documents/${document._id}`, { title });
            onUpdate(document._id, data);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating title:', error);
            // Don't show alert for minor issues, might be network glitch
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCardClick = () => {
        if (!isEditing) {
            navigate(`/document/${document._id}`);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMins = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMs / 3600000);
        const diffInDays = Math.floor(diffInMs / 86400000);

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            onClick={handleCardClick}
            className={`group glass rounded-2xl p-6 border border-white/10 hover:border-primary-500/30 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOwner ? 'bg-primary-500/20' : 'bg-blue-500/20'}`}>
                        <FileText className={`w-5 h-5 ${isOwner ? 'text-primary-400' : 'text-blue-400'}`} />
                    </div>
                    {isEditing ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={(e) => handleTitleUpdate(e)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault(); // Prevent default form submission or newline
                                    handleTitleUpdate(e);
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setTitle(document.title);
                                    setIsEditing(false);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-white/5 border border-primary-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-lg font-semibold text-white truncate flex-1 group-hover:text-primary-400 transition-colors">
                            {document.title}
                        </h3>
                    )}
                </div>

                {isOwner && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditing(true);
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Rename"
                        >
                            <Edit2 className="w-4 h-4 text-slate-400 hover:text-primary-400" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(document.updatedAt)}</span>
                </div>

                {isOwner ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                        <Shield className="w-3 h-3" />
                        Owner
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Users className="w-3 h-3" />
                        Shared
                    </span>
                )}
            </div>

            {/* Preview snippet */}
            <div className="pt-4 border-t border-white/5 relative">
                <p className="text-sm text-slate-500 line-clamp-2">
                    {typeof document.content === 'string' ? document.content : 'No content yet...'}
                </p>

                <div className="absolute right-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0f172a] pl-2">
                    <div className="flex items-center gap-1 text-primary-400">
                        <span className="text-xs font-medium">Open</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentCard;
