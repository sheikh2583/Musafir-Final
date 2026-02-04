/**
 * Tafsir Quiz Generator
 * Generates quiz questions programmatically from tafsir/explanation content
 * 
 * Question types:
 * - Main message of the ayah
 * - Concept emphasized
 * - Warning or promise contained
 */

const fs = require('fs');
const path = require('path');

// Paths
const TAFSIR_PATH = path.join(__dirname, '../../tazkirul-quran-en.json/tazkirul-quran-en.json');
const SURAH_METADATA_PATH = path.join(__dirname, '../../quran/surah.json');
const OUTPUT_DIR = path.join(__dirname, '../../quran/quiz');

// Question templates - dynamically selected based on content analysis
const QUESTION_TEMPLATES = {
  mainMessage: [
    "What is the main message of Surah {surahName}, Ayah {ayahNum}?",
    "What does this verse primarily teach us?",
    "What is the central theme of this ayah?"
  ],
  concept: [
    "Which concept is emphasized in Surah {surahName}, Ayah {ayahNum}?",
    "What key concept does this verse highlight?",
    "Which important teaching is conveyed in this ayah?"
  ],
  warningPromise: [
    "What does this verse warn or promise?",
    "What warning or glad tiding is mentioned in Surah {surahName}, Ayah {ayahNum}?",
    "What consequence is described in this ayah?"
  ],
  understanding: [
    "According to the tafsir, what should we understand from this verse?",
    "What insight does the explanation provide about this ayah?",
    "What deeper meaning is explained in this verse?"
  ]
};

// Keywords for content classification
const CONTENT_MARKERS = {
  warning: ['warn', 'punishment', 'wrath', 'fire', 'hell', 'doom', 'destruction', 'suffer', 'torment', 'curse', 'disbeliev', 'reject', 'deny', 'astray', 'evil', 'sin', 'disobey'],
  promise: ['paradise', 'garden', 'reward', 'bless', 'mercy', 'success', 'promise', 'glad tiding', 'heaven', 'eternal', 'grace', 'forgive', 'righteous', 'believer', 'faithful'],
  guidance: ['guid', 'path', 'straight', 'truth', 'light', 'wisdom', 'teach', 'learn', 'understand', 'know', 'reflect', 'ponder'],
  worship: ['worship', 'prayer', 'bow', 'prostrat', 'submit', 'servant', 'devotion', 'rememb', 'glorif', 'praise'],
  unity: ['one god', 'tawhid', 'alone', 'no partner', 'monothe', 'oneness', 'unique'],
  morality: ['moral', 'character', 'virtue', 'honest', 'just', 'fair', 'kind', 'patient', 'grateful', 'humble'],
  hereafter: ['hereafter', 'resurrection', 'day of judgement', 'account', 'reckoning', 'life to come', 'next world', 'final'],
  creation: ['creat', 'made', 'heaven', 'earth', 'universe', 'world', 'nature', 'sign']
};

/**
 * Strip HTML tags and clean text
 */
function cleanText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

/**
 * Extract key sentences from tafsir text
 */
function extractKeySentences(text, maxSentences = 3) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Score sentences by importance (containing key terms)
  const scoredSentences = sentences.map(sentence => {
    let score = 0;
    const lowerSentence = sentence.toLowerCase();
    
    // Higher score for sentences with important markers
    Object.values(CONTENT_MARKERS).flat().forEach(marker => {
      if (lowerSentence.includes(marker)) score += 1;
    });
    
    // Prefer sentences that are not too long or too short
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 40) score += 2;
    
    return { sentence: sentence.trim(), score };
  });
  
  // Sort by score and take top sentences
  return scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map(s => s.sentence);
}

/**
 * Analyze tafsir content to determine question type and extract answer
 */
