const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** Generate a signed JWT for a user */
const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/**
 * POST /api/auth/register
 * Create a new user account
 */
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Prevent self-promoting to admin via API
        const safeRole = role === 'admin' ? 'user' : (role || 'user');

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        const user = await User.create({ name, email, password, role: safeRole });
        const token = signToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Registration failed. Try again.' });
    }
};

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        // Explicitly include password for comparison
        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const token = signToken(user._id);

        res.json({
            success: true,
            message: 'Login successful.',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed. Try again.' });
    }
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user
 */
const getMe = async (req, res) => {
    res.json({ success: true, user: req.user });
};

module.exports = { register, login, getMe };