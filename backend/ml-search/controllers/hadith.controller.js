/**
 * Hadith Search Controller
 * RAG-based vector search with BGE embeddings
 */

const { getSearchEngine } = require('../search/hadith-vector-search');

// Singleton instance
let searchEngine = null;

/**
 * Get or create search engine instance
 */
const getEngine = async () => {
  if (!searchEngine) {
    searchEngine = getSearchEngine();
    await searchEngine.initialize();
  }
  return searchEngine;
};

/**
 * Search Hadiths
 * GET /api/hadith/search?q=patience&limit=10
 */
exports.search = async (req, res) => {
  try {
    const { q, limit } = req.query;

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

    // Get RAG search engine
    const engine = await getEngine();

    // Parse options
    const options = {
      limit: limit ? parseInt(limit) : undefined
    };

    // Perform search
    const results = await engine.search(q, options);

    res.json(results);
  } catch (error) {
    console.error('[HadithSearchController] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
};

/**
 * Get search engine info
 * GET /api/hadith/search/info
 */
exports.getInfo = async (req, res) => {
  try {
    const engine = await getEngine();
    const info = await engine.getInfo();
    
    res.json({
      success: true,
      method: 'rag-vector-search',
      data: info
    });
  } catch (error) {
    console.error('[HadithSearchController] Info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get info',
      message: error.message
    });
  }
};

/**
 * Clear search cache
 * POST /api/hadith/search/cache/clear
 */
exports.clearCache = async (req, res) => {
  try {
    if (searchEngine) {
      searchEngine.clearCache();
    }
    
    res.json({
      success: true,
      message: 'Cache cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Health check
 * GET /api/hadith/search/health
 */
exports.health = async (req, res) => {
  try {
    const engine = await getEngine();
    const info = await engine.getInfo();
    
    res.json({
      status: 'ok',
      initialized: info.initialized,
      totalHadiths: info.totalHadiths,
      method: 'rag-vector-search',
      collections: info.collections
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};
