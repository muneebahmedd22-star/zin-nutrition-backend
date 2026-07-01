const express = require('express');
const customerAuth = require('../middleware/customerAuth');
const { getTrainingProgram } = require('../controllers/customerController');

const router = express.Router();

// Get customer training program (authenticated by customer token)
router.get('/training-program', customerAuth, getTrainingProgram);

module.exports = router;
