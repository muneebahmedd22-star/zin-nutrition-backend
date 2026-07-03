const express = require('express');
const { saveDietAssessment, getDietPlan } = require('../controllers/dietController');

const router = express.Router();

router.post('/coaching-assessment', saveDietAssessment);
router.get('/diet-plan', getDietPlan);

module.exports = router;
