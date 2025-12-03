const mongoose = require('mongoose');

/**
 * Hadith Model
 * 
 * Stores hadith from Sihah Sittah (The Six Authentic Books):
 * - Sahih Bukhari
 * - Sahih Muslim
 * - Sunan Abu Dawood
 * - Jami` at-Tirmidhi
 * - Sunan an-Nasa'i
 * - Sunan Ibn Majah
 * 
 * Indexes optimized for:
 * - Fast collection + hadith number lookup
 * - Efficient collection browsing
 */
const hadithSchema = new mongoose.Schema({
  // Collection identifier
  collection: {
    type: String,
    required: true,
    enum: [
      'bukhari',
      'muslim',
      'abudawud',
      'tirmidhi',
      'nasai',
      'ibnmajah'
    ],
    index: true
  },
  
  // Book/Chapter organization
  bookNumber: {
    type: Number,
    min: 1
  },
  bookName: {
    type: String,
    default: ''
  },
  chapter: {
    type: String,
    default: ''
  },
  chapterNumber: {
    type: Number
  },
  
  // Hadith identifier (within collection)
  hadithNumber: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  
  // Arabic text - CRITICAL: Must be authentic
  arabicText: {
    type: String,
    required: true,
    trim: true
  },
  
  // Translations
  translationEn: {
    type: String,
    trim: true,
    default: ''
  },
  translationBn: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Hadith metadata
  metadata: {
    // Narrator chain (Isnad)
    narrator: {
      type: String,
      default: ''
    },
    // Authenticity grade (if available)
    grade: {
      type: String,
      default: ''
    },
    // Reference for verification
    reference: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true,
  collection: 'hadith'
});

// Compound index for fast collection + hadith number lookup
hadithSchema.index({ collection: 1, hadithNumber: 1 }, { unique: true });

// Index for book-based queries
hadithSchema.index({ collection: 1, bookNumber: 1 });

// Index for chapter-based queries
hadithSchema.index({ collection: 1, bookNumber: 1, chapterNumber: 1 });

module.exports = mongoose.model('Hadith', hadithSchema);
