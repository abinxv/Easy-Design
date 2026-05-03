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

const RECOVERY_PROMPTS_BY_LABEL = {
  bed: ["bed", "bed frame", "headboard", "mattress", "platform bed"],
};

const IMPORTANT_RECOVERY_OBJECTS = [
  "bed",
  "desk",
  "chair",
  "nightstand",
  "wardrobe",
  "dresser",
  "lamp",
  "sofa",
  "table",
  "mirror",
  "rug",
];

const CANONICAL_LABELS = new Map([
  ["armchair", "chair"],
  ["bed", "bed"],
  ["bed frame", "bed"],
  ["headboard", "bed"],
  ["mattress", "bed"],
  ["platform bed", "bed"],
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
  const serpApiConfigured = Boolean(pickEnv("SERPAPI_API_KEY", "SERP_PRIVATE_KEY", "SERP_API_KEY"));
  const geminiConfigured = Boolean(pickEnv("GEMINI_API_KEY", "GEMINI_KEY"));
  const googleVisionConfigured = Boolean(
    pickEnv("GOOGLE_VISION_API_KEY", "GOOGLE_CLOUD_API_KEY", "GOOGLE_API_KEY")
  );

  const notes = [];

  if (!cloudinaryConfigured) {
    notes.push(
      "Cloudinary is required for hosted crop URLs, which the visual product matching pipeline depends on."
    );
  }

  if (!roboflowConfigured) {
    notes.push("Add a Roboflow API key so the backend can detect room objects from uploaded photos.");
  }

  if (!serpApiConfigured) {
    notes.push("Add a SerpApi key so each detected object can be matched through Google Lens products.");
  }

  if (!googleVisionConfigured) {
    notes.push(
      "Google Vision is optional. Without it, the feature cannot fall back to web matches when Lens returns nothing."
    );
  }

  if (!geminiConfigured) {
    notes.push(
      "Extra object recovery is optional. Without it, very blended objects like beds may still be missed when Roboflow and Cloud Vision both fail."
    );
  }

  return {
    ready: roboflowConfigured && cloudinaryConfigured && (serpApiConfigured || googleVisionConfigured),
    services: {
      cloudinary: cloudinaryConfigured,
      gemini: geminiConfigured,
      roboflow: roboflowConfigured,
      serpApi: serpApiConfigured,
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

function normalizeTargetObjects(targetObjects) {
  if (!Array.isArray(targetObjects)) {
    return [];
  }

  return [...new Set(targetObjects.map((item) => canonicalizeLabel(item)).filter((item) => DEFAULT_TARGET_OBJECTS.includes(item)))];
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

function mergeDetections(...groups) {
  return dedupeDetections(groups.flat().filter(Boolean));
}

function hasDetectionForLabel(detections, label) {
  return detections.some((entry) => entry.label === label);
}

function getMissingTargets(detections, targets) {
  return targets.filter((target) => !hasDetectionForLabel(detections, target));
}

function getFallbackTargets({ detections, requestedObjects, activeTargetObjects }) {
  if (requestedObjects.length > 0) {
    return getMissingTargets(detections, requestedObjects);
  }

  if (detections.length === 0) {
    return activeTargetObjects;
  }

  return getMissingTargets(detections, IMPORTANT_RECOVERY_OBJECTS);
}

function getCloudinaryConfig() {
  const parsedUrl = parseCloudinaryUrl();

  return {
    cloudName: pickEnv("CLOUDINARY_CLOUD_NAME") || parsedUrl?.cloudName || "",
    apiKey: pickEnv("CLOUDINARY_API_KEY") || parsedUrl?.apiKey || "",
    apiSecret: pickEnv("CLOUDINARY_API_SECRET") || parsedUrl?.apiSecret || "",
  };
}

function getSerpApiKey() {
  return pickEnv("SERPAPI_API_KEY", "SERP_PRIVATE_KEY", "SERP_API_KEY");
}

function getGeminiApiKey() {
  return pickEnv("GEMINI_API_KEY", "GEMINI_KEY");
}

function getGeminiModel() {
  return pickEnv("GEMINI_MODEL") || "gemini-2.5-flash";
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

function normalizeRoboflowPrediction(prediction, image, allowedObjects) {
  const label = canonicalizeLabel(prediction.class || prediction.class_name);

  if (!allowedObjects.includes(label)) {
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

function normalizeGoogleObject(prediction, image, allowedObjects) {
  const label = canonicalizeLabel(prediction.name);

  if (!allowedObjects.includes(label)) {
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

async function detectWithRoboflow({ imageUrl, imageDataUrl, targetObjects, allowedObjects, confidenceOverride }) {
  const apiKey = pickEnv("ROBOFLOW_PRIVATE_KEY", "ROBOFLOW_API_KEY", "ROBOFLOW_PUBLISHABLE_API_KEY");
  const normalizedAllowedObjects = Array.isArray(allowedObjects) && allowedObjects.length > 0 ? allowedObjects : targetObjects;

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
      text: targetObjects,
      confidence: confidenceOverride ?? (targetObjects.length <= 3 ? 0.08 : 0.16),
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
        .map((prediction) => normalizeRoboflowPrediction(prediction, imageSize, normalizedAllowedObjects))
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

function getMimeTypeFromDataUrl(imageDataUrl) {
  const match = String(imageDataUrl || "").match(/^data:([^;]+);base64,/);
  return match?.[1] || "image/jpeg";
}

async function callGeminiObjectRecovery({ imageDataUrl, missingTargets }) {
  const apiKey = getGeminiApiKey();

  if (!apiKey || missingTargets.length === 0) {
    return [];
  }

  const prompt = [
    "Detect only the following prominent room objects if they are clearly visible.",
    `Allowed labels: ${missingTargets.join(", ")}.`,
    "Return a JSON array.",
    'Each item must have: "label", "box_2d", and "confidence".',
    '"box_2d" must be [ymin, xmin, ymax, xmax] normalized to 0-1000.',
    "Do not include duplicates.",
    "Do not include tiny decorative sub-parts.",
    "Prefer the main full object instance when multiple candidates exist.",
  ].join(" ");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel())}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: getMimeTypeFromDataUrl(imageDataUrl),
                  data: stripDataUrlPrefix(imageDataUrl),
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  enum: missingTargets,
                },
                box_2d: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: {
                    type: "integer",
                    minimum: 0,
                    maximum: 1000,
                  },
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                },
              },
              required: ["label", "box_2d", "confidence"],
            },
          },
        },
      }),
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const message = payload?.error?.message || payload?.error || "Object recovery request failed.";
    throw createHttpError(message, 502);
  }

  const text = payload?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === "string")?.text || "[]";

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw createHttpError("Object recovery returned an invalid response.", 502);
  }
}

