const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  visitors: {
    type: Number,
    default: 0,
  },
  totalTime: {
    type: Number,
    default: 0, // seconds
  },
  avgTime: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Analytics", analyticsSchema);
