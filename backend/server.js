const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const designRoutes = require("./routes/designs");

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
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "easy-design-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "EasyDesign backend is running." });
});

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`EasyDesign backend listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
