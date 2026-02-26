const mongoose = require("mongoose");

const designSchema = new mongoose.Schema({
  style: String,
  colorTheme: String,
  budget: Number,
  rooms: {
    livingRoom: [String],
    bedroom: [String],
    kitchen: [String],
    diningRoom: [String],
    study: [String],
    other: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Design", designSchema);