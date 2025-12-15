const fs = require('fs');
const path = require('path');

/**
 * Hadith Controller
 * 
 * Handles all Hadith-related requests for Sihah Sittah.
 * All data served from local JSON files - NO database or external APIs.
 * Optimized for offline-first operation.
 */

// Path to hadith JSON files (by_book structure)
const HADITH_BASE_PATH = path.join(__dirname, '../../hadith-json/db/by_book/the_9_books');

// Collection metadata
const COLLECTIONS_META = {
  bukhari: {
    id: 'bukhari',
    name: 'Sahih Bukhari',
    nameArabic: 'صحيح البخاري',
    compiler: 'Imam Muhammad ibn Ismail al-Bukhari',
    totalHadiths: 7277
  },
  muslim: {
    id: 'muslim',
    name: 'Sahih Muslim',
    nameArabic: 'صحيح مسلم',
    compiler: 'Imam Muslim ibn al-Hajjaj',
    totalHadiths: 7562
  },
  abudawud: {
    id: 'abudawud',
    name: 'Sunan Abu Dawood',
    nameArabic: 'سنن أبي داود',
    compiler: 'Imam Abu Dawood as-Sijistani',
    totalHadiths: 5274
  },
  tirmidhi: {
    id: 'tirmidhi',
    name: 'Jami` at-Tirmidhi',
    nameArabic: 'جامع الترمذي',
    compiler: 'Imam Muhammad ibn Isa at-Tirmidhi',
    totalHadiths: 3956
  },
  nasai: {
    id: 'nasai',
    name: 'Sunan an-Nasa\'i',
    nameArabic: 'سنن النسائي',
    compiler: 'Imam Ahmad ibn Shu\'ayb an-Nasa\'i',
    totalHadiths: 5764
  },
  ibnmajah: {
    id: 'ibnmajah',
    name: 'Sunan Ibn Majah',
    nameArabic: 'سنن ابن ماجه',
    compiler: 'Imam Muhammad ibn Yazid ibn Majah',
    totalHadiths: 4341
  }
};

/**
 * Helper: Load book JSON file
 */
