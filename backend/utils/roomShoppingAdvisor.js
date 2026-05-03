const { randomUUID } = require("crypto");

const MAX_CART_ITEMS = 12;

function pickEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getGeminiApiKey() {
  return pickEnv("GEMINI_API_KEY", "GEMINI_KEY");
}

function getPrimaryModel() {
  return pickEnv("GEMINI_CART_MODEL", "GEMINI_CHAT_MODEL", "GEMINI_MODEL") || "gemini-2.5-flash";
}

function getFallbackModels() {
  return (pickEnv("GEMINI_CART_FALLBACK_MODELS", "GEMINI_CHAT_FALLBACK_MODELS", "GEMINI_FALLBACK_MODELS") || "gemini-2.5-flash-lite")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function getModels() {
  return [...new Set([getPrimaryModel(), ...getFallbackModels()])];
}

function cleanString(value, maxLength = 180) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeCartItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seenUrls = new Set();

  return items
    .map((item) => {
      const url = cleanString(item?.url, 1200);
      const title = cleanString(item?.title);
      const label = cleanString(item?.label, 80);
      const source = cleanString(item?.source, 80);
      const priceAmount = item?.price?.amount;

      if (!url || !title || !label || seenUrls.has(url)) {
        return null;
      }

      seenUrls.add(url);

      return {
        id: cleanString(item?.id, 120) || randomUUID(),
        objectId: cleanString(item?.objectId, 120),
        label,
        title,
        source: source || "Store",
        url,
        thumbnailUrl: cleanString(item?.thumbnailUrl, 1200) || null,
        provider: cleanString(item?.provider, 80),
        price: item?.price
          ? {
              amount:
                priceAmount === null || priceAmount === undefined || priceAmount === ""
                  ? null
                  : Number.isFinite(Number(priceAmount))
                    ? Number(priceAmount)
                    : null,
              currency: cleanString(item.price.currency, 20) || null,
              value: cleanString(item.price.value, 80) || null,
            }
          : null,
        addedAt: item?.addedAt ? new Date(item.addedAt).toISOString() : new Date().toISOString(),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_CART_ITEMS);
}

function normalizeSuggestions(suggestions) {
  if (!Array.isArray(suggestions)) {
    return [];
  }

  return suggestions
    .map((suggestion) => {
      const title = cleanString(suggestion?.title, 90);
      const category = cleanString(suggestion?.category, 70);
      const reason = cleanString(suggestion?.reason, 220);
      const searchQuery = cleanString(suggestion?.searchQuery, 140);

      if (!title || !category || !reason || !searchQuery) {
        return null;
      }

      return {
        id: cleanString(suggestion?.id, 120) || randomUUID(),
        title,
        category,
        reason,
        searchQuery,
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function extractJsonArray(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw createHttpError("The AI suggestion response could not be read.", 502);
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("").trim();
}

function isRetryable(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.geminiStatus === 429 ||
    error?.geminiStatus === 500 ||
    error?.geminiStatus === 502 ||
    error?.geminiStatus === 503 ||
    error?.geminiStatus === 504 ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("unavailable") ||
    message.includes("try again")
  );
}

function buildPrompt(items) {
  const cartLines = items
    .map((item, index) => {
      const price = item.price?.value ? `, price: ${item.price.value}` : "";
      return `${index + 1}. ${item.label}: ${item.title} from ${item.source}${price}`;
    })
    .join("\n");

  return [
    "The user is building an interior design shopping cart.",
    "Suggest complementary things they could buy next that work with the cart, such as seating, rug, lighting, storage, textiles, desk accessories, wall decor, or organization.",
    "Do not suggest duplicates of items already in the cart.",
    "Do not invent live prices, exact availability, or product URLs.",
    "Return only a JSON array of 3 to 5 objects.",
    "Each object must have title, category, reason, and searchQuery.",
    "Use concise, practical language.",
    "",
    "Cart:",
    cartLines,
  ].join("\n");
}

async function callGeminiSuggestions({ apiKey, model, items, signal }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are an interior design shopping assistant. You recommend complementary product categories and useful shopping search terms.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(items) }],
          },
        ],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 700,
        },
      }),
      signal,
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const error = createHttpError(payload?.error?.message || "AI suggestion request failed.", 502);
    error.geminiStatus = response.status || payload?.error?.code;
    throw error;
  }

  const text = extractGeminiText(payload);

  if (!text) {
    const error = createHttpError("AI suggestions came back empty.", 502);
    error.geminiStatus = 502;
    throw error;
  }

  return normalizeSuggestions(extractJsonArray(text));
}

async function suggestCartCompanions(items) {
  const normalizedItems = normalizeCartItems(items);

  if (normalizedItems.length === 0) {
    throw createHttpError("Add at least one shopping item before asking for companion suggestions.", 400);
  }

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw createHttpError("AI shopping suggestions are not configured yet.", 503);
  }

  const models = getModels();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  let lastError = null;

  try {
    for (let index = 0; index < models.length; index += 1) {
      try {
        return await callGeminiSuggestions({
          apiKey,
          model: models[index],
          items: normalizedItems,
          signal: controller.signal,
        });
      } catch (error) {
        lastError = error;

        if (index === models.length - 1 || !isRetryable(error)) {
          throw error;
        }
      }
    }

    throw lastError || createHttpError("AI suggestion request failed.", 502);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createHttpError("AI suggestions took too long. Try again with fewer cart items.", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  normalizeCartItems,
  normalizeSuggestions,
  suggestCartCompanions,
};
