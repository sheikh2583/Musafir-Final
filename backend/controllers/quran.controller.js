const fs = require('fs');
const path = require('path');
const { getSearchEngine } = require('../ml-search/search/vector-search');

/**
 * Quran Controller
 * 
 * Handles all Quran-related requests.
 * All data served from local JSON files - NO database or external APIs.
 * Optimized for offline-first operation.
 */

// Paths to Quran JSON files
const QURAN_BASE_PATH = path.join(__dirname, '../../quran');
const SURAH_METADATA_PATH = path.join(QURAN_BASE_PATH, 'surah.json');
const JUZ_METADATA_PATH = path.join(QURAN_BASE_PATH, 'juz.json');

/**
 * Helper: Load surah JSON file and transform to array format
 */
function loadSurahFile(surahNumber, includeTranslation = true) {
  const filePath = path.join(QURAN_BASE_PATH, 'surah', `surah_${surahNumber}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  const surahData = JSON.parse(data);

  // Load English translation if requested
  let translationData = null;
  if (includeTranslation) {
    const translationPath = path.join(QURAN_BASE_PATH, 'translation', 'en', `en_translation_${surahNumber}.json`);
    if (fs.existsSync(translationPath)) {
      const transData = fs.readFileSync(translationPath, 'utf8');
      translationData = JSON.parse(transData);
    }
  }

  // Transform verse object to array with proper field names for frontend
  const verses = [];
  if (surahData.verse) {
    Object.keys(surahData.verse).forEach(key => {
      const verseNum = parseInt(key.replace('verse_', ''));
      const verse = {
        number: ((surahNumber - 1) * 1000) + verseNum,
        surah: surahNumber,
        ayah: verseNum, // Frontend expects 'ayah'
        numberInSurah: verseNum,
        arabicText: surahData.verse[key], // Frontend expects 'arabicText'
        text: surahData.verse[key]
      };

      // Add translation if available
      if (translationData && translationData.verse && translationData.verse[key]) {
        verse.translationEn = translationData.verse[key]; // Frontend expects 'translationEn'
        verse.translation = {
          en: translationData.verse[key]
        };
      }

      verses.push(verse);
    });
  }
  return verses;
}

/**
 * Helper: Load metadata file
 */
function loadMetadata(type = 'surah') {
  const filePath = type === 'juz' ? JUZ_METADATA_PATH : SURAH_METADATA_PATH;
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

/**
 * Get all surah metadata
 * GET /api/quran/surahs
 */
exports.getAllSurahs = async (req, res) => {
  try {
    const metadata = loadMetadata('surah');

    if (!metadata) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load surah metadata'
      });
    }

    // Transform to expected format
    const transformed = metadata.map((surah, idx) => ({
      number: idx + 1,
      surahNumber: idx + 1,
      name: surah.title,
      nameArabic: surah.titleAr,
      arabicName: surah.titleAr,
      englishName: surah.title,
      englishNameTranslation: surah.title,
      revelationType: surah.type,
      numberOfAyahs: surah.count,
      verses: surah.count
    }));

    res.status(200).json({
      success: true,
      count: transformed.length,
      data: transformed
    });
  } catch (error) {
    console.error('Error fetching surahs:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch surah list'
    });
  }
};

/**
 * Get metadata for a specific surah
 * GET /api/quran/surah/:surahNumber/metadata
 */
exports.getSurahMetadata = async (req, res) => {
  try {
    const { surahNumber } = req.params;
    const surahNum = parseInt(surahNumber);

    if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
      return res.status(400).json({
        success: false,
        message: 'Invalid surah number. Must be between 1 and 114.'
      });
    }

    const allMetadata = loadMetadata('surah');
    if (!allMetadata) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load surah metadata'
      });
    }

    const metadata = allMetadata[surahNum - 1];
    if (!metadata) {
      return res.status(404).json({
        success: false,
        message: `Surah ${surahNum} metadata not found`
      });
    }

    // Transform to expected format
    const transformed = {
      number: surahNum,
      surahNumber: surahNum,
      name: metadata.title,
      nameArabic: metadata.titleAr,
      englishName: metadata.title,
      englishNameTranslation: metadata.title,
      revelationType: metadata.type,
      numberOfAyahs: metadata.count,
      verses: metadata.count
    };

    res.status(200).json({
      success: true,
      data: transformed
    });
  } catch (error) {
    console.error('Error fetching surah metadata:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch surah metadata'
    });
  }
};

/**
 * Get all ayahs for a specific surah
 * GET /api/quran/surah/:surahNumber
 */
exports.getSurah = async (req, res) => {
  try {
    const { surahNumber } = req.params;
    const { includeTranslation } = req.query;
    const surahNum = parseInt(surahNumber);
    const includeTranslationBool = includeTranslation !== 'false'; // Default to true

    if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
      return res.status(400).json({
        success: false,
        message: 'Invalid surah number. Must be between 1 and 114.'
      });
    }

    const surahData = loadSurahFile(surahNum, includeTranslationBool);
    if (!surahData || surahData.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Surah ${surahNum} not found`
      });
    }

    // Get metadata
    const allMetadata = loadMetadata('surah');
    const metadata = allMetadata ? allMetadata[surahNum - 1] : null;

    const transformedMetadata = metadata ? {
      number: surahNum,
      name: metadata.title,
      nameArabic: metadata.titleAr,
      englishName: metadata.title,
      revelationType: metadata.type,
      numberOfAyahs: metadata.count
    } : null;

    res.status(200).json({
      success: true,
      surahNumber: surahNum,
      metadata: transformedMetadata,
      ayahCount: surahData.length,
      data: surahData
    });
  } catch (error) {
    console.error('Error fetching surah:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch surah'
    });
  }
};

