const express = require('express');
const router = express.Router();
const hadithController = require('../controllers/hadith.controller');

/**
 * Hadith Routes
 * 
 * All routes serve data from local JSON files only.
 * No external API or database dependencies.
 */

// Get statistics - MUST be before /:collection routes
router.get('/stats', hadithController.getStats);
router.get('/stats/all', hadithController.getStats); // Alias for mobile app compatibility

// Get list of available collections
router.get('/collections', hadithController.getCollections);

// Get books/chapters list for a collection - MUST be before /:collection/:hadithNumber
router.get('/:collection/books', hadithController.getBooks);

// Get chapters/books for a collection
router.get('/:collection/chapters', hadithController.getChapters);

// Get all hadiths from a specific chapter
router.get('/:collection/chapter/:chapterNumber', hadithController.getChapter);

// Search hadiths in a collection
router.get('/:collection/search', hadithController.searchHadith);

// Get specific hadith by ID (in chapter context)
router.get('/:collection/hadith/:hadithId', hadithController.getHadith);

// Get specific hadith by number - MUST be after more specific routes
router.get('/:collection/:hadithNumber', hadithController.getHadithByNumber);

// Get all hadiths from a collection (with pagination) - MUST be last
router.get('/:collection', hadithController.getCollectionHadith);

module.exports = router;
