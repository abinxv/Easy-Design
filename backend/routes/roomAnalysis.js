const express = require("express");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const { isDatabaseReady, shouldUseLocalStore } = require("../config/db");
const {
  clearLocalRoomShopCart,
  getLocalRoomShopCartByUserId,
  createLocalRoomUpload,
  listLocalRoomUploadsByUserId,
  upsertLocalRoomShopCart,
} = require("../data/localStore");
const RoomShopCart = require("../models/RoomShopCart");
const RoomUpload = require("../models/RoomUpload");
const {
  normalizeCartItems,
  normalizeSuggestions,
  suggestCartCompanions,
} = require("../utils/roomShoppingAdvisor");
const {
  analyzeRoomPhoto,
  detectRoomPhoto,
  getRoomAnalysisStatus,
  matchDetectedObjects,
} = require("../utils/roomAnalysisService");

const router = express.Router();

function isMongoUnavailable() {
  return !shouldUseLocalStore() && !isDatabaseReady();
}

function serializeRoomShopCart(cart) {
  return {
    id: cart?._id?.toString?.() || cart?.id || null,
    items: normalizeCartItems(cart?.items || []),
    suggestions: normalizeSuggestions(cart?.suggestions || []),
    createdAt: cart?.createdAt || null,
    updatedAt: cart?.updatedAt || null,
  };
}

function emptyRoomShopCart() {
  return {
    id: null,
    items: [],
    suggestions: [],
    createdAt: null,
    updatedAt: null,
  };
}

