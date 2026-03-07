const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    content: {
        type: Object,
        required: true
    },
    title: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByName: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: ['edit', 'restore', 'rename'],
        default: 'edit'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: false });

module.exports = mongoose.model('Version', versionSchema);