async function detectWithGoogleVision(imageUrl, imageSize, targetObjects) {
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
    imageProperties.map((entry) => normalizeGoogleObject(entry, imageSize, targetObjects)).filter(Boolean)
  );
}

function normalizeGeminiObject(prediction, image, allowedObjects) {
  const label = canonicalizeLabel(prediction?.label);

  if (!allowedObjects.includes(label) || !Array.isArray(prediction?.box_2d) || prediction.box_2d.length !== 4) {
    return null;
  }

  const [ymin, xmin, ymax, xmax] = prediction.box_2d.map((value) => clamp(Number(value || 0), 0, 1000));
  const boundingBox = roundBox(
    {
      x: (xmin / 1000) * image.width,
      y: (ymin / 1000) * image.height,
      width: ((xmax - xmin) / 1000) * image.width,
      height: ((ymax - ymin) / 1000) * image.height,
    },
    image
  );

  if (boundingBox.width < 1 || boundingBox.height < 1) {
    return null;
  }

  const confidence = Number(prediction?.confidence || 0);

  return {
    id: randomUUID(),
    label,
    rawLabel: String(prediction?.label || label),
    confidence: confidence > 1 ? confidence / 100 : confidence,
    boundingBox,
  };
}

async function detectWithGeminiRecovery({ imageDataUrl, imageSize, targetObjects }) {
  const predictions = await callGeminiObjectRecovery({
    imageDataUrl,
    missingTargets: targetObjects,
  });

  return dedupeDetections(
    predictions.map((entry) => normalizeGeminiObject(entry, imageSize, targetObjects)).filter(Boolean)
  );
}

function getDetectionPriority(detection) {
  return detection.confidence * detection.boundingBox.width * detection.boundingBox.height;
}

function pickBestDetectionsForTargets(detections, targetObjects) {
  const bestByLabel = new Map();

  detections.forEach((detection) => {
    const current = bestByLabel.get(detection.label);
    const score = getDetectionPriority(detection);

    if (!current || score > current.score) {
      bestByLabel.set(detection.label, {
        detection,
        score,
      });
    }
  });

  return targetObjects
    .map((target) => bestByLabel.get(target)?.detection || null)
    .filter(Boolean);
}

