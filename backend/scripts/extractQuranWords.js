/**
 * Extract unique Arabic words from quran.json for vocabulary quiz generation
 * 
 * Reads quran.json, iterates through each surah → ayah,
 * splits Arabic text by spaces, removes duplicates per surah,
 * and outputs quiz-ready word data.
 */

const fs = require('fs');
const path = require('path');

// Surah metadata for names (you can expand this or load from surah.json)
const surahNames = {
  1: { en: 'Al-Fatiha', ar: 'الفاتحة' },
  2: { en: 'Al-Baqara', ar: 'البقرة' },
  3: { en: 'Aal-Imran', ar: 'آل عمران' },
  // ... add more or load from quran/surah.json
};

/**
 * Clean Arabic word by removing common diacritics for comparison
 * but keeping the original for display
 */
function normalizeArabicWord(word) {
  // Remove Arabic diacritics (tashkeel) for comparison
  return word
    .replace(/[\u064B-\u065F]/g, '')  // Remove harakat (fatha, damma, kasra, etc.)
    .replace(/[\u0610-\u061A]/g, '')  // Remove other marks
    .replace(/[\u06D6-\u06ED]/g, '')  // Remove Quranic annotation marks
    .trim();
}

/**
 * Check if a string contains Arabic characters
 */
function isArabicWord(word) {
  return /[\u0600-\u06FF]/.test(word);
}

/**
 * Extract unique words from a surah
 */
function extractWordsFromSurah(surahNumber, ayahs) {
  const wordMap = new Map(); // normalized word -> { original, ayahRef, count }
  
  ayahs.forEach((ayah) => {
    const { verse, text } = ayah;
    const ayahRef = `${surahNumber}:${verse}`;
    
    // Split by spaces and filter empty strings
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    words.forEach((word, index) => {
      // Skip non-Arabic or very short words
      if (!isArabicWord(word) || word.length < 2) return;
      
      const normalized = normalizeArabicWord(word);
      
      if (!wordMap.has(normalized)) {
        wordMap.set(normalized, {
          arabicWord: word,           // Keep original with diacritics
          normalizedForm: normalized,
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
 * Convert word map to quiz-ready vocabulary array
 */
function toQuizVocabularyFormat(surahNumber, wordMap) {
  const quizWords = [];
  let wordIndex = 1;
  
  wordMap.forEach((wordData, normalized) => {
    quizWords.push({
      id: `vocab_${surahNumber}_${wordIndex}`,
      arabicWord: wordData.arabicWord,
      transliteration: '',          // To be filled later (manually or via API)
      correctMeaning: '',           // To be filled later
      distractors: [],              // To be generated later
      ayahReference: wordData.firstOccurrence,
      occurrenceCount: wordData.count,
      allOccurrences: wordData.occurrences,
      difficulty: wordData.count > 3 ? 'easy' : wordData.count > 1 ? 'medium' : 'hard',
      tags: []
    });
    wordIndex++;
  });
  
  return quizWords;
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
  
  const summary = {
    totalSurahs: 0,
    totalUniqueWords: 0,
    surahStats: []
  };
  
  // Process each surah
  for (const surahNum of Object.keys(quranData)) {
    const surahNumber = parseInt(surahNum);
    const ayahs = quranData[surahNum];
    
    console.log(`\n📝 Processing Surah ${surahNumber}...`);
    
    // Extract unique words
    const wordMap = extractWordsFromSurah(surahNumber, ayahs);
    const quizWords = toQuizVocabularyFormat(surahNumber, wordMap);
    
    // Get surah name (fallback if not in our map)
    const surahMeta = surahNames[surahNumber] || { en: `Surah ${surahNumber}`, ar: '' };
    
    // Create quiz structure
    const quizData = {
      surahNumber: surahNumber,
      surahName: surahMeta.en,
      surahNameArabic: surahMeta.ar,
      lastUpdated: new Date().toISOString(),
      
      vocabularyQuiz: quizWords,
      
      tafsirQuiz: [],  // To be populated separately from tafsir data
      
      metadata: {
        totalVocabQuestions: quizWords.length,
        totalTafsirQuestions: 0,
        totalAyahs: ayahs.length,
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
    console.log(`   💾 Saved to quiz_${surahNumber}.json`);
    
    // Update summary
    summary.totalSurahs++;
    summary.totalUniqueWords += quizWords.length;
    summary.surahStats.push({
      surahNumber,
      name: surahMeta.en,
      uniqueWords: quizWords.length,
      totalAyahs: ayahs.length
    });
  }
  
  // Save summary
  const summaryPath = path.join(outputDir, '_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 EXTRACTION COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Total Surahs: ${summary.totalSurahs}`);
  console.log(`   Total Unique Words: ${summary.totalUniqueWords}`);
  console.log(`   Output Directory: ${outputDir}`);
  console.log('='.repeat(50));
}

// Run the extraction
extractQuranWords().catch(console.error);
