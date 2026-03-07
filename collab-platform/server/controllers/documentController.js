const Document = require('../models/Document');
const User = require('../models/User');
const Version = require('../models/Version');
const crypto = require('crypto');

// --- Helper: Create Version ---
const createVersion = async (documentId, content, userId, userName, action = 'edit') => {
    try {
        const lastVersion = await Version.findOne({ document: documentId }).sort({ createdAt: -1 });

        // Avoid duplicate versions if content hasn't changed
        const lastContent = lastVersion ? JSON.stringify(lastVersion.content) : null;
        const newContent = JSON.stringify(content);
        if (lastContent === newContent && action === 'edit') {
            return null;
        }

        const version = await Version.create({
            document: documentId,
            content,
            createdBy: userId,
            createdByName: userName || 'Unknown',
            action
        });
        return version;
    } catch (error) {
        console.error('Error creating version:', error);
    }
};

const createDocument = async (req, res) => {
    try {
        const document = await Document.create({
            title: 'Untitled Document',
            owner: req.user.id,
            collaborators: []
        });
        // Create initial version
        await createVersion(document._id, "", req.user.id, req.user.name, 'edit');
        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllDocuments = async (req, res) => {
    try {
        const documents = await Document.find({
            $or: [
                { owner: req.user.id },
                { collaborators: req.user.id }
            ]
        })
            .sort({ updatedAt: -1 })
            .populate('owner', 'name email');
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('collaborators', 'name email');

        if (!document) return res.status(404).json({ message: 'Document not found' });

        if (!req.user && !document.isPublic) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        let isAuthorized = false;
        if (req.user) {
            const isOwner = document.owner._id.toString() === req.user.id;
            const isCollaborator = document.collaborators.some(c => c._id.toString() === req.user.id);
            isAuthorized = isOwner || isCollaborator;
        }

        if (!isAuthorized && document.isPublic) {
            const token = req.query.share;
            if (token && token === document.shareToken) isAuthorized = true;
        }

        if (!isAuthorized) return res.status(403).json({ message: 'Not authorized to view this document' });

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateDocumentTitle = async (req, res) => {
    try {
        const { title } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) return res.status(404).json({ message: 'Document not found' });
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to rename document' });
        }

        document.title = title;
        await document.save();

        // Track rename in version history
        await createVersion(document._id, document.content, req.user.id, req.user.name, 'rename');

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateDocumentContent = async (req, res) => {
    try {
        const { content } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) return res.status(404).json({ message: 'Document not found' });

        const isOwner = document.owner.toString() === req.user.id;
        const isCollaborator = document.collaborators.some(c => c.toString() === req.user.id);
        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ message: 'Not authorized to edit document' });
        }

        // Create version before updating
        await createVersion(document._id, content, req.user.id, req.user.name, 'edit');

        document.content = content;
        await document.save();
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete document' });
        }
        await document.deleteOne();
        await Version.deleteMany({ document: req.params.id });
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const enablePublicShare = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can enable sharing' });
        }
        if (!document.shareToken) {
            document.shareToken = crypto.randomBytes(16).toString('hex');
        }
        document.isPublic = true;
        await document.save();
        res.json({ isPublic: true, shareToken: document.shareToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const disablePublicShare = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can disable sharing' });
        }
        document.isPublic = false;
        await document.save();
        res.json({ isPublic: false });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const inviteCollaborator = async (req, res) => {
    const { email } = req.body;
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can invite collaborators' });
        }
        const userToInvite = await User.findOne({ email });
        if (!userToInvite) return res.status(404).json({ message: 'User not found with this email' });
        if (document.owner.toString() === userToInvite._id.toString()) {
            return res.status(400).json({ message: 'Cannot invite yourself' });
        }
        if (document.collaborators.includes(userToInvite._id)) {
            return res.status(400).json({ message: 'User is already a collaborator' });
        }
        document.collaborators.push(userToInvite._id);
        await document.save();
        await document.populate('collaborators', 'name email');
        res.json(document.collaborators);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Versioning Controllers ---

const getDocumentVersions = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        const isOwner = document.owner.toString() === req.user.id;
        const isCollaborator = document.collaborators.some(c => c.toString() === req.user.id);
        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ message: 'Not authorized to view versions' });
        }

        const versions = await Version.find({ document: req.params.id })
            .sort({ createdAt: -1 })
            .select('createdAt createdBy createdByName action content');

        // Build response with preview snippets
        const versionsWithPreview = versions.map(v => ({
            _id: v._id,
            createdAt: v.createdAt,
            createdByName: v.createdByName,
            action: v.action,
            preview: typeof v.content === 'string'
                ? v.content.substring(0, 120)
                : (v.content ? JSON.stringify(v.content).substring(0, 120) : ''),
            content: v.content,
            isOwner
        }));

        res.json(versionsWithPreview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const restoreVersion = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        // STRICT: Only owner can restore
        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the document owner can restore versions' });
        }

        const version = await Version.findById(req.params.versionId);
        if (!version) return res.status(404).json({ message: 'Version not found' });

        // Create a restore version entry BEFORE restoring
        await createVersion(document._id, version.content, req.user.id, req.user.name, 'restore');

        document.content = version.content;
        await document.save();

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createDocument,
    getAllDocuments,
    getDocumentById,
    updateDocumentTitle,
    updateDocumentContent,
    deleteDocument,
    enablePublicShare,
    disablePublicShare,
    inviteCollaborator,
    getDocumentVersions,
    restoreVersion,
    createVersion
};
