const mongoose = require("mongoose");

const boundingBoxSchema = new mongoose.Schema(
  {
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const imageSizeSchema = new mongoose.Schema(
  {
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const roomMatchSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      default: "",
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
  },
  { _id: false }
);

const detectedObjectSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    rawLabel: {
      type: String,
      default: "",
      trim: true,
    },
    confidence: {
      type: Number,
      default: 0,
    },
    boundingBox: {
      type: boundingBoxSchema,
      required: true,
    },
    cropImageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    matchMode: {
      type: String,
      default: "",
      trim: true,
    },
    searchQuery: {
      type: String,
      default: "",
      trim: true,
    },
    webEntities: {
      type: [String],
      default: [],
    },
    matches: {
      type: [roomMatchSchema],
      default: [],
    },
  },
  { _id: false }
);

const roomUploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    analysisId: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    sourceImageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    sourceImage: {
      type: imageSizeSchema,
      default: () => ({ width: 0, height: 0 }),
    },
    detectionProvider: {
      type: String,
      default: "",
      trim: true,
    },
    searchProvider: {
      type: String,
      default: "",
      trim: true,
    },
    warnings: {
      type: [String],
      default: [],
    },
    detectedObjects: {
      type: [detectedObjectSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RoomUpload", roomUploadSchema);