function loadBookFile(collection) {
  const filePath = path.join(HADITH_BASE_PATH, `${collection}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

/**
 * Get list of available collections
 * GET /api/hadith/collections
 */
exports.getCollections = async (req, res) => {
  try {
    const collections = Object.values(COLLECTIONS_META);

    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    console.error('Error fetching collections:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hadith collections'
    });
  }
};

/**
 * Get chapters/books structure for a collection
 * GET /api/hadith/:collection/chapters
 */
exports.getChapters = async (req, res) => {
  try {
    const { collection } = req.params;

    if (!COLLECTIONS_META[collection]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection. Must be one of: ' + Object.keys(COLLECTIONS_META).join(', ')
      });
    }

    const bookData = loadBookFile(collection);
    if (!bookData || !bookData.chapters) {
      return res.status(404).json({
        success: false,
        message: 'Collection data not found'
      });
    }

    const chapters = bookData.chapters.map(ch => ({
      chapterNumber: ch.id,
      chapterId: ch.id,
      arabicTitle: ch.arabic || '',
      englishTitle: ch.english || '',
      hadithCount: 0 // Would need to count from hadiths array
    }));

    res.status(200).json({
      success: true,
      collection,
      count: chapters.length,
      data: chapters
    });
  } catch (error) {
    console.error('Error fetching chapters:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chapters'
    });
  }
};

/**
 * Get all hadiths from a specific chapter
 * GET /api/hadith/:collection/chapter/:chapterNumber
 */
exports.getChapter = async (req, res) => {
  try {
    const { collection, chapterNumber } = req.params;
    const chapterNum = parseInt(chapterNumber);

    if (!COLLECTIONS_META[collection]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection. Must be one of: ' + Object.keys(COLLECTIONS_META).join(', ')
      });
    }

    if (isNaN(chapterNum) || chapterNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chapter number.'
      });
    }

    const bookData = loadBookFile(collection);
    if (!bookData || !bookData.hadiths) {
      return res.status(404).json({
        success: false,
        message: `Collection ${collection} not found`
      });
    }

    // Find chapter metadata
    const chapterMeta = bookData.chapters.find(ch => ch.id === chapterNum);
    
    // Filter hadiths by chapterId
    const chapterHadiths = bookData.hadiths.filter(h => h.chapterId === chapterNum);

    // Transform hadiths to match frontend expectations
    const transformedHadiths = chapterHadiths.map(hadith => ({
      id: hadith.id,
      collection: collection,
      hadithNumber: hadith.id, // Simple ID
      arabicText: hadith.arabic,
      translationEn: hadith.english?.text || '',
      metadata: {
        narrator: hadith.english?.narrator || '',
        reference: `${COLLECTIONS_META[collection].name} ${hadith.id}`,
        chapterId: hadith.chapterId,
        bookId: hadith.bookId
      }
    }));

    res.status(200).json({
      success: true,
      collection,
      chapterNumber: chapterNum,
      metadata: bookData.metadata,
      chapter: chapterMeta || { id: chapterNum, arabic: '', english: '' },
      hadithCount: transformedHadiths.length,
      data: transformedHadiths
    });
  } catch (error) {
    console.error('Error fetching chapter:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chapter'
    });
  }
};

/**
 * Get a specific hadith by collection and hadith ID
 * GET /api/hadith/:collection/hadith/:hadithId
 */
exports.getHadith = async (req, res) => {
  try {
    const { collection, hadithId } = req.params;
    const id = parseInt(hadithId);

    if (!COLLECTIONS_META[collection]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection. Must be one of: ' + Object.keys(COLLECTIONS_META).join(', ')
      });
    }

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hadith ID.'
      });
    }

    const bookData = loadBookFile(collection);
    if (!bookData || !bookData.hadiths) {
      return res.status(404).json({
        success: false,
        message: `Collection ${collection} not found`
      });
    }

    // Find hadith by ID
    const hadith = bookData.hadiths.find(h => h.id === id);
    
    if (!hadith) {
      return res.status(404).json({
        success: false,
        message: `Hadith ${id} not found in ${collection}`
      });
    }

    // Transform hadith to match frontend expectations
    const transformedHadith = {
      id: hadith.id,
      collection: collection,
      hadithNumber: hadith.id,
      arabicText: hadith.arabic,
      translationEn: hadith.english?.text || '',
      metadata: {
        narrator: hadith.english?.narrator || '',
        reference: `${COLLECTIONS_META[collection].name} ${hadith.id}`,
        chapterId: hadith.chapterId,
        bookId: hadith.bookId
      }
    };

    return res.status(200).json({
      success: true,
      data: transformedHadith
    });
  } catch (error) {
    console.error('Error fetching hadith:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hadith'
    });
  }
};

/**
 * Search hadiths by text
 * GET /api/hadith/:collection/search
 * Query params: q (search query), lang (arabic/english)
 */
exports.searchHadith = async (req, res) => {
  try {
    const { collection } = req.params;
    const { q, lang = 'english' } = req.query;

    if (!COLLECTIONS_META[collection]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection. Must be one of: ' + Object.keys(COLLECTIONS_META).join(', ')
      });
    }

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
    
    // Load hadith data from by_book structure
    const bookData = loadBookFile(collection);
    if (bookData && bookData.hadiths) {
      for (const hadith of bookData.hadiths) {
        const textToSearch = lang === 'arabic' 
          ? hadith.arabic 
          : (hadith.english?.text || '');
        
        if (textToSearch.toLowerCase().includes(searchTerm)) {
          // Transform hadith to match frontend expectations
          results.push({
            id: hadith.id,
            collection: collection,
            hadithNumber: hadith.id,
            arabicText: hadith.arabic,
            translationEn: hadith.english?.text || '',
            chapterId: hadith.chapterId,
            bookId: hadith.bookId,
            metadata: {
              narrator: hadith.english?.narrator || '',
              reference: `${COLLECTIONS_META[collection].name} ${hadith.id}`,
              chapterId: hadith.chapterId,
              bookId: hadith.bookId
            }
          });
          // Stop once we have enough for fetching
          if (results.length >= FETCH_LIMIT) break;
        }
      }
    }

    // Return only top 15 for display
    const displayResults = results.slice(0, DISPLAY_LIMIT);

    res.status(200).json({
      success: true,
      collection,
      query: q,
      count: displayResults.length,
      totalMatches: results.length,
      data: displayResults
    });
  } catch (error) {
    console.error('Error searching hadith:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search hadith'
    });
  }
};

/**
 * Get all hadiths from a collection (with pagination)
 * GET /api/hadith/:collection
 */
exports.getCollectionHadith = async (req, res) => {
  try {
    const { collection } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const bookNumber = req.query.bookNumber ? parseInt(req.query.bookNumber) : null;

    if (!COLLECTIONS_META[collection]) {
      return res.status(404).json({
        success: false,
        message: `Collection '${collection}' not found`
      });
    }

    // Load hadith data from by_book structure
    const bookData = loadBookFile(collection);
    if (!bookData || !bookData.hadiths) {
      return res.status(404).json({
        success: false,
        message: `Collection data not found for ${collection}`
      });
    }

    let allHadiths = bookData.hadiths;

    // Filter by book number if specified
    if (bookNumber) {
      allHadiths = allHadiths.filter(h => h.bookId === bookNumber);
    }

    // Transform each hadith to match frontend expectations
    const transformedHadiths = allHadiths.map(hadith => {
      return {
        id: hadith.id,
        collection: collection,
        hadithNumber: hadith.id,
        arabicText: hadith.arabic,
        translationEn: hadith.english?.text || '',
        metadata: {
          narrator: hadith.english?.narrator || '',
          reference: `${COLLECTIONS_META[collection].name} ${hadith.id}`,
          chapterId: hadith.chapterId,
          bookId: hadith.bookId
        },
        chapterId: hadith.chapterId,
        bookId: hadith.bookId
      };
    });
    allHadiths = transformedHadiths;

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHadiths = allHadiths.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      collection,
      page,
      limit,
      totalHadiths: allHadiths.length,
      totalPages: Math.ceil(allHadiths.length / limit),
      data: paginatedHadiths
    });
  } catch (error) {
    console.error('Error fetching collection hadith:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection hadith'
    });
  }
};

/**
 * Get specific hadith by collection and hadith number
 * GET /api/hadith/:collection/:hadithNumber
 */
exports.getHadithByNumber = async (req, res) => {
  try {
    const { collection, hadithNumber } = req.params;
    const hadithNum = parseInt(hadithNumber);

    if (!COLLECTIONS_META[collection]) {
      return res.status(404).json({
        success: false,
        message: `Collection '${collection}' not found`
      });
    }

    if (isNaN(hadithNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hadith number'
      });
    }

    // Load hadith data from by_book structure
    const bookData = loadBookFile(collection);
    if (bookData && bookData.hadiths) {
      const hadith = bookData.hadiths.find(h => h.id === hadithNum || h.idInBook === hadithNum);
      if (hadith) {
        // Transform hadith to match frontend expectations
        const transformedHadith = {
          id: hadith.id,
          collection: collection,
          hadithNumber: hadith.id,
          arabicText: hadith.arabic,
          translationEn: hadith.english?.text || '',
          metadata: {
            narrator: hadith.english?.narrator || '',
            reference: `${COLLECTIONS_META[collection].name} ${hadith.id}`,
            chapterId: hadith.chapterId,
            bookId: hadith.bookId
          },
          chapterId: hadith.chapterId,
          bookId: hadith.bookId
        };
        return res.status(200).json({
          success: true,
          collection,
          hadithNumber: hadithNum,
          data: transformedHadith
        });
      }
    }

    res.status(404).json({
      success: false,
      message: `Hadith #${hadithNum} not found in ${collection}`
    });
  } catch (error) {
    console.error('Error fetching hadith by number:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hadith'
    });
  }
};