function cleanString(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeUploadMatch(match) {
  return {
    kind: cleanString(match?.kind, 40),
    source: cleanString(match?.source, 120),
    title: cleanString(match?.title, 220),
    url: cleanString(match?.url, 1200),
    thumbnailUrl: cleanString(match?.thumbnailUrl, 1200) || null,
    provider: cleanString(match?.provider, 80),
  };
}

function normalizeUploadObject(object) {
  const boundingBox = object?.boundingBox || {};

  return {
    id: cleanString(object?.id, 120),
    label: cleanString(object?.label, 80),
    rawLabel: cleanString(object?.rawLabel, 80),
    confidence: Number.isFinite(Number(object?.confidence)) ? Number(object.confidence) : 0,
    boundingBox: {
      x: Number(boundingBox.x || 0),
      y: Number(boundingBox.y || 0),
      width: Number(boundingBox.width || 0),
      height: Number(boundingBox.height || 0),
    },
    cropImageUrl: cleanString(object?.cropImageUrl, 1200) || null,
    matchMode: cleanString(object?.matchMode, 80),
    searchQuery: cleanString(object?.searchQuery, 180),
    webEntities: Array.isArray(object?.webEntities)
      ? object.webEntities.map((entity) => cleanString(entity, 80)).filter(Boolean).slice(0, 8)
      : [],
    matches: Array.isArray(object?.matches) ? object.matches.slice(0, 4).map(normalizeUploadMatch) : [],
  };
}

function normalizeRoomUploadPayload({ analysis, fileName }) {
  return {
    analysisId: cleanString(analysis?.analysisId, 240) || `room-analysis-${Date.now()}`,
    fileName: cleanString(fileName, 240),
    sourceImageUrl: cleanString(analysis?.sourceImageUrl, 1200) || null,
    sourceImage: {
      width: Number(analysis?.sourceImage?.width || 0),
      height: Number(analysis?.sourceImage?.height || 0),
    },
    detectionProvider: cleanString(analysis?.detectionProvider, 160),
    searchProvider: cleanString(analysis?.searchProvider, 160),
    warnings: Array.isArray(analysis?.warnings)
      ? analysis.warnings.map((warning) => cleanString(warning, 300)).filter(Boolean).slice(0, 8)
      : [],
    detectedObjects: Array.isArray(analysis?.detectedObjects)
      ? analysis.detectedObjects.map(normalizeUploadObject).filter((object) => object.id && object.label).slice(0, 12)
      : [],
  };
}

function serializeRoomUpload(upload) {
  return {
    id: upload?._id?.toString?.() || upload?.id,
    analysisId: upload.analysisId,
    fileName: upload.fileName,
    sourceImageUrl: upload.sourceImageUrl,
    sourceImage: upload.sourceImage,
    detectionProvider: upload.detectionProvider,
    searchProvider: upload.searchProvider,
    warnings: upload.warnings || [],
    detectedObjects: upload.detectedObjects || [],
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

async function persistRoomUploadForUser({ userId, analysis, fileName }) {
  if (!userId) {
    return null;
  }

  if (isMongoUnavailable()) {
    throw Object.assign(new Error("Database is reconnecting. Please try saving your upload again in a moment."), {
      statusCode: 503,
    });
  }

  const payload = normalizeRoomUploadPayload({ analysis, fileName });
  const upload = shouldUseLocalStore()
    ? await createLocalRoomUpload({
        userId,
        ...payload,
      })
    : await RoomUpload.create({
        userId,
        ...payload,
      });

  return serializeRoomUpload(upload);
}

async function getSavedRoomShopCart(userId) {
  if (!userId) {
    return emptyRoomShopCart();
  }

  if (isMongoUnavailable()) {
    throw Object.assign(new Error("Database is reconnecting. Please try your cart again in a moment."), {
      statusCode: 503,
    });
  }

  const cart = shouldUseLocalStore()
    ? await getLocalRoomShopCartByUserId(userId)
    : await RoomShopCart.findOne({ userId });

  return cart ? serializeRoomShopCart(cart) : emptyRoomShopCart();
}

async function saveRoomShopCart({ userId, items, suggestions }) {
  if (!userId) {
    return serializeRoomShopCart({ items, suggestions });
  }

  if (isMongoUnavailable()) {
    throw Object.assign(new Error("Database is reconnecting. Please try saving your cart again in a moment."), {
      statusCode: 503,
    });
  }

  const cart = shouldUseLocalStore()
    ? await upsertLocalRoomShopCart({ userId, items, suggestions })
    : await RoomShopCart.findOneAndUpdate(
        { userId },
        { $set: { items, suggestions } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

  return serializeRoomShopCart(cart);
}

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
    async () => {
      const analysis = await analyzeRoomPhoto({
        imageDataUrl: req.body.imageDataUrl,
        fileName: req.body.fileName,
        targetObjects: req.body.targetObjects,
      });
      const savedUpload = req.user?.id
        ? await persistRoomUploadForUser({
            userId: req.user.id,
            analysis,
            fileName: req.body.fileName,
          })
        : null;

      return {
        ...analysis,
        savedUpload,
      };
    },
    req,
    res
  )
);

router.get("/uploads", auth, async (req, res) => {
  try {
    if (isMongoUnavailable()) {
      res.status(503).json({ message: "Database is reconnecting. Please refresh uploads again in a moment." });
      return;
    }

    const uploads = shouldUseLocalStore()
      ? await listLocalRoomUploadsByUserId(req.user.id)
      : await RoomUpload.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.json({
      uploads: uploads.map((upload) => serializeRoomUpload(upload)),
    });
  } catch (error) {
    console.error("Room upload history error:", error);
    res.status(500).json({ message: "Unable to load uploaded room images right now." });
  }
});

router.get("/cart", auth, async (req, res) => {
  try {
    res.json({ cart: await getSavedRoomShopCart(req.user.id) });
  } catch (error) {
    const statusCode = error?.statusCode || 500;

    if (statusCode >= 500) {
      console.error("Room shop cart fetch error:", error);
    }

    res.status(statusCode).json({
      message: error.message || "Unable to load your room shopping cart right now.",
    });
  }
});

router.put("/cart", auth, async (req, res) => {
  try {
    const items = normalizeCartItems(req.body.items);
    const cart = await saveRoomShopCart({
      userId: req.user.id,
      items,
      suggestions: [],
    });

    res.json({ cart });
  } catch (error) {
    const statusCode = error?.statusCode || 500;

    if (statusCode >= 500) {
      console.error("Room shop cart save error:", error);
    }

    res.status(statusCode).json({
      message: error.message || "Unable to save your room shopping cart right now.",
    });
  }
});

router.delete("/cart", auth, async (req, res) => {
  try {
    if (isMongoUnavailable()) {
      res.status(503).json({ message: "Database is reconnecting. Please try clearing your cart again in a moment." });
      return;
    }

    if (shouldUseLocalStore()) {
      await clearLocalRoomShopCart(req.user.id);
    } else {
      await RoomShopCart.deleteOne({ userId: req.user.id });
    }

    res.json({ cart: emptyRoomShopCart() });
  } catch (error) {
    console.error("Room shop cart clear error:", error);
    res.status(500).json({ message: "Unable to clear your room shopping cart right now." });
  }
});

router.post("/cart/suggestions", optionalAuth, async (req, res) => {
  try {
    let items = normalizeCartItems(req.body.items);

    if (items.length === 0 && req.user?.id) {
      const savedCart = await getSavedRoomShopCart(req.user.id);
      items = savedCart.items;
    }

    const suggestions = await suggestCartCompanions(items);
    const cart = req.user?.id
      ? await saveRoomShopCart({
          userId: req.user.id,
          items,
          suggestions,
        })
      : serializeRoomShopCart({ items, suggestions });

    res.json({
      cart,
      suggestions,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;

    if (statusCode >= 500) {
      console.error("Room shop suggestion error:", error);
    }

    res.status(statusCode).json({
      message: error.message || "Unable to build shopping suggestions right now.",
    });
  }
});

module.exports = router;
