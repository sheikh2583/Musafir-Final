/**
 * Build Quran Vector Index
 * Run: node scripts/build-quran-index.js
 * 
 * This generates backend/vector_index.json by embedding all 6236 Quran verses
 * with their tafseer using BGE-base-en-v1.5 ONNX model.
 * Takes ~10-15 minutes on first run.
 */

const { getSearchEngine } = require('../ml-search/search/vector-search');

async function buildIndex() {
  console.log('🚀 Building Quran vector index...');
  console.log('This will take 10-15 minutes...\n');
  
  const engine = getSearchEngine();
  await engine.initialize('index');
  
  console.log('\n✅ Quran vector index built successfully!');
  console.log('The backend will now use this for semantic search.');
  process.exit(0);
}

buildIndex().catch(err => {
  console.error('❌ Failed to build index:', err);
  process.exit(1);
});
