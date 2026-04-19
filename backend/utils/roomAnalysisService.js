const { createHash, randomUUID } = require("crypto");

const DEFAULT_TARGET_OBJECTS = [
  "bed",
  "desk",
  "chair",
  "nightstand",
  "wardrobe",
  "closet",
  "dresser",
  "lamp",
  "sofa",
  "table",
  "bookshelf",
  "cabinet",
  "mirror",
  "rug",
  "plant",
  "ottoman",
  "television",
];

const CANONICAL_LABELS = new Map([
  ["armchair", "chair"],
  ["bed", "bed"],
  ["bed frame", "bed"],
  ["bookcase", "bookshelf"],
  ["bookshelf", "bookshelf"],
  ["cabinet", "cabinet"],
  ["chair", "chair"],
  ["closet", "wardrobe"],
  ["couch", "sofa"],
  ["desk", "desk"],
  ["desk table", "desk"],
  ["dresser", "dresser"],
  ["drawers", "dresser"],
  ["lamp", "lamp"],
  ["light", "lamp"],
  ["mirror", "mirror"],
  ["night stand", "nightstand"],
  ["night table", "nightstand"],
  ["nightstand", "nightstand"],
  ["ottoman", "ottoman"],
  ["plant", "plant"],
  ["potted plant", "plant"],
  ["rug", "rug"],
  ["shelf", "bookshelf"],
  ["shelving", "bookshelf"],
  ["side table", "nightstand"],
  ["sofa", "sofa"],
  ["table", "table"],
  ["television", "television"],
  ["tv", "television"],
  ["wardrobe", "wardrobe"],
]);

const IGNORED_WEB_HOSTS = [
  "cloudinary.com",
  "facebook.com",
  "flickr.com",
  "instagram.com",
  "pinterest.",
  "reddit.com",
  "tiktok.com",
  "tumblr.com",
  "youtube.com",
];

const PREFERRED_HOSTS = [
  "amazon.",
  "ikea.com",
  "flipkart.com",
  "wayfair.com",
  "target.com",
  "walmart.com",
  "etsy.com",
  "pepperfry.com",
  "urbanladder.com",
  "homecentre.in",
];

function pickEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function parseCloudinaryUrl() {
  const cloudinaryUrl = pickEnv("CLOUDINARY_URL");

  if (!cloudinaryUrl) {
    return null;
  }

  try {
    const parsed = new URL(cloudinaryUrl);

    if (parsed.protocol !== "cloudinary:") {
      return null;
    }

    return {
      cloudName: decodeURIComponent(parsed.hostname || ""),
      apiKey: decodeURIComponent(parsed.username || ""),
      apiSecret: decodeURIComponent(parsed.password || ""),
    };
  } catch {
    return null;
  }
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getRoomAnalysisStatus() {
  const cloudinary = getCloudinaryConfig();
  const cloudinaryConfigured = Boolean(cloudinary.cloudName) && Boolean(cloudinary.apiKey) && Boolean(cloudinary.apiSecret);
  const roboflowConfigured = Boolean(pickEnv("ROBOFLOW_PRIVATE_KEY", "ROBOFLOW_API_KEY", "ROBOFLOW_PUBLISHABLE_API_KEY"));
  const googleVisionConfigured = Boolean(
    pickEnv("GOOGLE_VISION_API_KEY", "GOOGLE_CLOUD_API_KEY", "GOOGLE_API_KEY")
  );

  const notes = [];

  if (!cloudinaryConfigured) {
    notes.push(
      "Cloudinary is optional. Add CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_SECRET if you want hosted crop URLs and stronger visual web matches."
    );
  }

  if (!roboflowConfigured) {
    notes.push("Add a Roboflow API key so the backend can detect room objects from uploaded photos.");
  }

  if (!googleVisionConfigured) {
    notes.push(
      "Google Vision web matching is optional. Without it, the feature falls back to generated Google Shopping and store search links."
    );
  }

  return {
    ready: roboflowConfigured,
    services: {
      cloudinary: cloudinaryConfigured,
      roboflow: roboflowConfigured,
      googleVision: googleVisionConfigured,
    },
    notes,
  };
}

function normalizeLabel(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function canonicalizeLabel(label) {
  const normalized = normalizeLabel(label);
  return CANONICAL_LABELS.get(normalized) || normalized;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundBox(box, image) {
  const x = clamp(Math.round(box.x), 0, Math.max(image.width - 1, 0));
  const y = clamp(Math.round(box.y), 0, Math.max(image.height - 1, 0));
  const width = clamp(Math.round(box.width), 1, Math.max(image.width - x, 1));
  const height = clamp(Math.round(box.height), 1, Math.max(image.height - y, 1));

  return {
    x,
    y,
    width,
    height,
  };
}

function padBox(box, image, ratio = 0.06) {
  const padX = Math.round(box.width * ratio);
  const padY = Math.round(box.height * ratio);
  const left = clamp(box.x - padX, 0, Math.max(image.width - 1, 0));
  const top = clamp(box.y - padY, 0, Math.max(image.height - 1, 0));
  const right = clamp(box.x + box.width + padX, left + 1, image.width);
  const bottom = clamp(box.y + box.height + padY, top + 1, image.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function calculateIoU(left, right) {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.width, right.x + right.width);
  const y2 = Math.min(left.y + left.height, right.y + right.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

  if (intersection <= 0) {
    return 0;
  }

  const leftArea = left.width * left.height;
  const rightArea = right.width * right.height;
  return intersection / (leftArea + rightArea - intersection);
}

function dedupeDetections(detections) {
  const unique = [];

  detections
    .sort((left, right) => right.confidence - left.confidence)
    .forEach((candidate) => {
      const hasDuplicate = unique.some(
        (entry) =>
          entry.label === candidate.label &&
          calculateIoU(entry.boundingBox, candidate.boundingBox) >= 0.7
      );

      if (!hasDuplicate) {
        unique.push(candidate);
      }
    });

  return unique;
}

function getCloudinaryConfig() {
  const parsedUrl = parseCloudinaryUrl();

  return {
    cloudName: pickEnv("CLOUDINARY_CLOUD_NAME") || parsedUrl?.cloudName || "",
    apiKey: pickEnv("CLOUDINARY_API_KEY") || parsedUrl?.apiKey || "",
    apiSecret: pickEnv("CLOUDINARY_API_SECRET") || parsedUrl?.apiSecret || "",
  };
}

function signCloudinaryParams(params, apiSecret) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${signatureBase}${apiSecret}`)
    .digest("hex");
}

async function uploadSourceImage(imageDataUrl, fileName) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    throw createHttpError("Cloudinary is not fully configured in backend/.env.", 503);
  }

  if (!String(imageDataUrl || "").startsWith("data:image/")) {
    throw createHttpError("Please upload a valid image file.", 400);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "easy-design/room-shop";
  const publicId = `room-${Date.now()}-${randomUUID()}`;
  const paramsToSign = {
    filename_override: fileName ? String(fileName) : undefined,
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = signCloudinaryParams(paramsToSign, apiSecret);
  const body = new FormData();

  body.append("file", imageDataUrl);
  body.append("folder", folder);
  body.append("public_id", publicId);
  body.append("timestamp", String(timestamp));
  body.append("api_key", apiKey);
  body.append("signature", signature);

  if (fileName) {
    body.append("filename_override", String(fileName));
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.secure_url) {
    const message = payload?.error?.message || "Cloudinary upload failed.";
    throw createHttpError(message, 502);
  }

  return payload;
}

function stripDataUrlPrefix(imageDataUrl) {
  return String(imageDataUrl || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function normalizeRoboflowPrediction(prediction, image) {
  const label = canonicalizeLabel(prediction.class || prediction.class_name);

  if (!DEFAULT_TARGET_OBJECTS.includes(label)) {
    return null;
  }

  const width = Number(prediction.width || 0);
  const height = Number(prediction.height || 0);
  const x = Number(prediction.x || 0) - width / 2;
  const y = Number(prediction.y || 0) - height / 2;

  if (!width || !height) {
    return null;
  }

  return {
    id: randomUUID(),
    label,
    rawLabel: String(prediction.class || prediction.class_name || label),
    confidence: Number(prediction.confidence || prediction.class_confidence || 0),
    boundingBox: roundBox({ x, y, width, height }, image),
  };
}

function normalizedVerticesToBox(vertices, image) {
  const xs = vertices.map((vertex) => Number(vertex?.x || 0));
  const ys = vertices.map((vertex) => Number(vertex?.y || 0));
  const minX = clamp(Math.min(...xs, 0), 0, 1);
  const minY = clamp(Math.min(...ys, 0), 0, 1);
  const maxX = clamp(Math.max(...xs, 0), 0, 1);
  const maxY = clamp(Math.max(...ys, 0), 0, 1);

  return roundBox(
    {
      x: minX * image.width,
      y: minY * image.height,
      width: Math.max((maxX - minX) * image.width, 1),
      height: Math.max((maxY - minY) * image.height, 1),
    },
    image
  );
}

function normalizeGoogleObject(prediction, image) {
  const label = canonicalizeLabel(prediction.name);

  if (!DEFAULT_TARGET_OBJECTS.includes(label)) {
    return null;
  }

  return {
    id: randomUUID(),
    label,
    rawLabel: String(prediction.name || label),
    confidence: Number(prediction.score || 0),
    boundingBox: normalizedVerticesToBox(prediction.boundingPoly?.normalizedVertices || [], image),
  };
}

async function detectWithRoboflow({ imageUrl, imageDataUrl }) {
  const apiKey = pickEnv("ROBOFLOW_PRIVATE_KEY", "ROBOFLOW_API_KEY", "ROBOFLOW_PUBLISHABLE_API_KEY");

  if (!apiKey) {
    return {
      detections: [],
      imageSize: null,
    };
  }

  const response = await fetch(`https://infer.roboflow.com/yolo_world/infer?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: randomUUID(),
      image: imageUrl
        ? {
            type: "url",
            value: imageUrl,
          }
        : {
            type: "base64",
            value: stripDataUrlPrefix(imageDataUrl),
          },
      text: DEFAULT_TARGET_OBJECTS,
      confidence: 0.16,
      yolo_world_version_id: "l",
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.error || "Roboflow detection failed.";
    throw createHttpError(message, 502);
  }

  const image = Array.isArray(payload?.image) ? payload.image[0] : payload?.image;
  const imageSize = {
    width: Number(image?.width || 0),
    height: Number(image?.height || 0),
  };

  if (!imageSize.width || !imageSize.height) {
    return {
      detections: [],
      imageSize: null,
    };
  }

  return {
    detections: dedupeDetections(
      (payload?.predictions || [])
        .map((prediction) => normalizeRoboflowPrediction(prediction, imageSize))
        .filter(Boolean)
    ),
    imageSize,
  };
}

async function callGoogleVision(request) {
  const apiKey = pickEnv("GOOGLE_VISION_API_KEY", "GOOGLE_CLOUD_API_KEY", "GOOGLE_API_KEY");

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [request],
      }),
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const message = payload?.error?.message || "Google Vision request failed.";
    throw createHttpError(message, 502);
  }

  return payload?.responses?.[0] || null;
}

