const mongoose = require('mongoose');

/**
 * Quran Model
 * 
 * Stores the complete Quran text ayah-by-ayah with:
 * - Uthmani Arabic text (required for religious accuracy)
 * - English and Bangla translations
 * - Metadata (juz, page, manzil)
 * 
 * Indexes optimized for:
 * - Fast surah/ayah lookup (compound index)
 * - Efficient surah retrieval
 */
const quranSchema = new mongoose.Schema({
  // Core identifiers
  surah: {
    type: Number,
    required: true,
    min: 1,
    max: 114,
    index: true
  },
  ayah: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  
  // Arabic text - CRITICAL: Must be Uthmani script
  arabicText: {
    type: String,
    required: true,
    trim: true
  },
  
  // Optional translations
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
  
  // Metadata for additional features
  metadata: {
    juz: {
      type: Number,
      min: 1,
      max: 30
    },
    page: {
      type: Number,
      min: 1,
      max: 604
    },
    manzil: {
      type: Number,
      min: 1,
      max: 7
    },
    ruku: {
      type: Number,
      min: 1
    },
    hizbQuarter: {
      type: Number,
      min: 1,
      max: 240
    },
    sajda: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  collection: 'quran'
});

// Compound index for fast surah:ayah lookup (most common query)
quranSchema.index({ surah: 1, ayah: 1 }, { unique: true });

// Index for juz-based queries
quranSchema.index({ 'metadata.juz': 1 });

// Index for page-based queries (if implementing page view)
quranSchema.index({ 'metadata.page': 1 });

module.exports = mongoose.model('Quran', quranSchema);
