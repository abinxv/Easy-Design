const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { isDatabaseReady, shouldUseLocalStore } = require("../config/db");
const {
  toSafeLocalUser,
  findLocalUserByEmail,
  findLocalUserById,
  compareLocalPassword,
  createLocalUser,
} = require("../data/localStore");
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
    user: typeof user.toSafeObject === "function" ? user.toSafeObject() : toSafeLocalUser(user),
  };
}

function isMongoUnavailable() {
  return !shouldUseLocalStore() && !isDatabaseReady();
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

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ message: "Name must be between 2 and 80 characters long." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters long." });
      return;
    }

    if (isMongoUnavailable()) {
      res.status(503).json({ message: "Database is reconnecting. Please try registering again in a moment." });
      return;
    }

    const existingUser = shouldUseLocalStore() ? await findLocalUserByEmail(email) : await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const user = shouldUseLocalStore()
      ? await createLocalUser({ name, email, password })
      : await User.create({ name, email, password });
    res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    console.error("Register error:", error);

    if (error?.code === 11000 || error?.code === "DUPLICATE_EMAIL") {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    if (error?.name === "ValidationError") {
      const firstMessage = Object.values(error.errors || {})[0]?.message;
      res.status(400).json({ message: firstMessage || "Please check the signup details and try again." });
      return;
    }

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

    if (isMongoUnavailable()) {
      res.status(503).json({ message: "Database is reconnecting. Please try signing in again in a moment." });
      return;
    }

    const user = shouldUseLocalStore() ? await findLocalUserByEmail(email) : await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const passwordMatches =
      typeof user.comparePassword === "function"
        ? await user.comparePassword(password)
        : await compareLocalPassword(user, password);
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
    if (isMongoUnavailable()) {
      res.status(503).json({ message: "Database is reconnecting. Please refresh in a moment." });
      return;
    }

    const user = shouldUseLocalStore() ? await findLocalUserById(req.user.id) : await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({ user: typeof user.toSafeObject === "function" ? user.toSafeObject() : toSafeLocalUser(user) });
  } catch (error) {
    console.error("Fetch current user error:", error);
    res.status(500).json({ message: "Unable to load the current user." });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully on the client." });
});

module.exports = router;
