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
  check('name').notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/register');
  }
  
  const { name, email, password } = req.body;
  
  try {
    // Check if email already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) throw err;
      
      if (results.length > 0) {
        req.flash('error', 'Email already registered');
        return res.redirect('/register');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert user
      const insertQuery = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
      db.query(insertQuery, [name, email, hashedPassword], (err, result) => {
        if (err) throw err;
        
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
    console.error(error);
    req.flash('error', 'Server error');
    res.redirect('/register');
  }
});

// Login Page
router.get('/login', forwardAuthenticated, csrfProtection, addCsrfToken, (req, res) => {
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
    // Find user
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) throw err;
      
      if (results.length === 0) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/login');
      }
      
      const user = results[0];
      
      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/login');
      }
      
      // Set session
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };
      
      res.redirect('/');
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Server error');
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;