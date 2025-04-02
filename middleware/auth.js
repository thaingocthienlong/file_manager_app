// Check if user is authenticated
function ensureAuthenticated(req, res, next) {
    // Add a check to prevent redirect loops
    if (req.path === '/login' || req.path === '/register') {
        return next();
    }

    if (req.session && req.session.user) {
        return next();
    }

    // Flash message if needed
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
}


// Redirect if already authenticated
function forwardAuthenticated(req, res, next) {
    // Add a check to prevent redirect loops
    if ((req.path === '/login' || req.path === '/register') && req.session && req.session.user) {
        return res.redirect('/');
    }
    
    next();
}

module.exports = {
    ensureAuthenticated,
    forwardAuthenticated
};