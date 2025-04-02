// Check if user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
      return next();
    }
    
    // Flash message if needed
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
  }
  
  // Redirect if already authenticated
  function forwardAuthenticated(req, res, next) {
    if (!req.session.user) {
      return next();
    }
    res.redirect('/');
  }
  
  module.exports = {
    ensureAuthenticated,
    forwardAuthenticated
  };