async function searchWithSerpApiLens(imageUrl, type) {
  const apiKey = getSerpApiKey();

  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    country: pickEnv("SERPAPI_COUNTRY") || "in",
    engine: "google_lens",
    hl: pickEnv("SERPAPI_HL") || "en",
    type,
    url: imageUrl,
  });
  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const message = payload?.error || "SerpApi Google Lens request failed.";
    throw createHttpError(message, 502);
  }

  return payload;
}

function extractLensMatches(payload, mode) {
  const matches = payload?.visual_matches || [];
  const unique = [];
  const seen = new Set();

  matches.forEach((item) => {
    const url = String(item?.link || "").trim();

    if (!url || seen.has(url)) {
      return;
    }

    seen.add(url);
    unique.push({
      kind: "product",
      source: String(item?.source || getHost(url) || "Google Lens"),
      title: stripHtml(item?.title) || "Visual product match",
      url,
      provider: mode === "lens_products" ? "Google Lens products" : "Google Lens visual matches",
      thumbnailUrl: String(item?.thumbnail || item?.image || "").trim() || null,
      price: item?.price
        ? {
            amount: Number.isFinite(Number(item.price.extracted_value)) ? Number(item.price.extracted_value) : null,
            currency: String(item.price.currency || "").trim() || null,
            value: String(item.price.value || "").trim() || null,
          }
        : null,
      inStock: typeof item?.in_stock === "boolean" ? item.in_stock : null,
    });
  });

  return unique.slice(0, 6);
}

