const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const designRoutes = require("./routes/designs");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Easy-Design Backend running ✅" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