function analyzeContent(text) {
  const lowerText = text.toLowerCase();
  const analysis = {
    hasWarning: false,
    hasPromise: false,
    hasGuidance: false,
    hasWorship: false,
    hasUnity: false,
    hasMorality: false,
    hasHereafter: false,
    hasCreation: false,
    dominantTheme: 'understanding',
    keywords: []
  };
  
  // Check for each content type
  CONTENT_MARKERS.warning.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasWarning = true;
      analysis.keywords.push(marker);
    }
  });
  
  CONTENT_MARKERS.promise.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasPromise = true;
      analysis.keywords.push(marker);
    }
  });
  
  CONTENT_MARKERS.guidance.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasGuidance = true;
      analysis.keywords.push(marker);
    }
  });
  
  CONTENT_MARKERS.worship.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasWorship = true;
      analysis.keywords.push(marker);
    }
  });
  
  CONTENT_MARKERS.unity.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasUnity = true;
      analysis.keywords.push(marker);
    }
  });
  
  CONTENT_MARKERS.morality.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasMorality = true;
      analysis.keywords.push(marker);
    }
  });
  
  CONTENT_MARKERS.hereafter.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasHereafter = true;
      analysis.keywords.push(marker);
    }
  });
  
  CONTENT_MARKERS.creation.forEach(marker => {
    if (lowerText.includes(marker)) {
      analysis.hasCreation = true;
      analysis.keywords.push(marker);
    }
  });
  
  // Determine dominant theme
  if (analysis.hasWarning || analysis.hasPromise) {
    analysis.dominantTheme = 'warningPromise';
  } else if (analysis.hasGuidance || analysis.hasUnity) {
    analysis.dominantTheme = 'concept';
  } else if (analysis.hasWorship || analysis.hasMorality || analysis.hasHereafter) {
    analysis.dominantTheme = 'mainMessage';
  }
  
  return analysis;
}

/**
 * Generate a concise answer from tafsir text
 */
function generateAnswer(text, analysis) {
  const keySentences = extractKeySentences(text, 2);
  
  if (keySentences.length === 0) {
    return text.substring(0, 200).trim() + '...';
  }
  
  // Combine key sentences into answer (max 300 chars)
  let answer = keySentences[0];
  if (answer.length < 150 && keySentences.length > 1) {
    answer += '. ' + keySentences[1];
  }
  
  // Truncate if too long
  if (answer.length > 300) {
    answer = answer.substring(0, 297) + '...';
  }
  
  return answer;
}

/**
 * Generate distractor answers based on theme
 */
function generateDistractors(correctAnswer, analysis, allAnswers) {
  const distractors = [];
  
  // Theme-based generic distractors
  const themeDistractors = {
    warningPromise: [
      "This verse discusses the creation of the universe",
      "This verse talks about the stories of previous prophets",
      "This verse explains the rules of inheritance",
      "This verse describes the characteristics of believers"
    ],
    concept: [
      "This verse warns about the punishment of disbelievers",
      "This verse promises paradise to the righteous",
      "This verse narrates a historical event",
      "This verse gives rulings on trade and commerce"
    ],
    mainMessage: [
      "This verse discusses legal matters",
      "This verse talks about the Day of Judgment only",
      "This verse is about the battles of early Muslims",
      "This verse describes the creation of mankind"
    ],
    understanding: [
      "This verse only discusses worldly matters",
      "This verse is primarily about historical events",
      "This verse focuses on scientific facts",
      "This verse addresses only legal rulings"
    ]
  };
  
  // Get theme-specific distractors
  const themeOptions = themeDistractors[analysis.dominantTheme] || themeDistractors.understanding;
  
  // Randomly select 3 distractors
  const shuffled = themeOptions.sort(() => 0.5 - Math.random());
  distractors.push(...shuffled.slice(0, 3));
  
  return distractors;
}

/**
 * Generate quiz question for an ayah
 */
