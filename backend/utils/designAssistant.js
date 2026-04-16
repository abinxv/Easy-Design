const { listRoomCatalog, getRoomConfig } = require("../data/roomCatalog");
const { buildInspirations } = require("./inspirationBuilder");

const CHAT_STAGES = {
  chooseRoom: "choose-room",
  chooseItems: "choose-items",
  results: "results",
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "for",
  "from",
  "i",
  "im",
  "in",
  "inside",
  "into",
  "like",
  "me",
  "my",
  "need",
  "of",
  "on",
  "please",
  "room",
  "some",
  "the",
  "to",
  "want",
  "with",
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token));
}

function formatList(values) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildQuickReply(label, kind, value) {
  return {
    label,
    action: value === undefined ? { kind } : { kind, value },
  };
}

function createInitialState() {
  return {
    stage: CHAT_STAGES.chooseRoom,
    room: null,
    selectedItems: [],
  };
}

function sanitizeState(state) {
  const room = typeof state?.room === "string" && getRoomConfig(state.room) ? state.room : null;
  const roomConfig = room ? getRoomConfig(room) : null;
  const allowedItems = roomConfig?.items || [];
  const selectedItems = Array.isArray(state?.selectedItems)
    ? [...new Set(state.selectedItems.map((item) => String(item || "").trim()).filter((item) => allowedItems.includes(item)))]
    : [];

  const validStages = new Set(Object.values(CHAT_STAGES));
  const stage = validStages.has(state?.stage)
    ? state.stage
    : room
      ? CHAT_STAGES.chooseItems
      : CHAT_STAGES.chooseRoom;

  if (!room) {
    return createInitialState();
  }

  if (stage === CHAT_STAGES.chooseRoom) {
    return {
      stage: CHAT_STAGES.chooseItems,
      room,
      selectedItems,
    };
  }

  return {
    stage,
    room,
    selectedItems,
  };
}

