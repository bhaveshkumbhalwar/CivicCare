const Complaint = require('../models/Complaint');

/**
 * POST /api/complaints
 * Create a new complaint (authenticated users only)
 */
const createComplaint = async (req, res) => {
    try {
        const { title, description, location, category, priority, image } = req.body;

        const complaint = await Complaint.create({
            title,
            description,
            location,
            category,
            priority: priority || 'Medium',
            image: image || '',
            submittedBy: req.user._id,
        });

        await complaint.populate('submittedBy', 'name email');

        res.status(201).json({ success: true, message: 'Complaint submitted successfully.', complaint });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
    }
};

/**
 * Mapping of Admin Roles to Categories
 */
const ROLE_CATEGORY_MAP = {
    admin_colleges: 'Colleges',
    admin_schools: 'Schools',
    admin_societies: 'Societies',
    admin_vendors: ['Local Vendors', 'Shopkeepers'],
    admin_government: 'Government Services',
};

/**
 * GET /api/complaints
 * Get all complaints with search, filter, and pagination
 */
const getAllComplaints = async (req, res) => {
    try {
        const { search, status, category, priority, page = 1, limit = 10, sort = '-createdAt' } = req.query;

        const query = {};

        // ─── Automated RBAC Filter ────────────────────────────────────────────────
        const userRole = req.user?.role;
        if (userRole && ROLE_CATEGORY_MAP[userRole]) {
            const allowedCategories = ROLE_CATEGORY_MAP[userRole];
            // If the admin belongs to a specific department, override or restrict category filter
            if (Array.isArray(allowedCategories)) {
                query.category = { $in: allowedCategories };
            } else {
                query.category = allowedCategories;
            }
        } else if (category) {
            // General user or super_admin applying a specific filter
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        if (status) query.status = status;
        if (priority) query.priority = priority;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [complaints, total] = await Promise.all([
            Complaint.find(query)
                .populate('submittedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Complaint.countDocuments(query),
        ]);

        res.json({
            success: true,
            complaints,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch complaints.' });
    }
};

/**
 * GET /api/complaints/my
 * Get complaints submitted by the authenticated user
 */
const getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ submittedBy: req.user._id })
            .populate('submittedBy', 'name email')
            .sort('-createdAt');

        res.json({ success: true, complaints });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch your complaints.' });
    }
};

/**
 * GET /api/complaints/:id
 * Get a single complaint by ID
 */
const getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).populate('submittedBy', 'name email');

        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }

        res.json({ success: true, complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch complaint.' });
    }
};

/**
 * PATCH /api/complaints/:id/upvote
 * Toggle upvote on a complaint
 */
const toggleUpvote = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }

        const userId = req.user._id.toString();
        const hasUpvoted = complaint.upvotes.some((id) => id.toString() === userId);

        if (hasUpvoted) {
            complaint.upvotes = complaint.upvotes.filter((id) => id.toString() !== userId);
        } else {
            complaint.upvotes.push(req.user._id);
        }

        await complaint.save();
        await complaint.populate('submittedBy', 'name email');

        res.json({
            success: true,
            message: hasUpvoted ? 'Upvote removed.' : 'Upvoted successfully.',
            complaint,
            upvoted: !hasUpvoted,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to process upvote.' });
    }
};

/**
 * GET /api/complaints/stats
 * Get breakdown of complaints for dashboard summary
 */
const getStats = async (req, res) => {
    try {
        const stats = await Complaint.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedStats = {
            total: 0,
            Pending: 0,
            'In Progress': 0,
            Resolved: 0
        };

        stats.forEach(s => {
            formattedStats[s._id] = s.count;
            formattedStats.total += s.count;
        });

        res.json({ success: true, stats: formattedStats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch statistics.' });
    }
};

/**
 * PATCH /api/complaints/:id/status  (Admin only — in adminController)
 * Update complaint status — see adminController.js
 */

module.exports = { createComplaint, getAllComplaints, getMyComplaints, getComplaintById, toggleUpvote, getStats };