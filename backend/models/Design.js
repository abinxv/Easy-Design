const mongoose = require("mongoose");
const { roomCatalog } = require("../data/roomCatalog");

const inspirationSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["overview", "item", "palette", "combo"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    searchQuery: {
      type: String,
      required: true,
      trim: true,
    },
    pinterestUrl: {
      type: String,
      required: true,
      trim: true,
    },
    previewKey: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const designSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    room: {
      type: String,
      enum: Object.keys(roomCatalog),
      required: true,
    },
    roomLabel: {
      type: String,
      required: true,
      trim: true,
    },
    selectedItems: {
      type: [String],
      default: [],
    },
    inspirations: {
      type: [inspirationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Design", designSchema);
