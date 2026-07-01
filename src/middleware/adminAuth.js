const config = require('../config');

/**
 * Basic API Key verification middleware to protect Admin routes
 */
function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access Denied. Authorization Header missing.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token !== config.adminApiKey) {
    return res.status(403).json({ success: false, message: 'Access Denied. Invalid Authorization token.' });
  }

  next();
}

module.exports = adminAuth;