async function findLensMatches(imageUrl) {
  const productsPayload = await searchWithSerpApiLens(imageUrl, "products");
  const productMatches = extractLensMatches(productsPayload, "lens_products");

  if (productMatches.length > 0) {
    return {
      matchMode: "lens_products",
      matches: productMatches,
    };
  }

  const visualPayload = await searchWithSerpApiLens(imageUrl, "visual_matches");
  const visualMatches = extractLensMatches(visualPayload, "lens_visual_matches");

  if (visualMatches.length > 0) {
    return {
      matchMode: "lens_visual_matches",
      matches: visualMatches,
    };
  }

  return {
    matchMode: "lens_none",
    matches: [],
  };
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

function pickDetectionProvider(status, usedGoogleFallback, usedGeminiFallback) {
  if (status.services.roboflow && usedGoogleFallback && usedGeminiFallback) {
    return "Roboflow YOLO-World with Google Vision and recovery pass";
  }

  if (status.services.roboflow && usedGeminiFallback) {
    return "Roboflow YOLO-World with recovery pass";
  }

  if (status.services.roboflow && usedGoogleFallback) {
    return "Roboflow YOLO-World with Google Vision fallback";
  }

  if (status.services.roboflow) {
    return "Roboflow YOLO-World";
  }

  return "Google Vision Object Localization";
}

function serializeDetectedObject(detection, sourceImageUrl) {
  return {
    id: detection.id,
    label: detection.label,
    rawLabel: detection.rawLabel,
    confidence: Number(detection.confidence.toFixed(3)),
    boundingBox: detection.boundingBox,
    cropImageUrl: sourceImageUrl ? buildCropUrl(sourceImageUrl, detection.boundingBox) : null,
  };
}

function normalizeDetectedObjectInputs(detectedObjects, sourceImage, sourceImageUrl) {
  if (!Array.isArray(detectedObjects)) {
    return [];
  }

  return detectedObjects
    .map((entry, index) => {
      const label = canonicalizeLabel(entry?.label || entry?.rawLabel);

      if (!DEFAULT_TARGET_OBJECTS.includes(label)) {
        return null;
      }

      const boundingBox = roundBox(
        {
          x: Number(entry?.boundingBox?.x || 0),
          y: Number(entry?.boundingBox?.y || 0),
          width: Number(entry?.boundingBox?.width || 0),
          height: Number(entry?.boundingBox?.height || 0),
        },
        sourceImage
      );

      if (boundingBox.width < 1 || boundingBox.height < 1) {
        return null;
      }

      return {
        id: String(entry?.id || `detected-${index + 1}`),
        label,
        rawLabel: String(entry?.rawLabel || entry?.label || label),
        confidence: Number(entry?.confidence || 0),
        boundingBox,
        cropImageUrl: String(entry?.cropImageUrl || "").trim() || (sourceImageUrl ? buildCropUrl(sourceImageUrl, boundingBox) : null),
      };
    })
    .filter(Boolean);
}

async function buildMatchedObject({ entry, status, warnings }) {
  let webDetection = null;
  let webEntities = [];
  let searchQuery = "";
  let matchMode = "no_matches";
  let matches = [];

  if (status.services.serpApi && entry.cropImageUrl) {
    try {
      const lensResult = await findLensMatches(entry.cropImageUrl);
      matches = lensResult.matches;
      matchMode = lensResult.matchMode;
    } catch (error) {
      warnings.push(`Google Lens matching failed for ${entry.label}: ${error.message}`);
    }
  }

  if (matches.length === 0 && status.services.googleVision && entry.cropImageUrl) {
    try {
      webDetection = await detectWebMatches(entry.cropImageUrl);
    } catch (error) {
      warnings.push(`Google web matching failed for ${entry.label}: ${error.message}`);
    }
  }

  if (matches.length === 0) {
    webEntities = extractWebEntities(webDetection, entry.label);
    searchQuery = buildSearchQuery(entry.label, webEntities);
    matches = buildWebMatches(webDetection, entry.label, searchQuery);
    matchMode = matches.length > 0 ? "google_vision_fallback" : matchMode;
  }

  return {
    id: entry.id,
    label: entry.label,
    rawLabel: entry.rawLabel,
    confidence: Number(entry.confidence.toFixed(3)),
    boundingBox: entry.boundingBox,
    cropImageUrl: entry.cropImageUrl,
    matchMode,
    searchQuery,
    webEntities,
    matches,
  };
}

async function detectRoomPhoto({ imageDataUrl, fileName, targetObjects }) {
  const status = getRoomAnalysisStatus();
  const requestedObjects = normalizeTargetObjects(targetObjects);
  const activeTargetObjects = requestedObjects.length > 0 ? requestedObjects : DEFAULT_TARGET_OBJECTS;

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
  let usedGeminiFallback = false;
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
        targetObjects: activeTargetObjects,
        allowedObjects: activeTargetObjects,
      });
      detections = roboflowResult.detections;
      if (!imageSize.width || !imageSize.height) {
        imageSize = roboflowResult.imageSize || imageSize;
      }
    } catch (error) {
      warnings.push(`Roboflow detection failed: ${error.message}`);
    }
  }

  const recoveryTargets = (requestedObjects.length > 0 ? requestedObjects : ["bed"]).filter(
    (target) => RECOVERY_PROMPTS_BY_LABEL[target] && !hasDetectionForLabel(detections, target)
  );

  for (const target of recoveryTargets) {
    try {
      const recoveryResult = await detectWithRoboflow({
        imageUrl: remoteImageUrl || undefined,
        imageDataUrl,
        targetObjects: RECOVERY_PROMPTS_BY_LABEL[target],
        allowedObjects: [target],
        confidenceOverride: 0.05,
      });
      detections = mergeDetections(detections, recoveryResult.detections);

      if ((!imageSize.width || !imageSize.height) && recoveryResult.imageSize) {
        imageSize = recoveryResult.imageSize;
      }
    } catch (error) {
      warnings.push(`Supplemental ${target} detection failed: ${error.message}`);
    }
  }

  const googleFallbackTargets = getFallbackTargets({
    detections,
    requestedObjects,
    activeTargetObjects,
  });

  if (googleFallbackTargets.length > 0 && status.services.googleVision && remoteImageUrl) {
    try {
      const googleDetections = await detectWithGoogleVision(remoteImageUrl, imageSize, googleFallbackTargets);
      detections = mergeDetections(detections, googleDetections);
      if (googleDetections.length > 0) {
        usedGoogleFallback = true;
      }
    } catch (error) {
      warnings.push(`Google Vision object detection failed: ${error.message}`);
    }
  }

  const geminiFallbackTargets = getFallbackTargets({
    detections,
    requestedObjects,
    activeTargetObjects,
  });

  if (geminiFallbackTargets.length > 0 && status.services.gemini) {
    try {
      const geminiDetections = await detectWithGeminiRecovery({
        imageDataUrl,
        imageSize,
        targetObjects: geminiFallbackTargets,
      });
      detections = mergeDetections(detections, geminiDetections);
      if (geminiDetections.length > 0) {
        usedGeminiFallback = true;
      }
    } catch (error) {
      warnings.push("Object recovery failed. Continuing with the available detections.");
    }
  }

  const candidateDetections =
    requestedObjects.length > 0 ? pickBestDetectionsForTargets(detections, requestedObjects) : detections;

  const detectedObjects = candidateDetections
    .filter((entry) => entry.boundingBox.width >= 30 && entry.boundingBox.height >= 30)
    .slice(0, requestedObjects.length > 0 ? requestedObjects.length : 8)
    .map((entry) => ({
      ...entry,
      boundingBox: padBox(entry.boundingBox, imageSize),
    }))
    .map((entry) => serializeDetectedObject(entry, remoteImageUrl));

  if (detectedObjects.length === 0) {
    warnings.push("No strong furniture matches were found in this image. Try a clearer room photo with more visible objects.");
  }

  if (requestedObjects.length > 0) {
    const detectedLabels = new Set(detectedObjects.map((item) => item.label));
    const missingObjects = requestedObjects.filter((item) => !detectedLabels.has(item));

    if (missingObjects.length > 0) {
      warnings.push(`Could not confidently isolate: ${missingObjects.join(", ")}.`);
    }
  }

  return {
    analysisId: uploaded?.public_id || `room-analysis-${Date.now()}`,
    requestedObjects,
    sourceImageUrl: uploaded?.secure_url || null,
    sourceImage: imageSize,
    detectionProvider: pickDetectionProvider(status, usedGoogleFallback, usedGeminiFallback),
    warnings,
    detectedObjects,
  };
}

