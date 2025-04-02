const csrf = require('csurf');

const csrfProtection = csrf({ cookie: true });

function addCsrfToken(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
}

module.exports = {
  csrfProtection,
  addCsrfToken
};