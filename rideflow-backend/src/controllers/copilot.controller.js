const { runCopilot } = require('../services/ai.service');

exports.chat = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    const result = await runCopilot({
      userMessage: message,
      userId: req.user ? req.user._id : null,
      conversationHistory: history || [],
    });
    res.json(result);
  } catch (err) {
    console.error('Copilot error:', err);
    res.status(500).json({
      message: 'Copilot failed',
      error: err.message,
    });
  }
};
