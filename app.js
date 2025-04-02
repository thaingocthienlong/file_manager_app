const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const csrf = require('csurf');
const cookieParser = require('cookie-parser'); // Add this
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const db = require('./config/database');

// Add this to your app.js to ensure the uploads directory exists
// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Create a more lenient limiter for general routes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Much higher limit
    message: 'Too many requests, please try again later'
});

// Apply general limiter to all routes
app.use(generalLimiter);

// Apply stricter limiter to authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Stricter limit for auth routes
    message: 'Too many authentication attempts, please try again later'
});

app.use('/login', authLimiter);
app.use('/register', authLimiter);

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cookie parser must come BEFORE session and csrf
app.use(cookieParser());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Flash messages
app.use(flash());

// CSRF protection - now cookie parser is configured
app.use(csrf({ cookie: true }));

// Global variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Routes
app.use('/', require('./routes/accountRouter'));
app.use('/', require('./routes/fileRouter'));

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Error',
        message: 'Page not found'
    });
});

// Error handler
// In app.js, modify the CSRF error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.error('CSRF error:', err);
        req.flash('error', 'Security validation failed. Please try again.');

        // Avoid redirecting back to the same form that caused the CSRF error
        if (req.headers.referer) {
            return res.redirect(req.headers.referer);
        }
        return res.redirect('/');
    }
    next(err);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});