const mongoose = require("mongoose");

const dbState = {
  lastError: null,
  lastAttemptAt: null,
  persistenceMode: "local-file",
  phase: "idle",
  startupResolved: false,
  forceLocalFallback: false,
};

mongoose.connection.on("connected", () => {
  dbState.lastError = null;
  if (dbState.persistenceMode === "mongodb") {
    dbState.phase = "ready";
  }
});

mongoose.connection.on("disconnected", () => {
  if (dbState.persistenceMode === "mongodb") {
    dbState.phase = "disconnected";
  }

  if (!dbState.lastError && dbState.startupResolved) {
    dbState.lastError = "Disconnected from MongoDB.";
  }
});

mongoose.connection.on("error", (error) => {
  dbState.lastError = error.message;
  if (dbState.persistenceMode === "mongodb") {
    dbState.phase = "error";
  }
});

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

function shouldUseLocalStore() {
  maybeActivateLocalFallbackForStalledStartup();
  return dbState.persistenceMode === "local-file";
}

function getDatabaseStatus() {
  maybeActivateLocalFallbackForStalledStartup();
  const usingLocalStore = shouldUseLocalStore();

  return {
    ready: isDatabaseReady(),
    state: mongoose.connection.readyState,
    phase: dbState.phase,
    startupResolved: dbState.startupResolved,
    persistenceMode: dbState.persistenceMode,
    lastError: dbState.lastError,
    lastAttemptAt: dbState.lastAttemptAt,
    message: usingLocalStore
      ? "Running with local file storage."
      : isDatabaseReady()
        ? "Connected to MongoDB."
        : "MongoDB persistence is configured but currently unavailable.",
  };
}

function getMongoConnectTimeoutMs() {
  const timeoutMs = Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 8000);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000;
}

function activateLocalFallback(message, { log = false } = {}) {
  dbState.lastError = message;
  dbState.persistenceMode = "local-file";
  dbState.phase = "fallback";
  dbState.startupResolved = true;
  dbState.forceLocalFallback = true;

  if (log) {
    console.error("Database connection error:", message);
    console.error("Starting backend with local file storage fallback.");
  }
}

function maybeActivateLocalFallbackForStalledStartup() {
  if (dbState.forceLocalFallback || dbState.phase !== "connecting" || dbState.startupResolved) {
    return false;
  }

  const startedAt = Date.parse(dbState.lastAttemptAt || "");
  if (!Number.isFinite(startedAt)) {
    return false;
  }

  const timeoutMs = getMongoConnectTimeoutMs();
  if (Date.now() - startedAt < timeoutMs) {
    return false;
  }

  activateLocalFallback(dbState.lastError || `MongoDB connection timed out after ${timeoutMs}ms.`, {
    log: true,
  });
  void mongoose.disconnect().catch(() => undefined);
  return true;
}

function looksLikeMalformedMongoUri(uri) {
  const credentialsSection = String(uri || "").match(/^mongodb(?:\+srv)?:\/\/([^/]+)@/);
  const credentials = credentialsSection?.[1] || "";

  if (!credentials.includes(":")) {
    return false;
  }

  const password = credentials.slice(credentials.indexOf(":") + 1);
  return /[/?#[\]]/.test(password);
}

async function connectWithTimeout(uri, options) {
  const timeoutMs = getMongoConnectTimeoutMs();

  return Promise.race([
    mongoose.connect(uri, options),
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`MongoDB connection timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      if (typeof timer.unref === "function") {
        timer.unref();
      }
    }),
  ]);
}

async function connectDB() {
  dbState.lastAttemptAt = new Date().toISOString();

  if (!process.env.MONGO_URI) {
    const missingUriMessage =
      "MONGO_URI is missing. Falling back to local file storage.";
    activateLocalFallback(missingUriMessage);
    console.warn(dbState.lastError);
    return false;
  }

  dbState.persistenceMode = "mongodb";
  dbState.phase = "connecting";
  dbState.lastError = null;
  dbState.startupResolved = false;
  dbState.forceLocalFallback = false;

  try {
    if (looksLikeMalformedMongoUri(process.env.MONGO_URI)) {
      throw new Error(
        "MONGO_URI appears to contain unencoded special characters in the password. Encode characters like ?, #, /, and @ before connecting."
      );
    }

    console.log("Connecting to MongoDB...");
    const conn = await connectWithTimeout(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
      connectTimeoutMS: getMongoConnectTimeoutMs(),
    });

    if (dbState.forceLocalFallback) {
      await mongoose.disconnect().catch(() => undefined);
      console.warn("MongoDB connected after local fallback was already activated. Continuing with local file storage.");
      return false;
    }

    dbState.lastError = null;
    dbState.forceLocalFallback = false;
    dbState.phase = "ready";
    dbState.startupResolved = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    await mongoose.disconnect().catch(() => undefined);
    activateLocalFallback(error.message, { log: true });
    return false;
  }
}

module.exports = {
  connectDB,
  isDatabaseReady,
  getDatabaseStatus,
  shouldUseLocalStore,
};
