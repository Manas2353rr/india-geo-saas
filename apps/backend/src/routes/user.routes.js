const router = require("express").Router();
const prisma = require("../config/database");
const { authenticateJWT } = require("../middleware/auth");
const { generateApiKey } = require("../utils/apiKeyGen");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticateJWT);

const PLAN_LIMITS = {
  FREE: 5000, PREMIUM: 50000, PRO: 300000, UNLIMITED: 1000000,
};

router.get("/api-keys", async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, isActive: true, createdAt: true, lastUsedAt: true },
    });
    return sendSuccess(res, keys);
  } catch (err) {
    return sendError(res, "Failed to fetch API keys.");
  }
});

router.post("/api-keys", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return sendError(res, "Key name is required (min 2 chars).", {
        statusCode: 400, code: "MISSING_FIELDS",
      });
    }
    const activeCount = await prisma.apiKey.count({
      where: { userId: req.user.id, isActive: true },
    });
    if (activeCount >= 5) {
      return sendError(res, "Maximum 5 active API keys allowed.", {
        statusCode: 400, code: "KEY_LIMIT_REACHED",
      });
    }
    const { key, keyHash, prefix } = generateApiKey();
    await prisma.apiKey.create({
      data: { name: name.trim(), prefix, keyHash, userId: req.user.id },
    });
    return sendSuccess(res, {
      key,
      prefix,
      name: name.trim(),
      warning: "Save this key now. It will never be shown again.",
    }, { statusCode: 201 });
  } catch (err) {
    return sendError(res, "Failed to generate API key.");
  }
});

router.delete("/api-keys/:keyId", async (req, res) => {
  try {
    const keyId = parseInt(req.params.keyId);
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: req.user.id },
    });
    if (!key) {
      return sendError(res, "API key not found.", { statusCode: 404, code: "NOT_FOUND" });
    }
    await prisma.apiKey.update({
      where: { id: keyId }, data: { isActive: false },
    });
    return sendSuccess(res, { message: "API key revoked successfully." });
  } catch (err) {
    return sendError(res, "Failed to revoke key.");
  }
});

router.get("/usage", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalMonth, totalToday, byEndpoint] = await Promise.all([
      prisma.usageLog.count({ where: { userId: req.user.id, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.usageLog.count({ where: { userId: req.user.id, createdAt: { gte: today } } }),
      prisma.usageLog.groupBy({
        by: ["endpoint"],
        where: { userId: req.user.id, createdAt: { gte: thirtyDaysAgo } },
        _count: { endpoint: true },
        orderBy: { _count: { endpoint: "desc" } },
      }),
    ]);
    const limit = PLAN_LIMITS[req.user.planType] || PLAN_LIMITS.FREE;
    return sendSuccess(res, {
      today: { count: totalToday, limit, percentUsed: Math.round((totalToday / limit) * 100) },
      thisMonth: totalMonth,
      byEndpoint: byEndpoint.map((e) => ({ endpoint: e.endpoint, count: e._count.endpoint })),
      plan: req.user.planType,
    });
  } catch (err) {
    return sendError(res, "Failed to fetch usage stats.");
  }
});

router.get("/subscription", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { planType: true, createdAt: true },
    });
    const limits = {
      FREE:      { daily: 5000,    burst: 100,  states: 1 },
      PREMIUM:   { daily: 50000,   burst: 500,  states: 5 },
      PRO:       { daily: 300000,  burst: 2000, states: "All" },
      UNLIMITED: { daily: 1000000, burst: 5000, states: "All" },
    };
    return sendSuccess(res, {
      plan: user.planType,
      limits: limits[user.planType],
      memberSince: user.createdAt,
    });
  } catch (err) {
    return sendError(res, "Failed to fetch subscription.");
  }
});

module.exports = router;