async function detectWithGoogleVision(imageUrl, imageSize) {
  const response = await callGoogleVision({
    image: {
      source: {
        imageUri: imageUrl,
      },
    },
    features: [
      {
        type: "OBJECT_LOCALIZATION",
        maxResults: 12,
      },
    ],
  });

  const imageProperties = response?.localizedObjectAnnotations || [];

  if (!imageProperties.length || !imageSize?.width || !imageSize?.height) {
    return [];
  }

  return dedupeDetections(
    imageProperties.map((entry) => normalizeGoogleObject(entry, imageSize)).filter(Boolean)
  );
}

function buildCropUrl(sourceUrl, box) {
  const transformations = `c_crop,x_${box.x},y_${box.y},w_${box.width},h_${box.height},f_auto,q_auto`;
  return sourceUrl.replace("/upload/", `/upload/${transformations}/`);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function shouldIgnoreHost(host) {
  return IGNORED_WEB_HOSTS.some((item) => host.includes(item));
}

function scoreHost(host) {
  const preferredIndex = PREFERRED_HOSTS.findIndex((item) => host.includes(item));
  return preferredIndex === -1 ? 0 : 10 - preferredIndex;
}

function buildSearchQuery(label, webEntities) {
  const extraDescriptors = webEntities
    .map((entity) => normalizeLabel(entity))
    .filter((entity) => entity && !entity.includes(label) && entity !== "furniture")
    .slice(0, 2);

  return extraDescriptors.length > 0
    ? `${extraDescriptors.join(" ")} ${label} furniture`
    : `${label} furniture`;
}

function buildStoreSearches(query) {
  const encoded = encodeURIComponent(query);

  return [
    {
      kind: "shopping",
      source: "Google Shopping",
      title: "Google Shopping results",
      url: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    },
    {
      kind: "search",
      source: "Google Search",
      title: "Google image and web results",
      url: `https://www.google.com/search?q=${encoded}`,
    },
    {
      kind: "store",
      source: "Amazon",
      title: "Amazon search",
      url: `https://www.amazon.in/s?k=${encoded}`,
    },
    {
      kind: "store",
      source: "IKEA",
      title: "IKEA search",
      url: `https://www.ikea.com/in/en/search/?q=${encoded}`,
    },
    {
      kind: "store",
      source: "Flipkart",
      title: "Flipkart search",
      url: `https://www.flipkart.com/search?q=${encoded}`,
    },
  ];
}

async function detectWebMatches(imageUrl) {
  const response = await callGoogleVision({
    image: {
      source: {
        imageUri: imageUrl,
      },
    },
    features: [
      {
        type: "WEB_DETECTION",
        maxResults: 10,
      },
    ],
  });

  return response?.webDetection || null;
}

function extractWebEntities(webDetection, label) {
  return (webDetection?.webEntities || [])
    .map((entry) => String(entry?.description || "").trim())
    .filter(Boolean)
    .filter((entity) => normalizeLabel(entity) !== label)
    .slice(0, 4);
}

function buildWebMatches(webDetection, label, query) {
  const pages = (webDetection?.pagesWithMatchingImages || [])
    .map((page) => ({
      kind: "web",
      source: getHost(page.url) || "Web match",
      title: stripHtml(page.pageTitle) || `${label} match`,
      url: page.url,
      score: scoreHost(getHost(page.url)) + (stripHtml(page.pageTitle).toLowerCase().includes(label) ? 2 : 0),
    }))
    .filter((page) => Boolean(page.url))
    .filter((page) => !shouldIgnoreHost(getHost(page.url)))
    .sort((left, right) => right.score - left.score);

  const unique = [];
  const seen = new Set();

  pages.forEach((page) => {
    if (seen.has(page.url)) {
      return;
    }

    seen.add(page.url);
    unique.push({
      kind: page.kind,
      source: page.source,
      title: page.title,
      url: page.url,
    });
  });

  return [...unique.slice(0, 4), ...buildStoreSearches(query)];
}

function pickDetectionProvider(status, usedGoogleFallback) {
  if (status.services.roboflow && usedGoogleFallback) {
    return "Roboflow YOLO-World with Google Vision fallback";
  }

  if (status.services.roboflow) {
    return "Roboflow YOLO-World";
  }

  return "Google Vision Object Localization";
}

async function analyzeRoomPhoto({ imageDataUrl, fileName }) {
  const status = getRoomAnalysisStatus();

  if (!status.ready) {
    throw createHttpError(status.notes[0] || "Room analysis is not configured yet.", 503);
  }

  if (String(imageDataUrl || "").length > 10_000_000) {
    throw createHttpError("The uploaded image is too large. Please try a smaller image.", 413);
  }

  const uploaded = status.services.cloudinary ? await uploadSourceImage(imageDataUrl, fileName) : null;
  const remoteImageUrl = uploaded?.secure_url || "";
  const warnings = [];
  let detections = [];
  let usedGoogleFallback = false;
  let imageSize = uploaded
    ? {
        width: Number(uploaded.width || 0),
        height: Number(uploaded.height || 0),
      }
    : {
        width: 0,
        height: 0,
      };

  if (status.services.roboflow) {
    try {
      const roboflowResult = await detectWithRoboflow({
        imageUrl: remoteImageUrl || undefined,
        imageDataUrl,
      });
      detections = roboflowResult.detections;
      if (!imageSize.width || !imageSize.height) {
        imageSize = roboflowResult.imageSize || imageSize;
      }
    } catch (error) {
      warnings.push(`Roboflow detection failed: ${error.message}`);
    }
  }

  if (detections.length === 0 && status.services.googleVision && remoteImageUrl) {
    try {
      detections = await detectWithGoogleVision(remoteImageUrl, imageSize);
      usedGoogleFallback = true;
    } catch (error) {
      warnings.push(`Google Vision object detection failed: ${error.message}`);
    }
  }

  const limitedDetections = detections
    .filter((entry) => entry.boundingBox.width >= 30 && entry.boundingBox.height >= 30)
    .slice(0, 8)
    .map((entry) => ({
      ...entry,
      boundingBox: padBox(entry.boundingBox, imageSize),
    }));

  const detectedObjects = (
    await Promise.allSettled(
      limitedDetections.map(async (entry) => {
        const cropImageUrl = remoteImageUrl ? buildCropUrl(remoteImageUrl, entry.boundingBox) : null;
        let webDetection = null;

        if (status.services.googleVision && cropImageUrl) {
          try {
            webDetection = await detectWebMatches(cropImageUrl);
          } catch (error) {
            warnings.push(`Google web matching failed for ${entry.label}: ${error.message}`);
          }
        }

        const webEntities = extractWebEntities(webDetection, entry.label);
        const searchQuery = buildSearchQuery(entry.label, webEntities);

        return {
          id: entry.id,
          label: entry.label,
          rawLabel: entry.rawLabel,
          confidence: Number(entry.confidence.toFixed(3)),
          boundingBox: entry.boundingBox,
          cropImageUrl,
          searchQuery,
          webEntities,
          matches: buildWebMatches(webDetection, entry.label, searchQuery),
        };
      })
    )
  )
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (detectedObjects.length === 0) {
    warnings.push("No strong furniture matches were found in this image. Try a clearer room photo with more visible objects.");
  }

  return {
    analysisId: uploaded?.public_id || `room-analysis-${Date.now()}`,
    sourceImageUrl: uploaded?.secure_url || null,
    sourceImage: imageSize,
    detectionProvider: pickDetectionProvider(status, usedGoogleFallback),
    searchProvider: status.services.googleVision && remoteImageUrl
      ? "Google Vision web matching plus generated shopping links"
      : "Generated Google and store search links",
    warnings,
    detectedObjects,
  };
}

module.exports = {
  analyzeRoomPhoto,
  getRoomAnalysisStatus,
};
