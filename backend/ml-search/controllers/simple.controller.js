/**
 * Simple Search Controller
 * Uses simplified search engine (mpnet + reranker only)
 */

const SimpleSearchEngine = require('../search/simple-engine');

let searchEngine = null;

async function initializeSearchEngine() {
  if (searchEngine) return searchEngine;
  
  searchEngine = new SimpleSearchEngine();
  await searchEngine.initialize();
  await searchEngine.warmup();
  
  return searchEngine;
}

async function search(req, res) {
  try {
    const query = req.query.q?.trim();
    if (!query) {
      return res.status(400).json({
        error: 'Query parameter "q" is required',
        example: '/api/search?q=mary'
      });
    }
    
    const source = req.query.source || 'both';
    if (!['quran', 'hadith', 'both'].includes(source)) {
      return res.status(400).json({
        error: 'Invalid source. Must be "quran", "hadith", or "both"'
      });
    }
    
    let topN = parseInt(req.query.top_n) || 10;
    if (topN < 1) topN = 1;
    if (topN > 50) topN = 50;
    
    const skipReranking = req.query.skip_reranking === 'true';
    
    if (!searchEngine) {
      await initializeSearchEngine();
    }
    
    const result = await searchEngine.search(query, {
      source,
      top_n: topN,
      skip_reranking: skipReranking
    });
    
    return res.json(result);
    
  } catch (error) {
    console.error('[SimpleSearchController] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function getInfo(req, res) {
  try {
    if (!searchEngine) {
      return res.json({
        status: 'not_initialized',
        message: 'Search engine not initialized. Make a query to initialize.'
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
    console.error('[SimpleSearchController] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function clearCache(req, res) {
  try {
    if (!searchEngine) {
      return res.json({
        message: 'Search engine not initialized'
      });
    }
    
    searchEngine.clearCache();
    
    return res.json({
      message: 'Cache cleared'
    });
    
  } catch (error) {
    console.error('[SimpleSearchController] Error:', error);
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
  clearCache
};
