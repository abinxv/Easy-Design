const express = require("express");
const optionalAuth = require("../middleware/optionalAuth");
const {
  analyzeRoomPhoto,
  detectRoomPhoto,
  getRoomAnalysisStatus,
  matchDetectedObjects,
} = require("../utils/roomAnalysisService");

const router = express.Router();

router.get("/config", (_req, res) => {
  res.json(getRoomAnalysisStatus());
});

async function handleRoomAnalysis(action, req, res) {
  try {
    const analysis = await action();

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
}

router.post("/detect", optionalAuth, async (req, res) =>
  handleRoomAnalysis(
    () =>
      detectRoomPhoto({
        imageDataUrl: req.body.imageDataUrl,
        fileName: req.body.fileName,
      }),
    req,
    res
  )
);

router.post("/match", optionalAuth, async (req, res) =>
  handleRoomAnalysis(
    () =>
      matchDetectedObjects({
        analysisId: req.body.analysisId,
        detectionProvider: req.body.detectionProvider,
        detectedObjects: req.body.detectedObjects,
        selectedObjectIds: req.body.selectedObjectIds,
        sourceImage: req.body.sourceImage,
        sourceImageUrl: req.body.sourceImageUrl,
      }),
    req,
    res
  )
);

router.post("/analyze", optionalAuth, async (req, res) =>
  handleRoomAnalysis(
    () =>
      analyzeRoomPhoto({
        imageDataUrl: req.body.imageDataUrl,
        fileName: req.body.fileName,
        targetObjects: req.body.targetObjects,
      }),
    req,
    res
  )
);

module.exports = router;
