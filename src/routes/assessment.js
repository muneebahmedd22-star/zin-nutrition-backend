const express = require('express');
const { saveAssessment } = require('../controllers/assessmentController');

const router = express.Router();

router.post('/', saveAssessment);

module.exports = router;
