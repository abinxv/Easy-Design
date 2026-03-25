const { extractTokenFromHeader, verifyToken } = require("../utils/tokens");

function auth(req, res, next) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = auth;
