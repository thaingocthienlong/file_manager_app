function ensureAuthenticated(req, res, next) {
    // Allow public routes
    const publicRoutes = ['/login', '/register'];
    if (publicRoutes.includes(req.path)) {
        return next();
    }

    // Check if user is authenticated
    if (req.session && req.session.user) {
        return next();
    }

    // Flash message and redirect to login
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
}

function forwardAuthenticated(req, res, next) {
    // If user is already logged in and tries to access login/register, redirect to home
    const loginRoutes = ['/login', '/register'];
    if (loginRoutes.includes(req.path) && req.session && req.session.user) {
        return res.redirect('/');
    }
    
    next();
}

module.exports = {
    ensureAuthenticated,
    forwardAuthenticated
};