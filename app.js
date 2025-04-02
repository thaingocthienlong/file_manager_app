const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const csrf = require('csurf');
const cookieParser = require('cookie-parser'); // Add this
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const db = require('./config/database');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Set up rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiter to all requests
app.use(limiter);

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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});