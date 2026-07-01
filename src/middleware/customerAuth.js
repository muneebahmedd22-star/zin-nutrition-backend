const supabase = require('../config/db');

/**
 * Validates the secure customer token (UUID) for fetching the PDF
 */
async function customerAuth(req, res, next) {
  const token = req.query.token || req.headers['x-customer-token'];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token missing.' });
  }

  try {
    const { data: program, error } = await supabase
      .from('generated_programs')
      .select('*')
      .eq('id', token) // Since the primary key (id) of the program is already a secure UUID!
      .single();

    if (error || !program) {
      return res.status(403).json({ success: false, message: 'Invalid or expired program token.' });
    }

    // Attach program details to the request object
    req.program = program;
    next();
  } catch (err) {
    console.error('Customer authentication error:', err);
    return res.status(500).json({ success: false, message: 'Internal authentication error.' });
  }
}

module.exports = customerAuth;
