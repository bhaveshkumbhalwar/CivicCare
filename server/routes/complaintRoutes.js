const express = require('express');
const router = express.Router();
const {
    createComplaint,
    getAllComplaints,
    getMyComplaints,
    getComplaintById,
    getStats,
    toggleUpvote
} = require('../controllers/complaintController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.post('/', protect, createComplaint);
router.get('/', optionalAuth, getAllComplaints);
router.get('/stats', optionalAuth, getStats);
router.get('/my', protect, getMyComplaints);
router.get('/:id', optionalAuth, getComplaintById);
router.patch('/:id/upvote', protect, toggleUpvote);

module.exports = router;
