const MAX_HISTORY_MESSAGES = 14;
const MAX_MESSAGE_CHARS = 1600;

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

function getGeminiChatModel() {
  return pickEnv("GEMINI_CHAT_MODEL", "GEMINI_MODEL") || "gemini-2.5-flash";
}

function getGeminiFallbackModels() {
  return (
    pickEnv("GEMINI_CHAT_FALLBACK_MODELS", "GEMINI_FALLBACK_MODELS") || "gemini-2.5-flash-lite"
  )
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function getGeminiChatModels() {
  return [...new Set([getGeminiChatModel(), ...getGeminiFallbackModels()])];
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => {
      const role = message?.role === "assistant" ? "assistant" : "user";
      const content = String(message?.content || "").trim().slice(0, MAX_MESSAGE_CHARS);

      return {
        role,
        content,
      };
    })
    .filter((message) => message.content);
}

function toGeminiRole(role) {
  return role === "assistant" ? "model" : "user";
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function isRetryableGeminiError(error) {
  if (!error?.geminiRetryable) {
    return false;
  }

  const message = String(error.message || "").toLowerCase();
  return (
    error.geminiStatus === 429 ||
    error.geminiStatus === 500 ||
    error.geminiStatus === 502 ||
    error.geminiStatus === 503 ||
    error.geminiStatus === 504 ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("unavailable") ||
    message.includes("try again")
  );
}

async function requestGeminiResponse({ apiKey, model, normalizedMessages, signal }) {
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
              text: [
                "You are EasyDesign AI Chatbot, a friendly interior design assistant inside an interior design app.",
                "Answer questions about layouts, furniture, color palettes, lighting, materials, decor, room shopping, and design tradeoffs.",
                "Be practical, specific, and conversational. Prefer short paragraphs and compact bullet lists when useful.",
                "Ask at most one follow-up question when a room detail is missing.",
                "If the user asks for shopping links, prices, or exact availability, suggest strong search terms and what to compare instead of inventing URLs or live prices.",
                "For structural, electrical, plumbing, fire, or major renovation advice, recommend checking with a qualified local professional.",
              ].join(" "),
            },
          ],
        },
        contents: normalizedMessages.map((message) => ({
          role: toGeminiRole(message.role),
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.72,
          maxOutputTokens: 700,
        },
      }),
      signal,
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const message = payload?.error?.message || "Gemini chatbot request failed.";
    const error = createHttpError(message, 502);
    error.geminiRetryable = true;
    error.geminiStatus = response.status || payload?.error?.code;
    throw error;
  }

  const assistantMessage = extractGeminiText(payload);

  if (!assistantMessage) {
    const error = createHttpError("Gemini did not return a chatbot response.", 502);
    error.geminiRetryable = true;
    error.geminiStatus = 502;
    throw error;
  }

  return assistantMessage;
}

async function sendGeminiChatTurn({ messages }) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw createHttpError("Gemini chatbot is not configured yet. Add GEMINI_KEY or GEMINI_API_KEY on the backend.", 503);
  }

  const normalizedMessages = normalizeMessages(messages);

  if (!normalizedMessages.some((message) => message.role === "user")) {
    throw createHttpError("Send a design question before starting the chatbot.", 400);
  }

  const models = getGeminiChatModels();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);
  let lastError = null;

  try {
    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];

      try {
        const assistantMessage = await requestGeminiResponse({
          apiKey,
          model,
          normalizedMessages,
          signal: controller.signal,
        });

        return {
          assistantMessage,
          meta: {
            model,
            provider: "gemini",
            fallbackUsed: index > 0,
          },
        };
      } catch (error) {
        lastError = error;

        if (index === models.length - 1 || !isRetryableGeminiError(error)) {
          throw error;
        }
      }
    }

    throw lastError || createHttpError("Gemini chatbot request failed.", 502);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createHttpError("Gemini took too long to respond. Try again with a shorter question.", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendGeminiChatTurn,
};
