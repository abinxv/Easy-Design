const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "easy-design-dev-secret";
}

function getUserId(user) {
  if (user?._id && typeof user._id.toString === "function") {
    return user._id.toString();
  }

  if (user?.id) {
    return String(user.id);
  }

  throw new Error("Unable to sign a token for a user without an id.");
}

function signToken(user) {
  return jwt.sign(
    {
      sub: getUserId(user),
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

function extractTokenFromHeader(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signToken,
  extractTokenFromHeader,
  verifyToken,
};
