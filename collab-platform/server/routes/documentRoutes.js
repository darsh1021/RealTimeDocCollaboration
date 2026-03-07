const express = require('express');
const router = express.Router();
const {
    createDocument,
    getAllDocuments,
    getDocumentById,
    updateDocumentTitle,
    deleteDocument,
    enablePublicShare,
    disablePublicShare,
    inviteCollaborator,
    getDocumentVersions, // New
    restoreVersion       // New
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

// Add optional auth for public documents
const optionalProtect = (req, res, next) => {
    // If auth header present, verify it. If not, proceed without user.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return protect(req, res, next);
    }
    next();
};

router.post('/', protect, createDocument);
router.get('/', protect, getAllDocuments);

// Allow public access to GET /:id if shared
router.get('/:id', optionalProtect, getDocumentById);

router.put('/:id', protect, updateDocumentTitle);
router.delete('/:id', protect, deleteDocument);

// Sharing Routes
router.post('/:id/share', protect, enablePublicShare);
router.post('/:id/unshare', protect, disablePublicShare);
router.post('/:id/invite', protect, inviteCollaborator);

// Versioning Routes
router.get('/:id/versions', protect, getDocumentVersions);
router.post('/:id/restore/:versionId', protect, restoreVersion);

module.exports = router;
