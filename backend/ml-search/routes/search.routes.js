/**
 * Search Routes
 * 
 * Semantic search endpoints for Qur'an and Hadith
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');

/**
 * @route   GET /api/search
 * @desc    Semantic search across Qur'an and/or Hadith
 * @params  q (required), source (quran|hadith|both), top_n (1-50)
 * @access  Public
 */
router.get('/', searchController.search);

/**
 * @route   GET /api/search/info
 * @desc    Get search system information and cache stats
 * @access  Public
 */
router.get('/info', searchController.getInfo);

/**
 * @route   POST /api/search/cache/clear
 * @desc    Clear search cache
 * @access  Public
 */
router.post('/cache/clear', searchController.clearCache);

/**
 * @route   POST /api/search/batch
 * @desc    Batch search (multiple queries)
 * @body    { queries: string[], source?: string, top_n?: number }
 * @access  Public
 */
router.post('/batch', searchController.batchSearch);

module.exports = router;
