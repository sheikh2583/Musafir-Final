const mongoose = require('mongoose');
const User = require('../models/User.model');
const Message = require('../models/Message.model');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Search users by name
// @route   GET /api/users/search
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      // Return empty if no query
      return res.json([]);
    }

    // Search users by name (case-insensitive, partial match)
    // This will match any part of the name
    const users = await User.find({
      name: { $regex: q, $options: 'i' }
    })
    .select('name email')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user is subscribed to this user
    const currentUserSubscriptions = req.user.subscriptions || [];
    const isSubscribed = currentUserSubscriptions.some(
      sub => sub.toString() === user._id.toString()
    );

    res.json({
      ...user.toObject(),
      isSubscribed
    });
  } catch (error) {
    console.error('getUserById error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Users can only update their own profile unless they're admin
    if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    // Fields that can be updated
    const { name, phoneNumber, profilePicture } = req.body;

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (profilePicture) user.profilePicture = profilePicture;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete own account
// @route   DELETE /api/user/me
// @access  Private
exports.deleteOwnAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete all messages posted by this user
    await Message.deleteMany({ user: userId });

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.json({ 
      message: 'Account deleted successfully. All your data has been removed.',
      success: true 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Subscribe to a user
// @route   POST /api/users/:id/subscribe
// @access  Private
exports.subscribeToUser = async (req, res) => {
  try {
    const userIdToSubscribe = req.params.id;
    const currentUserId = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userIdToSubscribe)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Can't subscribe to yourself
    if (userIdToSubscribe === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot subscribe to yourself' });
    }

    // Check if target user exists
    const targetUser = await User.findById(userIdToSubscribe);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get current user with subscriptions
    const currentUser = await User.findById(currentUserId);
    
    // Initialize subscriptions array if it doesn't exist
    if (!currentUser.subscriptions) {
      currentUser.subscriptions = [];
    }

    // Check if already subscribed
    const alreadySubscribed = currentUser.subscriptions.some(
      sub => sub.toString() === userIdToSubscribe
    );
    
    if (alreadySubscribed) {
      return res.status(400).json({ message: 'Already subscribed to this user' });
    }

    // Add subscription
    currentUser.subscriptions.push(userIdToSubscribe);
    const savedUser = await currentUser.save({ validateBeforeSave: false });

    res.json({ 
      message: 'Successfully subscribed',
      success: true,
      subscriptions: savedUser.subscriptions
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Unsubscribe from a user
// @route   DELETE /api/users/:id/subscribe
// @access  Private
exports.unsubscribeFromUser = async (req, res) => {
  try {
    const userIdToUnsubscribe = req.params.id;
    const currentUserId = req.user._id;

    // Get current user with subscriptions
    const currentUser = await User.findById(currentUserId);
    
    // Initialize subscriptions array if it doesn't exist
    if (!currentUser.subscriptions) {
      currentUser.subscriptions = [];
    }

    // Check if subscribed
    const isSubscribed = currentUser.subscriptions.some(
      sub => sub.toString() === userIdToUnsubscribe
    );
    
    if (!isSubscribed) {
      return res.status(400).json({ message: 'Not subscribed to this user' });
    }

    // Remove subscription
    currentUser.subscriptions = currentUser.subscriptions.filter(
      sub => sub.toString() !== userIdToUnsubscribe
    );
    await currentUser.save();

    res.json({ 
      message: 'Successfully unsubscribed',
      success: true,
      subscriptions: currentUser.subscriptions
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
