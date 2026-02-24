/**
 * Full Stack Quran Search Configuration
 * E5 + BGE Reranker + Mistral Query Analyzer
 */

const path = require('path');

module.exports = {
  // E5 Base V2 Model Configuration
  e5Model: {
    name: 'e5',
    modelPath: path.join(__dirname, '../../e5-base-v2/onnx/model.onnx'),
    tokenizerPath: path.join(__dirname, '../../e5-base-v2/onnx'),
    modelIdentifier: 'intfloat/e5-base-v2',
    dimension: 768,
    maxLength: 512,
    prefix: 'query: ',
    batchSize: 8,
    topK: 200 // Retrieve top 200 for comprehensive recall
  },

  // BGE Reranker Configuration
  reranker: {
    enabled: true,
    inputSize: 100, // Rerank top 100 from E5 retrieval
    outputSize: 30, // Return top 30 after reranking
    smartMode: true, // Skip reranking for high-confidence queries
    confidenceThreshold: 0.7 // If top result > 0.7, skip reranking
  },

  // Mistral Query Analyzer Configuration
  queryAnalyzer: {
    enabled: true,
    maxRewrites: 5, // Generate up to 5 query variations
    enableAliases: true, // Use entity aliases (Moses→Musa)
    enableConcepts: true, // Extract concepts (prayer→salah)
    aggregateResults: true // Merge results from multiple rewrites
  },

  // Quran Data Paths
  data: {
    quranPath: path.join(__dirname, '../../../quran'),
    indexPath: path.join(__dirname, '../data/quran'),
    embeddingsPath: path.join(__dirname, '../data/quran/embeddings'),
    metadataPath: path.join(__dirname, '../data/quran/metadata.json')
  },

  // Search Configuration
  search: {
    minScore: 0.2, // Lower threshold for better recall
    maxResults: 30, // Return top 30 verses
    enableKeywordBoost: true,
    keywordWeight: 0.15, // 15% boost for exact matches
    semanticWeight: 0.70, // 70% E5 score
    rerankWeight: 0.15 // 15% rerank score (when enabled)
  },

  // Hybrid Scoring
  scoring: {
    e5Weight: 0.70,
    keywordWeight: 0.15,
    rerankWeight: 0.15,
    entityMatchBoost: 0.1 // Boost if entity alias matches
  },

  // Verse Context
  context: {
    enableContext: true,
    contextBefore: 2, // 2 verses before
    contextAfter: 2 // 2 verses after
  },

  // Cache Configuration
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: 3600000
  }
};
