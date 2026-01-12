const mongoose = require('mongoose');

const salatScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Current week score
  weeklyScore: {
    type: Number,
    default: 0
  },
  // All-time best weekly score
  bestWeeklyScore: {
    type: Number,
    default: 0
  },
  // Current streak multiplier (resets on skip)
  currentMultiplier: {
    type: Number,
    default: 1
  },
  // Prayers completed this week (resets at 35)
  weeklyPrayerCount: {
    type: Number,
    default: 0
  },
  // Total prayers ever completed
  totalPrayers: {
    type: Number,
    default: 0
  },
  // Last prayer timestamp
  lastPrayerAt: {
    type: Date,
    default: null
  },
  // Last prayer key (fajr, dhuhr, etc.)
  lastPrayerKey: {
    type: String,
    default: null
  },
  // Week start date (for reset logic)
  weekStartDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for leaderboard queries
salatScoreSchema.index({ weeklyScore: -1 });
salatScoreSchema.index({ bestWeeklyScore: -1 });

module.exports = mongoose.model('SalatScore', salatScoreSchema);
