/**
 * analytics.service.js
 * ─────────────────────
 * Provides analytics data for the admin dashboard.
 */

const prisma = require("../config/database");

/**
 * Platform-wide overview stats
 */
async function getOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    todayRequests,
    yesterdayRequests,
    totalRequests,
    avgResponseTime,
    planBreakdown,
    topEndpoints,
    villageCount,
    districtCount,
    stateCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "CLIENT", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CLIENT", status: "PENDING" } }),

    // Today's requests
    prisma.usageLog.count({ where: { createdAt: { gte: today } } }),

    // Yesterday's requests
    prisma.usageLog.count({
      where: { createdAt: { gte: yesterday, lt: today } },
    }),

    // All time requests
    prisma.usageLog.count(),

    // Average response time (last 24h)
    prisma.usageLog.aggregate({
      _avg: { responseTimeMs: true },
      where: { createdAt: { gte: today } },
    }),

    // Users per plan
    prisma.user.groupBy({
      by: ["planType"],
      where: { role: "CLIENT" },
      _count: { planType: true },
    }),

    // Top endpoints
    prisma.usageLog.groupBy({
      by: ["endpoint"],
      _count: { endpoint: true },
      orderBy: { _count: { endpoint: "desc" } },
      take: 5,
    }),

    prisma.village.count(),
    prisma.district.count(),
    prisma.state.count(),
  ]);

  return {
    users: {
      total:   totalUsers,
      active:  activeUsers,
      pending: pendingUsers,
    },
    requests: {
      today:     todayRequests,
      yesterday: yesterdayRequests,
      total:     totalRequests,
      avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
    },
    data: {
      villages:  villageCount,
      districts: districtCount,
      states:    stateCount,
    },
    planBreakdown: planBreakdown.map((p) => ({
      plan:  p.planType,
      count: p._count.planType,
    })),
    topEndpoints: topEndpoints.map((e) => ({
      endpoint: e.endpoint,
      count:    e._count.endpoint,
    })),
  };
}

/**
 * Daily request chart data for last N days
 */
async function getDailyChart(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const data = await prisma.$queryRaw`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      AVG(response_time_ms) as avg_response_time
    FROM usage_logs
    WHERE created_at >= ${since}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  return data;
}

/**
 * Recent activity — last 10 requests
 */
async function getRecentActivity() {
  const logs = await prisma.usageLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user:   { select: { email: true, businessName: true } },
      apiKey: { select: { prefix: true, name: true } },
    },
  });

  return logs;
}

module.exports = {
  getOverview,
  getDailyChart,
  getRecentActivity,
};