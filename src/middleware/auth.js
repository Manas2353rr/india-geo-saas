const jwt = require("jsonwebtoken");
const prisma = require("../config/database");
const { hashApiKey } = require("../utils/apiKeyGen");
const { sendError } = require("../utils/response");

const PLAN_LIMITS = {
  FREE: 5000, PREMIUM: 50000, PRO: 300000, UNLIMITED: Infinity,
};

const authenticateApiKey = async (req, res, next) => {
  try {
    const rawKey = req.headers["x-api-key"];
    if (!rawKey) {
      return sendError(res, "API key required. Add header: X-API-Key", {
        statusCode: 401, code: "MISSING_API_KEY",
      });
    }
    const keyHash = hashApiKey(rawKey);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: { select: { id: true, email: true, planType: true, status: true, role: true } },
      },
    });
    if (!apiKey || !apiKey.isActive) {
      return sendError(res, "Invalid or revoked API key.", {
        statusCode: 401, code: "INVALID_API_KEY",
      });
    }
    if (apiKey.user.status !== "ACTIVE") {
      return sendError(res, "Account pending approval or suspended.", {
        statusCode: 403, code: "ACCOUNT_INACTIVE",
      });
    }
    req.user = apiKey.user;
    req.apiKey = apiKey;
    req.planLimit = PLAN_LIMITS[apiKey.user.planType] || PLAN_LIMITS.FREE;
    prisma.apiKey.update({
      where: { id: apiKey.id }, data: { lastUsedAt: new Date() },
    }).catch(() => {});
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return sendError(res, "Authentication failed.", { statusCode: 500 });
  }
};

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Authorization header required. Format: Bearer <token>", {
        statusCode: 401, code: "MISSING_TOKEN",
      });
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === "TokenExpiredError"
        ? "Session expired. Please log in again." : "Invalid token.";
      return sendError(res, message, { statusCode: 401, code: "INVALID_TOKEN" });
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, status: true, planType: true, businessName: true },
    });
    if (!user || user.status === "SUSPENDED") {
      return sendError(res, "Account not found or suspended.", {
        statusCode: 401, code: "ACCOUNT_INACTIVE",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return sendError(res, "Authentication failed.", { statusCode: 500 });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return sendError(res, "Admin access required.", { statusCode: 403, code: "ACCESS_DENIED" });
  }
  next();
};

module.exports = { authenticateApiKey, authenticateJWT, requireAdmin };