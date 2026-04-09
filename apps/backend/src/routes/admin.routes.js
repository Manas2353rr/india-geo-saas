const router = require("express").Router();
const prisma = require("../config/database");
const { authenticateJWT, requireAdmin } = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticateJWT, requireAdmin);

router.get("/users", async (req, res) => {
  try {
    const { status, plan, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { role: "CLIENT" };
    if (status) where.status = status;
    if (plan)   where.planType = plan;
    if (search) {
      where.OR = [
        { email:        { contains: search, mode: "insensitive" } },
        { businessName: { contains: search, mode: "insensitive" } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, businessName: true,
          status: true, planType: true, createdAt: true,
          _count: { select: { apiKeys: true, usageLogs: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return sendSuccess(res, users, {
      count: total,
      meta: { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    return sendError(res, "Failed to fetch users.");
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true, email: true, businessName: true, phone: true,
        gstNumber: true, status: true, planType: true, role: true, createdAt: true,
        apiKeys: { select: { id: true, name: true, prefix: true, isActive: true, createdAt: true, lastUsedAt: true } },
        _count: { select: { usageLogs: true } },
      },
    });
    if (!user) return sendError(res, "User not found.", { statusCode: 404, code: "NOT_FOUND" });
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, "Failed to fetch user.");
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE", "SUSPENDED", "PENDING"].includes(status)) {
      return sendError(res, "Status must be ACTIVE, SUSPENDED, or PENDING.", {
        statusCode: 400, code: "INVALID_STATUS",
      });
    }
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      select: { id: true, email: true, status: true },
    });
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, "Failed to update status.");
  }
});

router.patch("/users/:id/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    if (!["FREE", "PREMIUM", "PRO", "UNLIMITED"].includes(plan)) {
      return sendError(res, "Plan must be FREE, PREMIUM, PRO, or UNLIMITED.", {
        statusCode: 400, code: "INVALID_PLAN",
      });
    }
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { planType: plan },
      select: { id: true, email: true, planType: true },
    });
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, "Failed to update plan.");
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [totalUsers, activeUsers, totalRequests, todayRequests, planBreakdown, topEndpoints, villageCount] =
      await Promise.all([
        prisma.user.count({ where: { role: "CLIENT" } }),
        prisma.user.count({ where: { role: "CLIENT", status: "ACTIVE" } }),
        prisma.usageLog.count(),
        prisma.usageLog.count({ where: { createdAt: { gte: today } } }),
        prisma.user.groupBy({
          by: ["planType"], where: { role: "CLIENT" }, _count: { planType: true },
        }),
        prisma.usageLog.groupBy({
          by: ["endpoint"], _count: { endpoint: true },
          orderBy: { _count: { endpoint: "desc" } }, take: 10,
        }),
        prisma.village.count(),
      ]);
    return sendSuccess(res, {
      users: { total: totalUsers, active: activeUsers, pending: totalUsers - activeUsers },
      requests: { total: totalRequests, today: todayRequests },
      data: { villages: villageCount },
      planBreakdown: planBreakdown.map((p) => ({ plan: p.planType, count: p._count.planType })),
      topEndpoints: topEndpoints.map((e) => ({ endpoint: e.endpoint, count: e._count.endpoint })),
    });
  } catch (err) {
    return sendError(res, "Failed to fetch analytics.");
  }
});

router.get("/logs", async (req, res) => {
  try {
    const { userId, endpoint, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (userId)   where.userId = parseInt(userId);
    if (endpoint) where.endpoint = { contains: endpoint };
    const logs = await prisma.usageLog.findMany({
      where, skip, take: Math.min(200, parseInt(limit)),
      orderBy: { createdAt: "desc" },
      include: {
        user:   { select: { email: true, businessName: true } },
        apiKey: { select: { prefix: true, name: true } },
      },
    });
    return sendSuccess(res, logs);
  } catch (err) {
    return sendError(res, "Failed to fetch logs.");
  }
});

module.exports = router;