/**
 * Get a specific ayah
 * GET /api/quran/surah/:surahNumber/ayah/:ayahNumber
 */
exports.getAyah = async (req, res) => {
  try {
    const { surahNumber, ayahNumber } = req.params;
    const surahNum = parseInt(surahNumber);
    const ayahNum = parseInt(ayahNumber);

    if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
      return res.status(400).json({
        success: false,
        message: 'Invalid surah number. Must be between 1 and 114.'
      });
    }

    if (isNaN(ayahNum) || ayahNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ayah number.'
      });
    }

    const surahData = loadSurahFile(surahNum, true); // Include translation by default
    if (!surahData) {
      return res.status(404).json({
        success: false,
        message: `Surah ${surahNum} not found`
      });
    }

    const ayah = surahData.find(a => a.numberInSurah === ayahNum);
    if (!ayah) {
      return res.status(404).json({
        success: false,
        message: `Ayah ${ayahNum} not found in Surah ${surahNum}`
      });
    }

    res.status(200).json({
      success: true,
      surahNumber: surahNum,
      ayahNumber: ayahNum,
      data: ayah
    });
  } catch (error) {
    console.error('Error fetching ayah:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ayah'
    });
  }
};

/**
 * Get all juz metadata
 * GET /api/quran/juz
 */
exports.getAllJuz = async (req, res) => {
  try {
    const surahMetadata = loadMetadata('surah');

    if (!surahMetadata) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load juz metadata'
      });
    }

    // Build juz list from surah metadata
    const juzMap = new Map();

    surahMetadata.forEach((surah, idx) => {
      const surahNum = idx + 1;
      if (surah.juz && Array.isArray(surah.juz)) {
        surah.juz.forEach(juzInfo => {
          const juzNum = parseInt(juzInfo.index);
          if (!juzMap.has(juzNum)) {
            juzMap.set(juzNum, {
              number: juzNum,
              surahs: []
            });
          }
          juzMap.get(juzNum).surahs.push({
            surah: surahNum,
            name: surah.title,
            start: juzInfo.verse.start,
            end: juzInfo.verse.end
          });
        });
      }
    });

    const juzList = Array.from(juzMap.values()).sort((a, b) => a.number - b.number);

    res.status(200).json({
      success: true,
      count: juzList.length,
      data: juzList
    });
  } catch (error) {
    console.error('Error fetching juz:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch juz list'
    });
  }
};

/**
 * Get ayahs for a specific juz
 * GET /api/quran/juz/:juzNumber
 */
