const Message = require('../models/Message.model');

// Create a new message
exports.createMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const message = await Message.create({
      user: req.user._id,
      content: content.trim(),
    });

    // Populate user information
    await message.populate('user', 'name email');

    res.status(201).json(message);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all messages
exports.getAllMessages = async (req, res) => {
  try {
    // Get current user's subscriptions
    const currentUserId = req.user._id;
    const subscriptions = req.user.subscriptions || [];
    
    // Include messages from subscribed users + own messages
    const userIdsToShow = [...subscriptions, currentUserId];
    
    const messages = await Message.find({
      user: { $in: userIdsToShow }
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if the user owns this message
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    await Message.findByIdAndDelete(id);
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
