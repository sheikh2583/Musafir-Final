/**
 * Extract unique Arabic words from quran.json for vocabulary quiz generation
 * WITH dictionary lookup and fallback strategy
 * 
 * Fallback Strategy:
 * 1. Look up word in dictionary.json (normalized form)
 * 2. If found: populate meaning, transliteration, category
 * 3. If not found: mark as "pending_translation" with status field
 */

const fs = require('fs');
const path = require('path');

// Load surah metadata
function loadSurahMetadata() {
  const surahPath = path.join(__dirname, '..', '..', 'quran', 'surah.json');
  try {
    const data = JSON.parse(fs.readFileSync(surahPath, 'utf-8'));
    const metadata = {};
    data.forEach(surah => {
      const num = parseInt(surah.index);
      metadata[num] = {
        en: surah.title,
        ar: surah.titleAr
      };
    });
    return metadata;
  } catch (e) {
    console.log('⚠️ Could not load surah.json, using fallback names');
    return {};
  }
}

// Load dictionary
function loadDictionary() {
  const dictPath = path.join(__dirname, '..', '..', 'quran', 'quiz', 'dictionary.json');
  try {
    const data = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
    return data.words || {};
  } catch (e) {
    console.log('⚠️ Could not load dictionary.json, all words will be marked as pending');
    return {};
  }
}

/**
 * Normalize Arabic word by removing diacritics for dictionary lookup
 */
function normalizeArabicWord(word) {
  return word
    .replace(/[\u064B-\u065F]/g, '')  // Remove harakat
    .replace(/[\u0610-\u061A]/g, '')  // Remove other marks
    .replace(/[\u06D6-\u06ED]/g, '')  // Remove Quranic annotations
    .replace(/ٱ/g, 'ا')               // Replace alif wasl with regular alif
    .replace(/ۡ/g, '')                // Remove small high dotless head of khah
    .replace(/ۚ/g, '')                // Remove end of ayah marks
    .replace(/ۖ/g, '')
    .replace(/ۗ/g, '')
    .replace(/ۘ/g, '')
    .replace(/ۙ/g, '')
    .replace(/ۛ/g, '')
    .replace(/ۜ/g, '')
    .replace(/۟/g, '')
    .replace(/۠/g, '')
    .replace(/ۢ/g, '')
    .replace(/ۣ/g, '')
    .replace(/ۤ/g, '')
    .replace(/ۥ/g, '')
    .replace(/ۦ/g, '')
    .replace(/ۧ/g, '')
    .replace(/ۨ/g, '')
    .replace(/۩/g, '')
    .replace(/۪/g, '')
    .replace(/۫/g, '')
    .replace(/۬/g, '')
    .replace(/ۭ/g, '')
    .trim();
}

/**
 * Additional normalization for dictionary matching
 * Removes definite article "ال" for better matching
 */
function normalizeForDictionary(word) {
  let normalized = normalizeArabicWord(word);
  // Remove common prefixes for matching
  if (normalized.startsWith('ال')) {
    normalized = normalized.substring(2);
  }
  if (normalized.startsWith('و')) {
    normalized = normalized.substring(1);
  }
  if (normalized.startsWith('ف')) {
    normalized = normalized.substring(1);
  }
  if (normalized.startsWith('ب')) {
    normalized = normalized.substring(1);
  }
  if (normalized.startsWith('ل')) {
    normalized = normalized.substring(1);
  }
  return normalized;
}

/**
 * Look up word in dictionary with multiple matching strategies
 */
function lookupWord(word, dictionary) {
  const normalized = normalizeArabicWord(word);
  const forDict = normalizeForDictionary(word);
  
  // Strategy 1: Exact normalized match
  if (dictionary[normalized]) {
    return { ...dictionary[normalized], matchType: 'exact' };
  }
  
  // Strategy 2: Without common prefixes
  if (dictionary[forDict]) {
    return { ...dictionary[forDict], matchType: 'root' };
  }
  
  // Strategy 3: Check if dictionary word is contained in our word
  for (const [dictWord, entry] of Object.entries(dictionary)) {
    if (normalized.includes(dictWord) && dictWord.length >= 2) {
      return { ...entry, matchType: 'partial' };
    }
  }
  
  return null;
}

/**
 * Check if a string contains Arabic characters
 */
function isArabicWord(word) {
  return /[\u0600-\u06FF]/.test(word);
}

/**
 * Generate common distractors based on category
 */
