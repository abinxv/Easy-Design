const express = require("express");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const { isDatabaseReady, shouldUseLocalStore } = require("../config/db");
const { createLocalDesign, listLocalDesignsByUserId } = require("../data/localStore");
const Design = require("../models/Design");
const { getRoomConfig, listRoomCatalog } = require("../data/roomCatalog");
const { buildInspirations } = require("../utils/inspirationBuilder");
const { handleDesignAssistantTurn, CHAT_STAGES } = require("../utils/designAssistant");

const router = express.Router();

function normalizeSelectedItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function isMongoUnavailable() {
  return !shouldUseLocalStore() && !isDatabaseReady();
}

function serializeDesign(design) {
  return {
    id: design._id?.toString?.() || design.id,
    room: design.room,
    roomLabel: design.roomLabel,
    selectedItems: design.selectedItems,
    inspirations: design.inspirations,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
}

async function persistDesignForUser({ userId, room, roomLabel, selectedItems, inspirations }) {
  if (!userId) {
    return null;
  }

  if (isMongoUnavailable()) {
    throw Object.assign(new Error("Database is reconnecting. Please try saving again in a moment."), {
      statusCode: 503,
    });
  }

  const design = shouldUseLocalStore()
    ? await createLocalDesign({
        userId,
        room,
        roomLabel,
        selectedItems,
        inspirations,
      })
    : await Design.create({
        userId,
        room,
        roomLabel,
        selectedItems,
        inspirations,
      });

  return serializeDesign(design);
}

async function searchInspirations(req, res) {
  try {
    const room = String(req.body.room || "").trim();
    const selectedItems = normalizeSelectedItems(req.body.selectedItems);
    const roomConfig = getRoomConfig(room);

    if (!roomConfig) {
      res.status(400).json({ message: "Please choose a valid room type." });
      return;
    }

    const inspirations = buildInspirations(room, selectedItems);
    const savedDesign = req.user?.id
      ? await persistDesignForUser({
          userId: req.user.id,
          room,
          roomLabel: roomConfig.label,
          selectedItems,
          inspirations,
        })
      : null;

    res.json({
      room: {
        slug: room,
        label: roomConfig.label,
      },
      selectedItems,
      inspirations,
      savedDesign,
    });
  } catch (error) {
    if (error?.statusCode === 503) {
      res.status(503).json({ message: error.message });
      return;
    }

    console.error("Inspiration search error:", error);
    res.status(500).json({ message: "Unable to build inspiration links right now." });
  }
}

router.post("/assistant", optionalAuth, async (req, res) => {
  try {
    const assistantResponse = await handleDesignAssistantTurn({
      message: req.body.message,
      action: req.body.action,
      state: req.body.state,
    });

    let savedDesign = null;

    if (
      req.user?.id &&
      assistantResponse.didGenerateResults &&
      assistantResponse.room &&
      Array.isArray(assistantResponse.inspirations) &&
      assistantResponse.inspirations.length > 0
    ) {
      savedDesign = await persistDesignForUser({
        userId: req.user.id,
        room: assistantResponse.room.slug,
        roomLabel: assistantResponse.room.label,
        selectedItems: assistantResponse.selectedItems,
        inspirations: assistantResponse.inspirations,
      });
    }

    res.json({
      ...assistantResponse,
      savedDesign,
    });
  } catch (error) {
    if (error?.statusCode === 503) {
      res.status(503).json({ message: error.message });
      return;
    }

    console.error("Assistant chat error:", error);
    res.status(500).json({ message: "Unable to respond from the design assistant right now." });
  }
});

router.get("/catalog", (_req, res) => {
  res.json({ rooms: listRoomCatalog() });
});

router.get("/", auth, async (req, res) => {
  try {
    if (isMongoUnavailable()) {
      res.status(503).json({ message: "Database is reconnecting. Please refresh in a moment." });
      return;
    }

    const designs = shouldUseLocalStore()
      ? await listLocalDesignsByUserId(req.user.id)
      : await Design.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.json({
      designs: designs.map((design) => serializeDesign(design)),
    });
  } catch (error) {
    console.error("Fetch designs error:", error);
    res.status(500).json({ message: "Unable to load design history right now." });
  }
});

router.post("/inspirations/search", optionalAuth, searchInspirations);
router.post("/photos/search", optionalAuth, searchInspirations);

module.exports = router;
