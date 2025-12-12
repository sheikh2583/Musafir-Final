/**
 * Hadith Search Routes
 */

const express = require('express');
const router = express.Router();
const hadithController = require('../controllers/hadith.controller');

// Search endpoint
router.get('/search', hadithController.search);

// Info endpoint
router.get('/search/info', hadithController.getInfo);

// Cache management
router.post('/search/cache/clear', hadithController.clearCache);

// Health check
router.get('/search/health', hadithController.health);

module.exports = router;