async function matchDetectedObjects({
  analysisId,
  detectionProvider,
  detectedObjects,
  selectedObjectIds,
  sourceImage,
  sourceImageUrl,
}) {
  const status = getRoomAnalysisStatus();
  const warnings = [];

  if (!status.services.serpApi && !status.services.googleVision) {
    throw createHttpError("Product matching is not configured yet.", 503);
  }

  if (!sourceImageUrl) {
    throw createHttpError("The uploaded room image is missing, so matching cannot continue.", 400);
  }

  if (!sourceImage?.width || !sourceImage?.height) {
    throw createHttpError("The uploaded room image size is missing, so matching cannot continue.", 400);
  }

  const normalizedObjects = normalizeDetectedObjectInputs(detectedObjects, sourceImage, sourceImageUrl);
  const selectedIds = new Set(
    Array.isArray(selectedObjectIds) ? selectedObjectIds.map((item) => String(item || "").trim()).filter(Boolean) : []
  );
  const objectsToMatch = normalizedObjects.filter((entry) => selectedIds.size === 0 || selectedIds.has(entry.id));

  if (objectsToMatch.length === 0) {
    throw createHttpError("Select at least one detected object before finding product matches.", 400);
  }

  const matchedObjects = (
    await Promise.allSettled(objectsToMatch.map((entry) => buildMatchedObject({ entry, status, warnings })))
  )
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (matchedObjects.length === 0) {
    warnings.push("No product matches were found for the selected objects.");
  }

  return {
    analysisId: String(analysisId || `room-analysis-${Date.now()}`),
    selectedObjectIds: objectsToMatch.map((entry) => entry.id),
    sourceImageUrl,
    sourceImage,
    detectionProvider: detectionProvider || "Roboflow YOLO-World",
    searchProvider: status.services.serpApi
      ? "SerpApi Google Lens products with Google Vision fallback"
      : "Google Vision web matching fallback only",
    warnings,
    detectedObjects: matchedObjects,
  };
}

async function analyzeRoomPhoto({ imageDataUrl, fileName, targetObjects }) {
  const detection = await detectRoomPhoto({ imageDataUrl, fileName, targetObjects });
  const matching = await matchDetectedObjects({
    analysisId: detection.analysisId,
    detectionProvider: detection.detectionProvider,
    detectedObjects: detection.detectedObjects,
    selectedObjectIds: detection.detectedObjects.map((item) => item.id),
    sourceImage: detection.sourceImage,
    sourceImageUrl: detection.sourceImageUrl,
  });

  return {
    ...matching,
    requestedObjects: detection.requestedObjects,
    warnings: [...new Set([...detection.warnings, ...matching.warnings])],
  };
}

module.exports = {
  analyzeRoomPhoto,
  detectRoomPhoto,
  getRoomAnalysisStatus,
  matchDetectedObjects,
};