function generatePlaceholderDistractors(category) {
  const distractorPools = {
    'name-of-allah': ['The Creator', 'The Provider', 'The Sustainer'],
    'verb': ['He went', 'They came', 'We saw'],
    'noun': ['The book', 'The path', 'The day'],
    'pronoun': ['He', 'They', 'We'],
    'preposition': ['In', 'From', 'To'],
    'particle': ['Not', 'Indeed', 'When'],
    'adjective': ['Great', 'Small', 'Near'],
    'phrase': ['In the name of', 'By the grace of', 'With the help of'],
    'default': ['Option A', 'Option B', 'Option C']
  };
  
  return distractorPools[category] || distractorPools['default'];
}

/**
 * Extract unique words from a surah with dictionary lookup
 */
function extractWordsFromSurah(surahNumber, ayahs, dictionary) {
  const wordMap = new Map();
  
  ayahs.forEach((ayah) => {
    const { verse, text } = ayah;
    const ayahRef = `${surahNumber}:${verse}`;
    
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    words.forEach((word, index) => {
      if (!isArabicWord(word) || word.length < 2) return;
      
      const normalized = normalizeArabicWord(word);
      
      if (!wordMap.has(normalized)) {
        // Look up in dictionary
        const dictEntry = lookupWord(word, dictionary);
        
        wordMap.set(normalized, {
          arabicWord: word,
          normalizedForm: normalized,
          dictEntry: dictEntry,
          firstOccurrence: ayahRef,
          occurrences: [{ ayahRef, position: index }],
          count: 1
        });
      } else {
        const existing = wordMap.get(normalized);
        existing.count++;
        existing.occurrences.push({ ayahRef, position: index });
      }
    });
  });
  
  return wordMap;
}

/**
 * Convert word map to quiz-ready vocabulary array with fallback handling
 */
function toQuizVocabularyFormat(surahNumber, wordMap) {
  const quizWords = [];
  let wordIndex = 1;
  let foundCount = 0;
  let pendingCount = 0;
  
  wordMap.forEach((wordData, normalized) => {
    const dictEntry = wordData.dictEntry;
    const hasTranslation = dictEntry !== null;
    
    if (hasTranslation) foundCount++;
    else pendingCount++;
    
    // Determine difficulty based on occurrence count and translation availability
    let difficulty;
    if (wordData.count > 5) difficulty = 'easy';
    else if (wordData.count > 2) difficulty = 'medium';
    else difficulty = 'hard';
    
    const quizEntry = {
      id: `vocab_${surahNumber}_${wordIndex}`,
      arabicWord: wordData.arabicWord,
      normalizedForm: normalized,
      
      // Translation data (filled if found, placeholder if not)
      transliteration: hasTranslation ? dictEntry.transliteration : '',
      correctMeaning: hasTranslation ? dictEntry.meaning : '',
      distractors: hasTranslation 
        ? generatePlaceholderDistractors(dictEntry.category)
        : [],
      
      // Status tracking for fallback
      translationStatus: hasTranslation ? 'complete' : 'pending',
      matchType: hasTranslation ? dictEntry.matchType : null,
      
      // Reference data
      ayahReference: wordData.firstOccurrence,
      occurrenceCount: wordData.count,
      allOccurrences: wordData.occurrences,
      
      // Categorization
      difficulty: difficulty,
      category: hasTranslation ? dictEntry.category : 'unknown',
      tags: hasTranslation ? [dictEntry.category] : ['needs-review']
    };
    
    quizWords.push(quizEntry);
    wordIndex++;
  });
  
  return { quizWords, foundCount, pendingCount };
}

/**
 * Main function to extract words from all surahs
 */