function splitInputSegments(input) {
  return String(input || "")
    .split(/,|\/|\n|&|\band\b/gi)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function scoreCandidate(segment, candidateLabel) {
  const normalizedSegment = normalizeText(segment);
  const normalizedCandidate = normalizeText(candidateLabel);

  if (!normalizedSegment || !normalizedCandidate) {
    return 0;
  }

  if (normalizedSegment === normalizedCandidate) {
    return 200;
  }

  if (normalizedSegment.includes(normalizedCandidate)) {
    return 180 + normalizedCandidate.length;
  }

  const segmentTokens = getTokens(normalizedSegment);
  const candidateTokens = getTokens(normalizedCandidate);
  const overlap = candidateTokens.filter((token) => segmentTokens.includes(token));

  if (overlap.length === 0) {
    return 0;
  }

  let score = overlap.length * 20;

  if (overlap.length === candidateTokens.length) {
    score += 80;
  }

  if (overlap.length === segmentTokens.length) {
    score += 40;
  }

  if (segmentTokens.length === 1 && candidateTokens.includes(segmentTokens[0])) {
    score += 35;
  }

  return score;
}

function findBestMatch(input, candidates, getLabel) {
  const segments = [String(input || ""), ...splitInputSegments(input)];
  let bestCandidate = null;
  let bestScore = 0;

  candidates.forEach((candidate) => {
    const candidateLabel = getLabel(candidate);
    segments.forEach((segment) => {
      const score = scoreCandidate(segment, candidateLabel);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    });
  });

  return bestScore >= 40 ? bestCandidate : null;
}

function resolveRoom(input) {
  return findBestMatch(
    input,
    listRoomCatalog(),
    (room) => `${room.slug} ${room.label}`
  );
}

function resolveItems(roomConfig, input) {
  if (!roomConfig || !input) {
    return [];
  }

  const segments = splitInputSegments(input);
  if (segments.length === 0) {
    const directMatch = findBestMatch(input, roomConfig.items, (item) => item);
    return directMatch ? [directMatch] : [];
  }

  const matches = [];

  segments.forEach((segment) => {
    const bestItem = findBestMatch(segment, roomConfig.items, (item) => item);
    if (bestItem && !matches.includes(bestItem)) {
      matches.push(bestItem);
    }
  });

  return matches;
}

function mergeSelectedItems(existingItems, newItems) {
  return [...new Set([...existingItems, ...newItems])];
}

function isResetIntent(message, action) {
  if (action?.kind === "reset") {
    return true;
  }

  const normalized = normalizeText(message);
  return ["reset", "restart", "start over", "change room", "new room"].some((phrase) => normalized.includes(phrase));
}

function isSubmitIntent(message, action) {
  if (action?.kind === "submit") {
    return true;
  }

  const normalized = normalizeText(message);
  return [
    "done",
    "finish",
    "generate",
    "get links",
    "show links",
    "show my links",
    "show results",
    "thats all",
    "that's all",
  ].some((phrase) => normalized.includes(phrase));
}

function getRoomQuickReplies() {
  return listRoomCatalog().map((room) => buildQuickReply(room.label, "room", room.slug));
}

function getItemQuickReplies(roomConfig, selectedItems) {
  const remainingItems = roomConfig.items.filter((item) => !selectedItems.includes(item));
  const suggestionReplies = remainingItems.slice(0, 6).map((item) => buildQuickReply(item, "item", item));

  suggestionReplies.push(
    buildQuickReply(selectedItems.length > 0 ? "Show my links" : "Show room ideas", "submit"),
    buildQuickReply("Start over", "reset")
  );

  return suggestionReplies;
}

function getResultQuickReplies() {
  return [buildQuickReply("Design another room", "reset")];
}

function buildFallbackCopy({ kind, roomLabel, selectedItems, matchedItems, inspirations }) {
  switch (kind) {
    case "room-prompt":
      return "Hi, I'm your EasyDesign assistant. Which room are you working on today? You can tap one below or type it.";
    case "room-miss":
      return "I couldn't match that to one of the supported rooms yet. Try Bedroom, Kitchen, Living Room, Bathroom, or Home Office.";
    case "room-selected":
      return `Great choice. Let's design your ${roomLabel}. Tell me what you want in it, or tap a few suggestions below, then choose Show my links.`;
    case "items-added":
      return `I added ${formatList(matchedItems)} for your ${roomLabel}. Right now you have ${formatList(selectedItems)} selected. Add more items or ask me to show your links.`;
    case "items-prompt":
      return `What would you like in your ${roomLabel}? You can type a few items like ${formatList(selectedItems.slice(0, 2)) || roomLabel} or use the quick picks below.`;
    case "items-miss":
      return `I couldn't confidently match that to a ${roomLabel} item. Try one of the suggestions below or type specific items from the list.`;
    case "results":
      if (selectedItems.length > 0) {
        return `Here are your ${roomLabel} inspiration searches for ${formatList(selectedItems)}. Open any link to explore Pinterest ideas.`;
      }
      return `Here are broad ${roomLabel} inspiration searches you can explore right away.`;
    case "results-reminder":
      return `Your ${roomLabel} links are ready below. If you want a different room, tap Design another room and we can start fresh.`;
    default:
      return inspirations?.length
        ? `I found ${inspirations.length} inspiration links for you.`
        : "Let's keep designing.";
  }
}

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER || process.env.OPENROUTER_KEY || "";
}

function extractAssistantContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join(" ")
      .trim();
  }

  return "";
}

