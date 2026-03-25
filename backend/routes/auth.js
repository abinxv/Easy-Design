const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { signToken } = require("../utils/tokens");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function buildAuthResponse(user) {
  return {
    token: signToken(user),
    user: user.toSafeObject(),
  };
}

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      res.status(400).json({ message: "Name, email, and password are required." });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: "Please provide a valid email address." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters long." });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const user = await User.create({ name, email, password });
    res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Unable to create the account right now." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    res.json(buildAuthResponse(user));
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Unable to sign in right now." });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({ user: user.toSafeObject() });
  } catch (error) {
    console.error("Fetch current user error:", error);
    res.status(500).json({ message: "Unable to load the current user." });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully on the client." });
});

module.exports = router;
