const express = require('express');
const multer = require('multer');
const adminAuth = require('../middleware/adminAuth');
const { getStats, uploadEbook, deleteEbook, rebuildEmbeddings } = require('../controllers/adminController');
const { regenerateProgram } = require('../controllers/webhookController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'), false);
    }
  }
});

// Protect all admin routes
router.use(adminAuth);

// Admin endpoints
router.get('/stats', getStats);
router.post('/ebooks', upload.single('ebook'), uploadEbook);
router.delete('/ebooks/:id', deleteEbook);
router.post('/ebooks/:id/rebuild', upload.single('ebook'), rebuildEmbeddings);
router.post('/programs/:id/regenerate', regenerateProgram);

module.exports = router;
