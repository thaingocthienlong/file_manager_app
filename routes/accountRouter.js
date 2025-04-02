const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const db = require('../config/database');
const { forwardAuthenticated } = require('../middleware/auth');
const { csrfProtection, addCsrfToken } = require('../middleware/csrf');

// Register Page
router.get('/register', forwardAuthenticated, csrfProtection, addCsrfToken, (req, res) => {
    res.render('register', {
        title: 'Register',
        error_msg: req.flash('error'),
        success_msg: req.flash('success')
    });
});

// Register Process
router.post('/register', forwardAuthenticated, csrfProtection, [
    check('name').notEmpty().withMessage('Username is required'),
    check('email').isEmail().withMessage('Please enter a valid email'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    console.log("Registration attempt received:", req.body);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());

        req.flash('error', errors.array()[0].msg);
        return res.redirect('/register');
    }

    const { name, email, password } = req.body;

    try {
        // Check if email already exists
        db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, name], async (err, results) => {
            if (err) {
                console.error("Database query error:", err);
                req.flash('error', 'Server error while checking existing users');
                return res.redirect('/register');
            }

            if (results.length > 0) {
                // Check if it's email or username that exists
                if (results.some(user => user.email === email)) {
                    req.flash('error', 'Email already registered');
                } else {
                    req.flash('error', 'Username already taken');
                }
                return res.redirect('/register');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user - note the field names matching your database schema
            const insertQuery = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
            db.query(insertQuery, [name, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error("Error inserting new user:", err);
                    req.flash('error', 'Failed to create account');
                    return res.redirect('/register');
                }

                // Create user directory
                const fs = require('fs');
                const userDir = `${process.env.USER_FILES_DIR}/${result.insertId}`;
                if (!fs.existsSync(userDir)) {
                    fs.mkdirSync(userDir, { recursive: true });
                }

                req.flash('success', 'You are now registered and can log in');
                res.redirect('/login');
            });
        });
    } catch (error) {
        console.error("Server error during registration:", error);
        req.flash('error', 'Server error');
        res.redirect('/register');
    }
});


router.get('/login', forwardAuthenticated, csrfProtection, addCsrfToken, (req, res) => {
    // Remove any redirect logic that might point back to login
    console.log("Login page accessed, session:", req.session);
    res.render('login', {
        title: 'Login',
        error_msg: req.flash('error'),
        success_msg: req.flash('success')
    });
});

// Login Process
router.post('/login', forwardAuthenticated, csrfProtection, async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if it's an email or username login
        const isEmail = email.includes('@');
        const field = isEmail ? 'email' : 'username';

        // Find user - modified to check either email or username
        db.query(`SELECT * FROM users WHERE ${field} = ?`, [email], async (err, results) => {
            if (err) {
                console.error("Database query error:", err);
                req.flash('error', 'Server error');
                return res.redirect('/login');
            }

            if (results.length === 0) {
                req.flash('error', 'Invalid credentials');
                return res.redirect('/login');
            }

            const user = results[0];

            // Compare password with password_hash field
            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                req.flash('error', 'Invalid credentials');
                return res.redirect('/login');
            }

            // Set session
            req.session.user = {
                id: user.id,
                name: user.username, // Using username instead of name
                email: user.email
            };

            res.redirect('/');
        });
    } catch (error) {
        console.error("Server error during login:", error);
        req.flash('error', 'Server error');
        res.redirect('/login');
    }
});

// In accountRouter.js, modify the logout route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Clear cookies as well
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

module.exports = router;