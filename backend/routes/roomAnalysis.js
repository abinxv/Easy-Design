const express = require("express");
const optionalAuth = require("../middleware/optionalAuth");
const { analyzeRoomPhoto, getRoomAnalysisStatus } = require("../utils/roomAnalysisService");

const router = express.Router();

router.get("/config", (_req, res) => {
  res.json(getRoomAnalysisStatus());
});

router.post("/analyze", optionalAuth, async (req, res) => {
  try {
    const analysis = await analyzeRoomPhoto({
      imageDataUrl: req.body.imageDataUrl,
      fileName: req.body.fileName,
    });

    res.json(analysis);
  } catch (error) {
    const statusCode = error?.statusCode || 500;

    if (statusCode >= 500) {
      console.error("Room analysis error:", error);
    }

    res.status(statusCode).json({
      message: error.message || "Unable to analyze the uploaded room photo right now.",
    });
  }
});

module.exports = router;
