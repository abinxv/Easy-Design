const express = require("express");
const auth = require("../middleware/auth");
const Design = require("../models/Design");
const Photo = require("../models/Photo");
const router = express.Router();

// Get designs for user
router.get("/", auth, async (req, res) => {
  try {
    const designs = await Design.find({ userId: req.user.id });
    res.json(designs);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Create design
router.post("/", auth, async (req, res) => {
  try {
    const design = new Design({ ...req.body, userId: req.user.id });
    await design.save();
    res.json(design);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Search inspiration photos (tag matching)
router.post("/photos/search", auth, async (req, res) => {
  try {
    const { room, style, colorTheme, furniture } = req.body;
    const searchTags = [];
    if (room) searchTags.push(room);
    if (style) searchTags.push(style.toLowerCase());
    if (colorTheme) searchTags.push(colorTheme.toLowerCase());
    furniture?.forEach((f) => searchTags.push(f.toLowerCase()));

    const photos = await Photo.find({
      room,
      tags: { $in: searchTags },
    }).limit(5);

    res.json(photos);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
