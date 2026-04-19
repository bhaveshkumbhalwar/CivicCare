const express = require('express');
const router = express.Router();
const { updateComplaintStatus } = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.patch('/complaints/:id/status', protect, requireAdmin, updateComplaintStatus);

module.exports = router;
