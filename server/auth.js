const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'codechef-scraper-secret-key-2026';
const JWT_EXPIRES_IN = '24h';

// Seed default users on first run
function seedUsers() {
    const existing = db.read('users.json');
    if (existing && existing.length > 0) return;

    const users = [
        {
            id: 1,
            username: 'admin',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin',
            displayName: 'Administrator'
        },
        {
            id: 2,
            username: 'viewer',
            password: bcrypt.hashSync('viewer123', 10),
            role: 'viewer',
            displayName: 'Viewer'
        }
    ];
    db.write('users.json', users);
    console.log('[Auth] Seeded default users: admin / viewer');
}

seedUsers();

// Seed default sections
function seedSections() {
    db.ensure('sections.json', {
        studyYears: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
        academicYears: ['2024-25', '2025-26', '2026-27'],
        sectionNumbers: ['Section 1', 'Section 2', 'Section 3']
    });
}

seedSections();

// Ensure profiles store exists
db.ensure('profiles.json', []);

// --- Login ---
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = db.read('users.json') || [];
    const user = users.find(u => u.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.displayName
        }
    });
});

// --- Get Current User ---
router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// --- Middleware: Require Authentication ---
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// --- Middleware: Require Admin Role ---
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
}

module.exports = { router, requireAuth, requireAdmin };
