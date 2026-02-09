const mongoose = require('mongoose');

/**
 * Surah Metadata Model
 * 
 * Stores metadata for each of the 114 surahs:
 * - Names (Arabic and transliteration)
 * - Revelation type (Meccan/Medinan)
 * - Ayah count
 * - Order information
 * 
 * This is separate from Quran model for efficiency
 */
const surahMetadataSchema = new mongoose.Schema({
  surahNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 114,
    index: true
  },
  
  // Surah names
  nameArabic: {
    type: String,
    required: true
  },
  nameTransliteration: {
    type: String,
    required: true
  },
  nameTranslation: {
    type: String,
    required: true
  },
  
  // Basic information
  revelationType: {
    type: String,
    enum: ['Meccan', 'Medinan'],
    required: true
  },
  ayahCount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Ordering
  revelationOrder: {
    type: Number,
    min: 1,
    max: 114
  },
  
  // Additional context
  meaning: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'surah_metadata'
});

module.exports = mongoose.model('SurahMetadata', surahMetadataSchema);
