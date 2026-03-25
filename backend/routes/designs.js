const express = require("express");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const Design = require("../models/Design");
const { getRoomConfig, listRoomCatalog } = require("../data/roomCatalog");
const { buildInspirations } = require("../utils/inspirationBuilder");

const router = express.Router();

function normalizeSelectedItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
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
    let savedDesign = null;

    if (req.user?.id) {
      const design = await Design.create({
        userId: req.user.id,
        room,
        roomLabel: roomConfig.label,
        selectedItems,
        inspirations,
      });

      savedDesign = {
        id: design._id.toString(),
        room: design.room,
        roomLabel: design.roomLabel,
        selectedItems: design.selectedItems,
        inspirations: design.inspirations,
        createdAt: design.createdAt,
      };
    }

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
    console.error("Inspiration search error:", error);
    res.status(500).json({ message: "Unable to build inspiration links right now." });
  }
}

router.get("/catalog", (_req, res) => {
  res.json({ rooms: listRoomCatalog() });
});

router.get("/", auth, async (req, res) => {
  try {
    const designs = await Design.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({
      designs: designs.map((design) => ({
        id: design._id.toString(),
        room: design.room,
        roomLabel: design.roomLabel,
        selectedItems: design.selectedItems,
        inspirations: design.inspirations,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Fetch designs error:", error);
    res.status(500).json({ message: "Unable to load design history right now." });
  }
});

router.post("/inspirations/search", optionalAuth, searchInspirations);
router.post("/photos/search", optionalAuth, searchInspirations);

module.exports = router;
