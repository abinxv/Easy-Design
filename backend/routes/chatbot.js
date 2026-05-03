const express = require("express");
const optionalAuth = require("../middleware/optionalAuth");
const { sendGeminiChatTurn } = require("../utils/geminiChatbot");

const router = express.Router();

router.post("/message", optionalAuth, async (req, res) => {
  try {
    const response = await sendGeminiChatTurn({
      messages: req.body.messages,
    });

    res.json(response);
  } catch (error) {
    const statusCode = error?.statusCode || 500;

    if (statusCode >= 500) {
      console.error("AI chatbot error:", error);
    }

    res.status(statusCode).json({
      message: error.message || "Unable to respond from the AI chatbot right now.",
    });
  }
});

module.exports = router;