function generateQuizQuestion(ayahKey, tafsirText, surahName, analysis, questionIndex) {
  const [surahNum, ayahNum] = ayahKey.split(':').map(Number);
  
  // Select question template based on analysis
  const templates = QUESTION_TEMPLATES[analysis.dominantTheme];
  const templateIndex = questionIndex % templates.length;
  
  let questionText = templates[templateIndex]
    .replace('{surahName}', surahName)
    .replace('{ayahNum}', ayahNum);
  
  // Generate answer
  const correctAnswer = generateAnswer(tafsirText, analysis);
  
  // Generate distractors
  const distractors = generateDistractors(correctAnswer, analysis, []);
  
  return {
    id: `tafsir_${surahNum}_${ayahNum}_${questionIndex}`,
    type: 'tafsir',
    questionType: analysis.dominantTheme,
    question: questionText,
    correctAnswer: correctAnswer,
    distractors: distractors,
    surahNumber: surahNum,
    ayahNumber: ayahNum,
    ayahKey: ayahKey,
    themes: {
      hasWarning: analysis.hasWarning,
      hasPromise: analysis.hasPromise,
      hasGuidance: analysis.hasGuidance,
      hasWorship: analysis.hasWorship,
      hasUnity: analysis.hasUnity,
      hasMorality: analysis.hasMorality,
      hasHereafter: analysis.hasHereafter,
      hasCreation: analysis.hasCreation
    },
    difficulty: tafsirText.length > 500 ? 'medium' : 'easy',
    keywords: [...new Set(analysis.keywords)].slice(0, 5)
  };
}

/**
 * Main function to process all tafsir and generate quizzes
 */
