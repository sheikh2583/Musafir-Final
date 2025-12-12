/**
 * Quran Search Controller
 * Handles RAG-based vector search API requests
 */

const { getSearchEngine: getVectorSearchEngine } = require('../search/vector-search');

// Singleton instance
let vectorEngine = null;

/**
 * Get or create vector search engine instance
 */
const getSearchEngine = async () => {
  if (!vectorEngine) {
    vectorEngine = getVectorSearchEngine();
    await vectorEngine.initialize();
  }
  return vectorEngine;
};

/**
 * Search Quran verses
 * GET /api/quran/search?q=mary&limit=10&includeContext=true
 */
exports.search = async (req, res) => {
  try {
    const { q, limit, includeContext } = req.query;

    // Validate query
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    if (q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }

    if (q.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Query too long (max 500 characters)'
      });
    }

    // Get vector search engine
    const engine = await getSearchEngine();

    // Parse options
    const options = {
      limit: limit ? parseInt(limit) : undefined,
      includeContext: includeContext !== 'false' // Default true
    };

    // Perform search
    const results = await engine.search(q, options);

    res.json(results);
  } catch (error) {
    console.error('[QuranSearchController] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
};

/**
 * Get search engine info
 * GET /api/quran/search/info
 */
exports.getInfo = async (req, res) => {
  try {
    const engine = await getSearchEngine();
    const info = await engine.getInfo();
    
    res.json({
      success: true,
      method: 'rag-vector-search',
      data: info
    });
  } catch (error) {
    console.error('[QuranSearchController] Info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get info',
      message: error.message
    });
  }
};

/**
 * Clear query cache
 * POST /api/quran/search/cache/clear
 */
exports.clearCache = async (req, res) => {
  try {
    const engine = await getSearchEngine();
    engine.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared'
    });
  } catch (error) {
    console.error('[QuranSearchController] Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
};

/**
 * Health check
 * GET /api/quran/search/health
 */
exports.health = async (req, res) => {
  try {
    const engine = await getSearchEngine();
    const info = engine.getInfo();
    
    res.json({
      success: true,
      status: info.initialized ? 'ready' : 'initializing',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
};