/**
 * Get books/chapters list for a collection
 * GET /api/hadith/:collection/books
 */
exports.getBooks = async (req, res) => {
  try {
    const { collection } = req.params;

    if (!COLLECTIONS_META[collection]) {
      return res.status(404).json({
        success: false,
        message: `Collection '${collection}' not found`
      });
    }

    // Load hadith data from by_book structure
    const bookData = loadBookFile(collection);
    if (!bookData || !bookData.chapters) {
      return res.status(404).json({
        success: false,
        message: `Collection data not found for ${collection}`
      });
    }

    const books = bookData.chapters.map(chapter => ({
      bookNumber: chapter.id,
      chapterNumber: chapter.id,
      englishTitle: chapter.english || '',
      arabicTitle: chapter.arabic || '',
      hadithCount: bookData.hadiths.filter(h => h.chapterId === chapter.id).length
    }));

    res.status(200).json({
      success: true,
      collection,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Error fetching books:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books'
    });
  }
};

/**
 * Get database statistics
 * GET /api/hadith/stats
 */
exports.getStats = async (req, res) => {
  try {
    const collections = Object.keys(COLLECTIONS_META);
    
    const stats = collections.map(collection => {
      const bookData = loadBookFile(collection);
      let totalHadiths = 0;
      let chapterCount = 0;
      
      if (bookData) {
        totalHadiths = bookData.hadiths ? bookData.hadiths.length : 0;
        chapterCount = bookData.chapters ? bookData.chapters.length : 0;
      }

      return {
        collection,
        chapters: chapterCount,
        hadiths: totalHadiths
      };
    });

    const total = stats.reduce((sum, stat) => sum + stat.hadiths, 0);

    res.status(200).json({
      success: true,
      data: {
        totalHadiths: total,
        byCollection: stats
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
