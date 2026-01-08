const express = require('express');
const router = express.Router();
const { createMessage, getAllMessages, deleteMessage } = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, createMessage);
router.get('/', protect, getAllMessages);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
