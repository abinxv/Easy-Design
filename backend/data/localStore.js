const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const LOCAL_STORE_PATH = process.env.LOCAL_STORE_PATH || path.join(__dirname, "local-db.json");

function createDefaultStore() {
  return {
    users: [],
    designs: [],
    roomShopCarts: [],
    roomUploads: [],
  };
}

function normalizeStore(store) {
  return {
    users: Array.isArray(store?.users) ? store.users : [],
    designs: Array.isArray(store?.designs) ? store.designs : [],
    roomShopCarts: Array.isArray(store?.roomShopCarts) ? store.roomShopCarts : [],
    roomUploads: Array.isArray(store?.roomUploads) ? store.roomUploads : [],
  };
}

async function ensureStoreFile() {
  try {
    await fs.access(LOCAL_STORE_PATH);
  } catch {
    await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(createDefaultStore(), null, 2));
  }
}

async function readStore() {
  await ensureStoreFile();

  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, "utf8");
    return normalizeStore(JSON.parse(raw));
  } catch {
    const emptyStore = createDefaultStore();
    await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(emptyStore, null, 2));
    return emptyStore;
  }
}

async function writeStore(store) {
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2));
}

let mutationQueue = Promise.resolve();

function queueMutation(task) {
  const nextOperation = mutationQueue.then(task, task);
  mutationQueue = nextOperation.then(
    () => undefined,
    () => undefined
  );
  return nextOperation;
}

function toSafeLocalUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function findLocalUserByEmail(email) {
  const store = await readStore();
  return store.users.find((user) => user.email === email) || null;
}

async function findLocalUserById(id) {
  const store = await readStore();
  return store.users.find((user) => user.id === id) || null;
}

async function compareLocalPassword(user, candidatePassword) {
  return bcrypt.compare(candidatePassword, user.passwordHash);
}

async function createLocalUser({ name, email, password }) {
  return queueMutation(async () => {
    const store = await readStore();
    const existingUser = store.users.find((user) => user.email === email);

    if (existingUser) {
      const error = new Error("An account with this email already exists.");
      error.code = "DUPLICATE_EMAIL";
      throw error;
    }

    const timestamp = new Date().toISOString();
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash: await bcrypt.hash(password, saltRounds),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.users.push(user);
    await writeStore(store);

    return user;
  });
}

async function createLocalDesign({ userId, room, roomLabel, selectedItems, inspirations }) {
  return queueMutation(async () => {
    const store = await readStore();
    const timestamp = new Date().toISOString();
    const design = {
      id: randomUUID(),
      userId,
      room,
      roomLabel,
      selectedItems,
      inspirations,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.designs.push(design);
    await writeStore(store);

    return design;
  });
}

async function listLocalDesignsByUserId(userId) {
  const store = await readStore();

  return store.designs
    .filter((design) => design.userId === userId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function getLocalRoomShopCartByUserId(userId) {
  const store = await readStore();
  return store.roomShopCarts.find((cart) => cart.userId === userId) || null;
}

async function upsertLocalRoomShopCart({ userId, items, suggestions }) {
  return queueMutation(async () => {
    const store = await readStore();
    const timestamp = new Date().toISOString();
    const existingIndex = store.roomShopCarts.findIndex((cart) => cart.userId === userId);
    const existingCart = existingIndex >= 0 ? store.roomShopCarts[existingIndex] : null;
    const cart = {
      id: existingCart?.id || randomUUID(),
      userId,
      items,
      suggestions,
      createdAt: existingCart?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    if (existingIndex >= 0) {
      store.roomShopCarts[existingIndex] = cart;
    } else {
      store.roomShopCarts.push(cart);
    }

    await writeStore(store);
    return cart;
  });
}

async function clearLocalRoomShopCart(userId) {
  return queueMutation(async () => {
    const store = await readStore();
    store.roomShopCarts = store.roomShopCarts.filter((cart) => cart.userId !== userId);
    await writeStore(store);
  });
}

async function createLocalRoomUpload({
  userId,
  analysisId,
  fileName,
  sourceImageUrl,
  sourceImage,
  detectionProvider,
  searchProvider,
  warnings,
  detectedObjects,
}) {
  return queueMutation(async () => {
    const store = await readStore();
    const timestamp = new Date().toISOString();
    const upload = {
      id: randomUUID(),
      userId,
      analysisId,
      fileName,
      sourceImageUrl,
      sourceImage,
      detectionProvider,
      searchProvider,
      warnings,
      detectedObjects,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.roomUploads.push(upload);
    await writeStore(store);

    return upload;
  });
}

async function listLocalRoomUploadsByUserId(userId) {
  const store = await readStore();

  return store.roomUploads
    .filter((upload) => upload.userId === userId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

module.exports = {
  LOCAL_STORE_PATH,
  toSafeLocalUser,
  findLocalUserByEmail,
  findLocalUserById,
  compareLocalPassword,
  createLocalUser,
  createLocalDesign,
  listLocalDesignsByUserId,
  getLocalRoomShopCartByUserId,
  upsertLocalRoomShopCart,
  clearLocalRoomShopCart,
  createLocalRoomUpload,
  listLocalRoomUploadsByUserId,
};
