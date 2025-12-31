const SalatScore = require('../models/SalatScore.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');

// Prayer order for checking consecutive prayers
const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Get or create salat score for user
 */
const getOrCreateScore = async (userId) => {
  let score = await SalatScore.findOne({ user: userId });
  if (!score) {
    score = await SalatScore.create({ user: userId });
  }
  return score;
};

/**
 * Check if a prayer is consecutive to the last one
 * Returns: { isConsecutive: boolean, skippedCount: number }
 */
const checkConsecutive = (lastPrayerKey, lastPrayerAt, currentPrayerKey) => {
  if (!lastPrayerKey || !lastPrayerAt) {
    return { isConsecutive: false, skippedCount: 0 };
  }

  const now = new Date();
  const lastPrayerDate = new Date(lastPrayerAt);
  
  // Get indices
  const lastIndex = PRAYER_ORDER.indexOf(lastPrayerKey);
  const currentIndex = PRAYER_ORDER.indexOf(currentPrayerKey);
  
  // Same day check (within 24 hours)
  const hoursDiff = (now - lastPrayerDate) / (1000 * 60 * 60);
  
  if (hoursDiff > 24) {
    // More than a day passed - definitely not consecutive
    return { isConsecutive: false, skippedCount: 5 };
  }
  
  // Check if it's the next prayer in sequence
  const isSameDay = lastPrayerDate.toDateString() === now.toDateString();
  const isNextDay = !isSameDay && hoursDiff < 24;
  
  if (isSameDay) {
    // Same day - check if next in sequence
    if (currentIndex === lastIndex + 1) {
      return { isConsecutive: true, skippedCount: 0 };
    } else if (currentIndex > lastIndex + 1) {
      // Skipped some prayers
      return { isConsecutive: false, skippedCount: currentIndex - lastIndex - 1 };
    }
  } else if (isNextDay) {
    // Next day - fajr after isha is consecutive
    if (lastPrayerKey === 'isha' && currentPrayerKey === 'fajr') {
      return { isConsecutive: true, skippedCount: 0 };
    } else if (currentPrayerKey === 'fajr') {
      // Started fajr but missed some yesterday
      return { isConsecutive: false, skippedCount: 4 - lastIndex };
    }
  }
  
  return { isConsecutive: false, skippedCount: 1 };
};

/**
 * Record a prayer and update score
 * POST /api/salat/pray
 */
exports.recordPrayer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prayerKey } = req.body;
    
    if (!prayerKey || !PRAYER_ORDER.includes(prayerKey)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prayer key. Must be one of: ' + PRAYER_ORDER.join(', ')
      });
    }
    
    const score = await getOrCreateScore(userId);
    
    // Check if we need to reset the week (after 35 prayers)
    if (score.weeklyPrayerCount >= 35) {
      // Save best score if current is higher
      if (score.weeklyScore > score.bestWeeklyScore) {
        score.bestWeeklyScore = score.weeklyScore;
      }
      // Reset for new week
      score.weeklyScore = 0;
      score.weeklyPrayerCount = 0;
      score.currentMultiplier = 1;
      score.weekStartDate = new Date();
    }
    
    // Check if consecutive
    const { isConsecutive } = checkConsecutive(
      score.lastPrayerKey, 
      score.lastPrayerAt, 
      prayerKey
    );
    
    let pointsEarned = 0;
    
    if (isConsecutive) {
      // Consecutive prayer - multiply!
      score.currentMultiplier += 1;
      pointsEarned = score.weeklyScore * score.currentMultiplier;
      // Actually, let's re-read the logic:
      // pray fazr streak=1, pray zuhr streak=1*2=2, pray asr streak=2*3=6
      // So it's: current_score * multiplier where multiplier increases
      // Let me fix this:
      pointsEarned = Math.max(1, score.weeklyScore) * score.currentMultiplier;
      if (score.weeklyScore === 0) pointsEarned = 1; // First prayer
      score.weeklyScore = pointsEarned;
    } else {
      // Broke the streak - add 1 and reset multiplier
      score.currentMultiplier = 1;
      score.weeklyScore += 1;
      pointsEarned = 1;
    }
    
    // Update tracking
    score.weeklyPrayerCount += 1;
    score.totalPrayers += 1;
    score.lastPrayerKey = prayerKey;
    score.lastPrayerAt = new Date();
    
    // Update best if needed
    if (score.weeklyScore > score.bestWeeklyScore) {
      score.bestWeeklyScore = score.weeklyScore;
    }
    
    await score.save();
    
    res.status(200).json({
      success: true,
      data: {
        prayerKey,
        pointsEarned,
        weeklyScore: score.weeklyScore,
        currentMultiplier: score.currentMultiplier,
        weeklyPrayerCount: score.weeklyPrayerCount,
        bestWeeklyScore: score.bestWeeklyScore,
        isConsecutive
      }
    });
    
  } catch (error) {
    console.error('Record prayer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record prayer'
    });
  }
};

