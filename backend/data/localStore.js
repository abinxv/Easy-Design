const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const LOCAL_STORE_PATH =
  process.env.LOCAL_STORE_PATH ||
  path.join(
    process.env.VERCEL ? os.tmpdir() : __dirname,
    process.env.VERCEL ? "easy-design-local-db.json" : "local-db.json"
  );

function createDefaultStore() {
  return {
    users: [],
    designs: [],
  };
}

function normalizeStore(store) {
  return {
    users: Array.isArray(store?.users) ? store.users : [],
    designs: Array.isArray(store?.designs) ? store.designs : [],
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

module.exports = {
  LOCAL_STORE_PATH,
  toSafeLocalUser,
  findLocalUserByEmail,
  findLocalUserById,
  compareLocalPassword,
  createLocalUser,
  createLocalDesign,
  listLocalDesignsByUserId,
};
