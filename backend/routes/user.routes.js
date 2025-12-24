const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// @route   GET /api/users/search
// @desc    Search users by name
// @access  Private
router.get('/search', protect, userController.searchUsers);

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, userController.getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', protect, userController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), userController.deleteUser);

// @route   DELETE /api/users/me/delete
// @desc    Delete own account
// @access  Private
router.delete('/me/delete', protect, userController.deleteOwnAccount);

// @route   POST /api/users/:id/subscribe
// @desc    Subscribe to a user
// @access  Private
router.post('/:id/subscribe', protect, userController.subscribeToUser);

// @route   DELETE /api/users/:id/subscribe
// @desc    Unsubscribe from a user
// @access  Private
router.delete('/:id/subscribe', protect, userController.unsubscribeFromUser);

module.exports = router;
