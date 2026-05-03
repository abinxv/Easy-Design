const mongoose = require("mongoose");

const cartPriceSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: null,
      trim: true,
    },
    value: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const cartItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    objectId: {
      type: String,
      default: "",
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
      trim: true,
    },
    provider: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: cartPriceSchema,
      default: null,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const cartSuggestionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    searchQuery: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const roomShopCartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    suggestions: {
      type: [cartSuggestionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RoomShopCart", roomShopCartSchema);