exports.getJuz = async (req, res) => {
  try {
    const { juzNumber } = req.params;
    const juzNum = parseInt(juzNumber);

    if (isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
      return res.status(400).json({
        success: false,
        message: 'Invalid juz number. Must be between 1 and 30.'
      });
    }

    const surahMetadata = loadMetadata('surah');
    if (!surahMetadata) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load metadata'
      });
    }

    const ayahs = [];
    const juzInfo = {
      number: juzNum,
      surahs: []
    };

    // Find all surahs that contain this juz
    surahMetadata.forEach((surah, idx) => {
      const surahNum = idx + 1;
      if (surah.juz && Array.isArray(surah.juz)) {
        const juzInSurah = surah.juz.find(j => parseInt(j.index) === juzNum);
        if (juzInSurah) {
          juzInfo.surahs.push({
            surah: surahNum,
            name: surah.title
          });

          // Load surah verses with translation
          const surahData = loadSurahFile(surahNum, true);
          if (surahData) {
            const startVerse = parseInt(juzInSurah.verse.start.replace('verse_', ''));
            const endVerse = parseInt(juzInSurah.verse.end.replace('verse_', ''));

            const juzVerses = surahData.filter(v =>
              v.numberInSurah >= startVerse && v.numberInSurah <= endVerse
            );
            ayahs.push(...juzVerses);
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      juzNumber: juzNum,
      metadata: juzInfo,
      ayahCount: ayahs.length,
      data: ayahs
    });
  } catch (error) {
    console.error('Error fetching juz:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch juz'
    });
  }
};

/**
 * Search ayahs by text
 * GET /api/quran/search
 */
exports.searchAyah = async (req, res) => {
  try {
    const { q, lang = 'english' } = req.query;

    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 3 characters long.'
      });
    }

    const searchTerm = q.toLowerCase();
    const results = [];
    const FETCH_LIMIT = 40; // Fetch top 40
    const DISPLAY_LIMIT = 15; // Show top 15 for better quality

    // Search through all surahs
    for (let surahNum = 1; surahNum <= 114; surahNum++) {
      const surahData = loadSurahFile(surahNum, true); // Include translation for search
      if (surahData) {
        for (const ayah of surahData) {
          const textToSearch = lang === 'arabic'
            ? ayah.text
            : ayah.translation?.en || '';

          if (textToSearch.toLowerCase().includes(searchTerm)) {
            results.push(ayah);
            // Stop once we have enough for fetching
            if (results.length >= FETCH_LIMIT) break;
          }
        }
      }
      // Stop outer loop once we have enough
      if (results.length >= FETCH_LIMIT) break;
    }

    // Return only top 15 for display
    const displayResults = results.slice(0, DISPLAY_LIMIT);

    res.status(200).json({
      success: true,
      query: q,
      lang,
      count: displayResults.length,
      totalMatches: results.length,
      data: displayResults
    });
  } catch (error) {
    console.error('Error searching ayahs:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search ayahs'
    });
  }
};

/**
 * Get Quran statistics
 * GET /api/quran/stats
 */
exports.getStats = async (req, res) => {
  try {
    const surahMetadata = loadMetadata('surah');

    let totalAyahs = 0;
    let makkiCount = 0;
    let madaniCount = 0;

    if (surahMetadata) {
      totalAyahs = surahMetadata.reduce((sum, surah) => sum + (surah.count || 0), 0);
      makkiCount = surahMetadata.filter(s => s.type === 'Makkiyah').length;
      madaniCount = surahMetadata.filter(s => s.type === 'Madaniyah').length;
    }

    res.status(200).json({
      success: true,
      data: {
        totalSurahs: 114,
        totalJuz: 30,
        totalAyahs: totalAyahs || 6236,
        makkiSurahs: makkiCount || 86,
        madaniSurahs: madaniCount || 28
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

/**
 * Semantic/AI Search using Local RAG
 * GET /api/quran/semantic-search
 */
exports.semanticSearch = async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long.'
      });
    }

    const vectorEngine = getSearchEngine();

    // Initialize if needed (first request might be slow)
    if (!vectorEngine.initialized) {
      console.log('Initializing vector engine on first request...');
      await vectorEngine.initialize();
    }

    const searchResults = await vectorEngine.search(q, {
      limit: parseInt(limit) || 15,
      rerank: true
    });

    if (!searchResults.success) {
      throw new Error(searchResults.error);
    }

    res.status(200).json({
      success: true,
      data: searchResults.results,
      metadata: searchResults.metadata
    });

  } catch (error) {
    console.error('Error in semantic search:', error.message);
    res.status(500).json({
      success: false,
      message: 'Semantic search failed',
      error: error.message
    });
  }
};

