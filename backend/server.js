const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Design = require("./design");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// POST route
app.post("/api/design", async (req, res) => {
  try {
    const { style, colorTheme, budget, rooms } = req.body;

    const newDesign = new Design({
      style,
      colorTheme,
      budget,
      rooms
    });

    await newDesign.save();

    res.status(201).json({
      message: "Preferences saved successfully",
      data: newDesign
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route (optional but useful for testing)
app.get("/api/design", async (req, res) => {
  const designs = await Design.find();
  res.json(designs);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});