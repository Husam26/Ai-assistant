const express = require('express');
const router = express.Router();
const { sendMessageToGemini } = require('../controllers/chatController');

router.post('/', sendMessageToGemini);

module.exports = router;