async function buildAssistantCopy(context) {
  const fallback = buildFallbackCopy(context);
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return { message: fallback, usedAiCopy: false, model: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": (process.env.CLIENT_URL || "http://localhost:8080").split(",")[0],
        "X-Title": "Easy-Design",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are a warm interior-design chatbot inside EasyDesign. Keep replies to 1-3 short sentences. Be practical, conversational, and never invent URLs because the app handles links separately.",
          },
          {
            role: "user",
            content: JSON.stringify({
              stage: context.kind,
              room: context.roomLabel || null,
              selectedItems: context.selectedItems,
              matchedItems: context.matchedItems || [],
              inspirationTitles: Array.isArray(context.inspirations)
                ? context.inspirations.map((item) => item.title)
                : [],
              desiredOutcome:
                context.kind === "results"
                  ? "Briefly introduce the inspiration links and encourage opening them."
                  : "Guide the user toward the next design choice.",
            }),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const message = extractAssistantContent(payload);

    return {
      message: message || fallback,
      usedAiCopy: Boolean(message),
      model: message ? model : null,
    };
  } catch {
    return { message: fallback, usedAiCopy: false, model: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function buildResponse({ state, kind, matchedItems = [], inspirations = [], didGenerateResults = false }) {
  const roomConfig = state.room ? getRoomConfig(state.room) : null;
  const roomLabel = roomConfig?.label || null;
  const assistantCopy = await buildAssistantCopy({
    kind,
    roomLabel,
    selectedItems: state.selectedItems,
    matchedItems,
    inspirations,
  });

  const quickReplies =
    state.stage === CHAT_STAGES.chooseRoom
      ? getRoomQuickReplies()
      : state.stage === CHAT_STAGES.chooseItems && roomConfig
        ? getItemQuickReplies(roomConfig, state.selectedItems)
        : getResultQuickReplies();

  return {
    assistantMessage: assistantCopy.message,
    state,
    room: roomConfig
      ? {
          slug: state.room,
          label: roomConfig.label,
        }
      : null,
    selectedItems: state.selectedItems,
    quickReplies,
    inspirations,
    didGenerateResults,
    meta: {
      usedAiCopy: assistantCopy.usedAiCopy,
      model: assistantCopy.model,
    },
  };
}

async function handleDesignAssistantTurn({ message, action, state }) {
  let nextState = sanitizeState(state);

  if (isResetIntent(message, action)) {
    nextState = createInitialState();
    return buildResponse({ state: nextState, kind: "room-prompt" });
  }

  if (!message && !action && nextState.stage === CHAT_STAGES.chooseRoom) {
    return buildResponse({ state: nextState, kind: "room-prompt" });
  }

  if (nextState.stage === CHAT_STAGES.results) {
    const roomMatch = resolveRoom(message);
    if (roomMatch) {
      nextState = {
        stage: CHAT_STAGES.chooseItems,
        room: roomMatch.slug,
        selectedItems: [],
      };

      return buildResponse({ state: nextState, kind: "room-selected" });
    }

    return buildResponse({ state: nextState, kind: "results-reminder", inspirations: buildInspirations(nextState.room, nextState.selectedItems) });
  }

  if (nextState.stage === CHAT_STAGES.chooseRoom) {
    const roomSlug =
      action?.kind === "room" && typeof action.value === "string"
        ? action.value
        : resolveRoom(message)?.slug;

    if (!roomSlug || !getRoomConfig(roomSlug)) {
      return buildResponse({ state: nextState, kind: "room-miss" });
    }

    nextState = {
      stage: CHAT_STAGES.chooseItems,
      room: roomSlug,
      selectedItems: [],
    };

    const roomConfig = getRoomConfig(roomSlug);
    const matchedItems = resolveItems(roomConfig, message);
    nextState.selectedItems = mergeSelectedItems(nextState.selectedItems, matchedItems);

    if (isSubmitIntent(message, action)) {
      const inspirations = buildInspirations(nextState.room, nextState.selectedItems);
      nextState.stage = CHAT_STAGES.results;
      return buildResponse({ state: nextState, kind: "results", inspirations, didGenerateResults: true });
    }

    return buildResponse({
      state: nextState,
      kind: matchedItems.length > 0 ? "items-added" : "room-selected",
      matchedItems,
    });
  }

  if (!nextState.room) {
    return buildResponse({ state: createInitialState(), kind: "room-prompt" });
  }

  const roomConfig = getRoomConfig(nextState.room);

  if (action?.kind === "room" && action.value && action.value !== nextState.room && getRoomConfig(action.value)) {
    nextState = {
      stage: CHAT_STAGES.chooseItems,
      room: action.value,
      selectedItems: [],
    };

    return buildResponse({ state: nextState, kind: "room-selected" });
  }

  let matchedItems = [];

  if (action?.kind === "item" && typeof action.value === "string" && roomConfig.items.includes(action.value)) {
    matchedItems = [action.value];
  } else {
    matchedItems = resolveItems(roomConfig, message);
  }

  if (matchedItems.length > 0) {
    nextState.selectedItems = mergeSelectedItems(nextState.selectedItems, matchedItems);
  }

  if (isSubmitIntent(message, action)) {
    const inspirations = buildInspirations(nextState.room, nextState.selectedItems);
    nextState.stage = CHAT_STAGES.results;
    return buildResponse({ state: nextState, kind: "results", inspirations, didGenerateResults: true });
  }

  if (matchedItems.length > 0) {
    return buildResponse({ state: nextState, kind: "items-added", matchedItems });
  }

  return buildResponse({
    state: nextState,
    kind: message || action ? "items-miss" : "items-prompt",
  });
}

module.exports = {
  CHAT_STAGES,
  handleDesignAssistantTurn,
};
