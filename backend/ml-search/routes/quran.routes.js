/**
 * Quran Search Routes
 */

const express = require('express');
const router = express.Router();
const quranController = require('../controllers/quran.controller');

// Search endpoint
router.get('/search', quranController.search);

// Info endpoint
router.get('/search/info', quranController.getInfo);

// Cache management
router.post('/search/cache/clear', quranController.clearCache);

// Health check
router.get('/search/health', quranController.health);

module.exports = router;
