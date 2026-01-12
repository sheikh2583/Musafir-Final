const express = require('express');
const router = express.Router();
const salatController = require('../controllers/salat.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Record a prayer (updates score)
router.post('/pray', salatController.recordPrayer);

// Skip a prayer (breaks streak)
router.post('/skip', salatController.skipPrayer);

// Get my score
router.get('/score', salatController.getMyScore);

// Get global leaderboard
router.get('/leaderboard', salatController.getLeaderboard);

module.exports = router;
