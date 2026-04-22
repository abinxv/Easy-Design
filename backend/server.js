const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { connectDB, getDatabaseStatus } = require("./config/db");
const authRoutes = require("./routes/auth");
const designRoutes = require("./routes/designs");
const roomAnalysisRoutes = require("./routes/roomAnalysis");

const app = express();
const PORT = Number(process.env.PORT || 5000);

function getAllowedOrigins() {
  const configuredOrigins = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length === 0) {
    return true;
  }

  return configuredOrigins;
}

app.use(
  cors({
    origin: getAllowedOrigins(),
  })
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "10mb" }));

app.get("/api/health", (_req, res) => {
  const database = getDatabaseStatus();
  const mongoConfigured = Boolean(process.env.MONGO_URI);
  const usingLocalFallbackAfterMongoError =
    mongoConfigured && database.persistenceMode === "local-file" && Boolean(database.lastError);

  res.json({
    status:
      (database.persistenceMode === "mongodb" && !database.ready) || usingLocalFallbackAfterMongoError
        ? "degraded"
        : "ok",
    service: "easy-design-backend",
    mongoConfigured,
    persistence: database.persistenceMode,
    database,
  });
});

app.get("/health", (_req, res) => {
  res.redirect(307, "/api/health");
});

function mountApiRoutes(prefix) {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/designs`, designRoutes);
  app.use(`${prefix}/room-analysis`, roomAnalysisRoutes);
}

mountApiRoutes("/api");
mountApiRoutes("");

app.get("/", (_req, res) => {
  res.json({ message: "EasyDesign backend is running." });
});

app.use((_req, res) => {
  res.status(404).json({ message: "API route not found." });
});

async function startServer() {
  app.listen(PORT, () => {
    console.log(`EasyDesign backend listening on port ${PORT}`);
  });

  await connectDB();
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
