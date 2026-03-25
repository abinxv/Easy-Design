const { extractTokenFromHeader, verifyToken } = require("../utils/tokens");

function optionalAuth(req, _res, next) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
  } catch (error) {
    req.user = null;
  }

  next();
}

module.exports = optionalAuth;
