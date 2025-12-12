/**
 * Search Controller
 * 
 * Handles HTTP requests for semantic search
 */

const SearchEngine = require('../search/search-engine');

// Singleton search engine instance
let searchEngine = null;

/**
 * Initialize search engine (call once at startup)
 */
async function initializeSearchEngine() {
  if (searchEngine) return searchEngine;
  
  searchEngine = new SearchEngine();
  await searchEngine.initialize();
  
  // Optional warmup
  await searchEngine.warmup();
  
  return searchEngine;
}

/**
 * GET /api/search
 * 
 * Query parameters:
 * - q: search query (required)
 * - source: 'quran', 'hadith', or 'both' (default: 'both')
 * - top_n: number of results (default: 10, max: 50)
 * - skip_reranking: true/false for debugging (default: false)
 */
async function search(req, res) {
  try {
    // Validate query parameter
    const query = req.query.q?.trim();
    if (!query) {
      return res.status(400).json({
        error: 'Query parameter "q" is required',
        example: '/api/search?q=mary'
      });
    }
    
    // Parse options
    const source = req.query.source || 'both';
    if (!['quran', 'hadith', 'both'].includes(source)) {
      return res.status(400).json({
        error: 'Invalid source parameter. Must be "quran", "hadith", or "both"'
      });
    }
    
    let topN = parseInt(req.query.top_n) || 10;
    if (topN < 1) topN = 1;
    if (topN > 50) topN = 50;
    
    const skipReranking = req.query.skip_reranking === 'true';
    
    // Ensure search engine is initialized
    if (!searchEngine) {
      await initializeSearchEngine();
    }
    
    // Perform search
    const result = await searchEngine.search(query, {
      source,
      top_n: topN,
      skip_reranking: skipReranking
    });
    
    return res.json(result);
    
  } catch (error) {
    console.error('[SearchController] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * GET /api/search/info
 * 
 * Get system information
 */
async function getInfo(req, res) {
  try {
    if (!searchEngine) {
      return res.json({
        status: 'not_initialized',
        message: 'Search engine not initialized yet. Make a search query to initialize.'
      });
    }
    
    const info = searchEngine.getInfo();
    const cacheStats = searchEngine.getCacheStats();
    
    return res.json({
      status: 'ready',
      info,
      cache: cacheStats
    });
    
  } catch (error) {
    console.error('[SearchController] Error getting info:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * POST /api/search/cache/clear
 * 
 * Clear search cache
 */
async function clearCache(req, res) {
  try {
    if (!searchEngine) {
      return res.json({
        message: 'Search engine not initialized, nothing to clear'
      });
    }
    
    searchEngine.clearCache();
    
    return res.json({
      message: 'Cache cleared successfully'
    });
    
  } catch (error) {
    console.error('[SearchController] Error clearing cache:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * POST /api/search/batch
 * 
 * Batch search (multiple queries)
 * Body: { queries: string[], source?: string, top_n?: number }
 */
async function batchSearch(req, res) {
  try {
    const { queries, source = 'both', top_n = 10 } = req.body;
    
    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        error: 'Body must contain "queries" array with at least one query'
      });
    }
    
    if (queries.length > 20) {
      return res.status(400).json({
        error: 'Maximum 20 queries per batch'
      });
    }
    
    // Ensure search engine is initialized
    if (!searchEngine) {
      await initializeSearchEngine();
    }
    
    // Perform batch search
    const results = await searchEngine.batchSearch(queries, { source, top_n });
    
    return res.json({
      queries: queries.length,
      results
    });
    
  } catch (error) {
    console.error('[SearchController] Batch search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = {
  initializeSearchEngine,
  search,
  getInfo,
  clearCache,
  batchSearch
};
