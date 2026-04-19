const mongoose = require('mongoose');

/**
 * Complaint Schema
 * Core entity of the system — submitted by users, managed by admins.
 */
const complaintSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            minlength: [5, 'Title must be at least 5 characters'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            minlength: [10, 'Description must be at least 10 characters'],
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: ['Colleges', 'Schools', 'Societies', 'Local Vendors', 'Shopkeepers', 'Government Services'],
        },
        priority: {
            type: String,
            required: [true, 'Priority is required'],
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium',
        },
        status: {
            type: String,
            enum: ['Pending', 'In Progress', 'Resolved'],
            default: 'Pending',
        },
        image: {
            type: String, // Base64 string or URL
            default: '',
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        upvotes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        adminNote: {
            type: String,
            default: '',
        },
        resolvedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

// ─── Virtual: upvote count ────────────────────────────────────────────────────
complaintSchema.virtual('upvoteCount').get(function () {
    return this.upvotes.length;
});

// ─── Index for search performance ────────────────────────────────────────────
complaintSchema.index({ title: 'text', description: 'text', location: 'text' });
complaintSchema.index({ status: 1, category: 1, createdAt: -1 });

// Ensure virtuals appear in JSON
complaintSchema.set('toJSON', { virtuals: true });
complaintSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Complaint', complaintSchema);