async function extractQuranWords() {
  const quranPath = path.join(__dirname, '..', 'quran.json');
  const outputDir = path.join(__dirname, '..', '..', 'quran', 'quiz');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('📖 Reading quran.json...');
  const quranData = JSON.parse(fs.readFileSync(quranPath, 'utf-8'));
  
  console.log('📚 Loading dictionary...');
  const dictionary = loadDictionary();
  console.log(`   Found ${Object.keys(dictionary).length} dictionary entries`);
  
  console.log('📋 Loading surah metadata...');
  const surahNames = loadSurahMetadata();
  
  const summary = {
    totalSurahs: 0,
    totalUniqueWords: 0,
    totalTranslated: 0,
    totalPending: 0,
    surahStats: []
  };
  
  // Process each surah
  for (const surahNum of Object.keys(quranData)) {
    const surahNumber = parseInt(surahNum);
    const ayahs = quranData[surahNum];
    
    console.log(`\n📝 Processing Surah ${surahNumber}...`);
    
    // Extract unique words with dictionary lookup
    const wordMap = extractWordsFromSurah(surahNumber, ayahs, dictionary);
    const { quizWords, foundCount, pendingCount } = toQuizVocabularyFormat(surahNumber, wordMap);
    
    // Get surah name
    const surahMeta = surahNames[surahNumber] || { en: `Surah ${surahNumber}`, ar: '' };
    
    // Create quiz structure
    const quizData = {
      surahNumber: surahNumber,
      surahName: surahMeta.en,
      surahNameArabic: surahMeta.ar,
      lastUpdated: new Date().toISOString(),
      
      vocabularyQuiz: quizWords,
      
      tafsirQuiz: [],
      
      metadata: {
        totalVocabQuestions: quizWords.length,
        totalTafsirQuestions: 0,
        totalAyahs: ayahs.length,
        translationStats: {
          complete: foundCount,
          pending: pendingCount,
          completionRate: quizWords.length > 0 
            ? Math.round((foundCount / quizWords.length) * 100) 
            : 0
        },
        difficultyBreakdown: {
          easy: quizWords.filter(w => w.difficulty === 'easy').length,
          medium: quizWords.filter(w => w.difficulty === 'medium').length,
          hard: quizWords.filter(w => w.difficulty === 'hard').length
        }
      }
    };
    
    // Save quiz file
    const outputPath = path.join(outputDir, `quiz_${surahNumber}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(quizData, null, 2), 'utf-8');
    
    console.log(`   ✅ Found ${quizWords.length} unique words`);
    console.log(`   📗 Translated: ${foundCount} | 📙 Pending: ${pendingCount}`);
    console.log(`   💾 Saved to quiz_${surahNumber}.json`);
    
    // Update summary
    summary.totalSurahs++;
    summary.totalUniqueWords += quizWords.length;
    summary.totalTranslated += foundCount;
    summary.totalPending += pendingCount;
    summary.surahStats.push({
      surahNumber,
      name: surahMeta.en,
      uniqueWords: quizWords.length,
      translated: foundCount,
      pending: pendingCount,
      completionRate: quizWords.length > 0 
        ? Math.round((foundCount / quizWords.length) * 100) 
        : 0,
      totalAyahs: ayahs.length
    });
  }
  
  // Save summary
  summary.overallCompletionRate = summary.totalUniqueWords > 0 
    ? Math.round((summary.totalTranslated / summary.totalUniqueWords) * 100) 
    : 0;
  
  const summaryPath = path.join(outputDir, '_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  
  // Generate pending words report
  const pendingReport = generatePendingReport(outputDir);
  const pendingPath = path.join(outputDir, '_pending_translations.json');
  fs.writeFileSync(pendingPath, JSON.stringify(pendingReport, null, 2), 'utf-8');
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 EXTRACTION COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Total Surahs: ${summary.totalSurahs}`);
  console.log(`   Total Unique Words: ${summary.totalUniqueWords}`);
  console.log(`   ✅ Translated: ${summary.totalTranslated} (${summary.overallCompletionRate}%)`);
  console.log(`   ⏳ Pending: ${summary.totalPending}`);
  console.log(`   Output Directory: ${outputDir}`);
  console.log('='.repeat(50));
}

/**
 * Generate a report of all words needing translation
 */
function generatePendingReport(outputDir) {
  const pendingWords = new Map();
  
  // Read all quiz files
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith('quiz_') && f.endsWith('.json'));
  
  files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf-8'));
    
    data.vocabularyQuiz
      .filter(w => w.translationStatus === 'pending')
      .forEach(word => {
        const normalized = word.normalizedForm;
        if (!pendingWords.has(normalized)) {
          pendingWords.set(normalized, {
            arabicWord: word.arabicWord,
            normalizedForm: normalized,
            transliteration: '',
            meaning: '',
            category: '',
            occurrences: [],
            totalCount: 0
          });
        }
        const entry = pendingWords.get(normalized);
        entry.occurrences.push({
          surah: data.surahNumber,
          ayah: word.ayahReference,
          count: word.occurrenceCount
        });
        entry.totalCount += word.occurrenceCount;
      });
  });
  
  // Sort by total occurrences (most common first - prioritize these for translation)
  const sortedWords = Array.from(pendingWords.values())
    .sort((a, b) => b.totalCount - a.totalCount);
  
  return {
    description: 'Words pending translation - sorted by frequency (most common first)',
    generatedAt: new Date().toISOString(),
    totalPendingWords: sortedWords.length,
    instructions: 'Fill in transliteration, meaning, and category for each word. Then re-run extraction.',
    words: sortedWords
  };
}

// Run the extraction
extractQuranWords().catch(console.error);
