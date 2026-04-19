const Complaint = require('../models/Complaint');
const User = require('../models/User');

const ROLE_CATEGORY_MAP = {
    admin_colleges: 'Colleges',
    admin_schools: 'Schools',
    admin_societies: 'Societies',
    admin_vendors: ['Local Vendors', 'Shopkeepers'],
    admin_government: 'Government Services',
};

const updateComplaintStatus = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }

        // ─── Departmental Access Control ──────────────────────────────────────────
        const userRole = req.user.role;
        if (userRole !== 'super_admin') {
            const allowedCategories = ROLE_CATEGORY_MAP[userRole];
            const categories = Array.isArray(allowedCategories) ? allowedCategories : [allowedCategories];
            
            if (!categories.includes(complaint.category)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Security Alert: You are not authorized to manage reports in the "${complaint.category}" category.` 
                });
            }
        }

        if (status) complaint.status = status;
        if (adminNote !== undefined) complaint.adminNote = adminNote;
        
        if (status === 'Resolved' && complaint.status !== 'Resolved') {
            complaint.resolvedAt = Date.now();
        }

        await complaint.save();
        await complaint.populate('submittedBy', 'name email');

        res.json({ success: true, message: 'Complaint updated successfully.', complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update complaint.' });
    }
};

module.exports = { updateComplaintStatus };