async function generateTafsirQuizzes() {
  console.log('🕌 Tafsir Quiz Generator');
  console.log('========================\n');
  
  // Load tafsir data
  console.log('📖 Loading tafsir data...');
  const tafsirData = JSON.parse(fs.readFileSync(TAFSIR_PATH, 'utf-8'));
  
  // Load surah metadata
  console.log('📚 Loading surah metadata...');
  const surahMetadata = JSON.parse(fs.readFileSync(SURAH_METADATA_PATH, 'utf-8'));
  
  // Create surah name lookup
  const surahNames = {};
  surahMetadata.forEach((surah, index) => {
    // Handle both array index and explicit index property
    const surahNum = surah.index ? parseInt(surah.index) : index + 1;
    surahNames[surahNum] = surah.title || surah.name || `Surah ${surahNum}`;
  });
  
  // Process tafsir and resolve references
  console.log('🔄 Processing tafsir entries...\n');
  
  const resolvedTafsir = {};
  
  for (const [key, value] of Object.entries(tafsirData)) {
    if (typeof value === 'string') {
      // This is a reference to another ayah
      resolvedTafsir[key] = tafsirData[value];
    } else if (value && value.text) {
      resolvedTafsir[key] = value;
    }
  }
  
  // Group by surah
  const surahTafsir = {};
  
  for (const [ayahKey, tafsirEntry] of Object.entries(resolvedTafsir)) {
    if (!tafsirEntry || !tafsirEntry.text) continue;
    
    const surahNum = parseInt(ayahKey.split(':')[0]);
    if (!surahTafsir[surahNum]) {
      surahTafsir[surahNum] = [];
    }
    
    // Only add primary entries (not references)
    const originalEntry = tafsirData[ayahKey];
    if (typeof originalEntry !== 'string') {
      surahTafsir[surahNum].push({
        ayahKey,
        tafsir: tafsirEntry,
        coveredAyahs: tafsirEntry.ayah_keys || [ayahKey]
      });
    }
  }
  
  // Generate quizzes per surah
  const allQuizzes = {};
  let totalQuestions = 0;
  let totalSurahs = 0;
  
  const stats = {
    byTheme: {
      warningPromise: 0,
      concept: 0,
      mainMessage: 0,
      understanding: 0
    },
    byDifficulty: {
      easy: 0,
      medium: 0,
      hard: 0
    }
  };
  
  for (let surahNum = 1; surahNum <= 114; surahNum++) {
    const entries = surahTafsir[surahNum] || [];
    const surahName = surahNames[surahNum] || `Surah ${surahNum}`;
    
    if (entries.length === 0) {
      console.log(`⚠️  Surah ${surahNum} (${surahName}): No tafsir entries found`);
      continue;
    }
    
    const surahQuizzes = [];
    let questionIndex = 0;
    
    for (const entry of entries) {
      const cleanedText = cleanText(entry.tafsir.text);
      
      // Skip if text is too short
      if (cleanedText.length < 100) continue;
      
      // Analyze content
      const analysis = analyzeContent(cleanedText);
      
      // Generate question
      const question = generateQuizQuestion(
        entry.ayahKey,
        cleanedText,
        surahName,
        analysis,
        questionIndex
      );
      
      // Add covered ayahs info
      question.coveredAyahs = entry.coveredAyahs;
      
      surahQuizzes.push(question);
      questionIndex++;
      
      // Update stats
      stats.byTheme[analysis.dominantTheme]++;
      stats.byDifficulty[question.difficulty]++;
    }
    
    if (surahQuizzes.length > 0) {
      allQuizzes[surahNum] = {
        surahNumber: surahNum,
        surahName: surahName,
        totalQuestions: surahQuizzes.length,
        questions: surahQuizzes
      };
      
      totalQuestions += surahQuizzes.length;
      totalSurahs++;
      
      console.log(`✅ Surah ${surahNum.toString().padStart(3)} (${surahName.padEnd(20)}): ${surahQuizzes.length} questions`);
    }
  }
  
  // Save individual surah quiz files
  console.log('\n💾 Saving quiz files...');
  
  for (const [surahNum, quizData] of Object.entries(allQuizzes)) {
    // Read existing quiz file and merge
    const quizFilePath = path.join(OUTPUT_DIR, `quiz_${surahNum}.json`);
    
    let existingQuiz = { vocabularyQuiz: [], tafsirQuiz: [] };
    if (fs.existsSync(quizFilePath)) {
      existingQuiz = JSON.parse(fs.readFileSync(quizFilePath, 'utf-8'));
    }
    
    // Update with tafsir quizzes
    existingQuiz.tafsirQuiz = quizData.questions;
    existingQuiz.tafsirQuizCount = quizData.questions.length;
    existingQuiz.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(quizFilePath, JSON.stringify(existingQuiz, null, 2));
  }
  
  // Save combined tafsir quiz file
  const combinedPath = path.join(OUTPUT_DIR, '_tafsir_quizzes.json');
  fs.writeFileSync(combinedPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalSurahs,
    totalQuestions,
    statistics: stats,
    quizzesBySurah: allQuizzes
  }, null, 2));
  
  // Save summary
  const summaryPath = path.join(OUTPUT_DIR, '_tafsir_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalSurahs,
    totalQuestions,
    statistics: stats,
    surahBreakdown: Object.entries(allQuizzes).map(([num, data]) => ({
      surahNumber: parseInt(num),
      surahName: data.surahName,
      questionCount: data.totalQuestions
    }))
  }, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TAFSIR QUIZ GENERATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Total Surahs with Quizzes: ${totalSurahs}`);
  console.log(`   Total Questions Generated: ${totalQuestions}`);
  console.log('\n📈 Questions by Theme:');
  console.log(`   - Warning/Promise: ${stats.byTheme.warningPromise}`);
  console.log(`   - Concept:         ${stats.byTheme.concept}`);
  console.log(`   - Main Message:    ${stats.byTheme.mainMessage}`);
  console.log(`   - Understanding:   ${stats.byTheme.understanding}`);
  console.log('\n📊 Questions by Difficulty:');
  console.log(`   - Easy:   ${stats.byDifficulty.easy}`);
  console.log(`   - Medium: ${stats.byDifficulty.medium}`);
  console.log(`\n📁 Output Directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(50));
}

// Run the generator
generateTafsirQuizzes().catch(console.error);