/**
 * Skip a prayer (breaks streak)
 * POST /api/salat/skip
 */
exports.skipPrayer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prayerKey } = req.body;
    
    if (!prayerKey || !PRAYER_ORDER.includes(prayerKey)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prayer key'
      });
    }
    
    const score = await getOrCreateScore(userId);
    
    // Reset multiplier on skip
    score.currentMultiplier = 1;
    score.lastPrayerKey = prayerKey;
    score.lastPrayerAt = new Date();
    
    await score.save();
    
    res.status(200).json({
      success: true,
      message: 'Prayer skipped, streak reset',
      data: {
        weeklyScore: score.weeklyScore,
        currentMultiplier: 1
      }
    });
    
  } catch (error) {
    console.error('Skip prayer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record skip'
    });
  }
};

/**
 * Get user's salat score
 * GET /api/salat/score
 */
exports.getMyScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const score = await getOrCreateScore(userId);
    
    // Get user's rank
    const rank = await SalatScore.countDocuments({
      weeklyScore: { $gt: score.weeklyScore }
    }) + 1;
    
    res.status(200).json({
      success: true,
      data: {
        weeklyScore: score.weeklyScore,
        bestWeeklyScore: score.bestWeeklyScore,
        currentMultiplier: score.currentMultiplier,
        weeklyPrayerCount: score.weeklyPrayerCount,
        totalPrayers: score.totalPrayers,
        rank,
        prayersUntilReset: 35 - score.weeklyPrayerCount
      }
    });
    
  } catch (error) {
    console.error('Get score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get score'
    });
  }
};

/**
 * Get friends-only leaderboard
 * GET /api/salat/leaderboard?type=weekly|alltime&limit=50
 * Always scoped to friends (subscriptions) + self
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { type = 'weekly', limit = 50 } = req.query;
    const userId = req.user?._id;
    
    const sortField = type === 'alltime' ? 'bestWeeklyScore' : 'weeklyScore';

    // Always friends-only: current user + their subscriptions
    const currentUser = await User.findById(userId).select('subscriptions').lean();
    const friendIds = (currentUser?.subscriptions || []).map(id => new mongoose.Types.ObjectId(id));
    const selfId = new mongoose.Types.ObjectId(userId);
    
    
    
    const filter = {
      [sortField]: { $gt: 0 },
      user: { $in: [selfId, ...friendIds] }
    };
    
    const leaderboard = await SalatScore.find(filter)
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .populate('user', 'name email')
      .lean();
    
    // Format response
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.user?._id,
      name: entry.user?.name || 'Anonymous',
      score: type === 'alltime' ? entry.bestWeeklyScore : entry.weeklyScore,
      totalPrayers: entry.totalPrayers,
      currentMultiplier: entry.currentMultiplier,
      isCurrentUser: userId && entry.user?._id?.toString() === userId.toString()
    }));
    
    // Get current user's rank among friends
    let myRank = null;
    const myScore = await SalatScore.findOne({ user: userId });
    if (myScore) {
      myRank = await SalatScore.countDocuments({
        ...filter,
        [sortField]: { $gt: myScore[sortField] }
      }) + 1;
    }
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard: formattedLeaderboard,
        myRank,
        type,
        friendsOnly: true,
        totalParticipants: await SalatScore.countDocuments(filter)
      }
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard'
    });
  }
};
// Temporary implementation for testing
// This code will be refactored or removed after evaluation

function temporaryHelper() {
    // Helper function for testing purposes
    console.log('Testing new approach');
    return true;
}

function experimentalFeature(data) {
    // Experimental implementation
    const processed = data.map(item => ({
        ...item,
        experimental: true,
        timestamp: Date.now()
    }));
    return processed;
}

function debugUtility(input) {
    console.log('Debug:', input);
    console.log('Type:', typeof input);
    return input;
}

const testHelper = (val) => val ? val.toString() : null;
const validateTemp = (item) => item && item.id && item.data;

module.exports = {
    temporaryHelper,
    experimentalFeature,
    debugUtility,
    testHelper,
    validateTemp
};
