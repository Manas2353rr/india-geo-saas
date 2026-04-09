/**
 * billing.service.js
 * ──────────────────
 * Handles everything related to plans and billing limits.
 * Used by admin routes to upgrade/downgrade users.
 */

const prisma = require("../config/database");

// Plan details — single source of truth
const PLANS = {
  FREE: {
    name:        "Free",
    dailyLimit:  5_000,
    burstLimit:  100,
    price:       0,
    stateAccess: 1,
  },
  PREMIUM: {
    name:        "Premium",
    dailyLimit:  50_000,
    burstLimit:  500,
    price:       999,
    stateAccess: 5,
  },
  PRO: {
    name:        "Pro",
    dailyLimit:  300_000,
    burstLimit:  2_000,
    price:       4_999,
    stateAccess: "ALL",
  },
  UNLIMITED: {
    name:        "Unlimited",
    dailyLimit:  1_000_000,
    burstLimit:  5_000,
    price:       null, // custom pricing
    stateAccess: "ALL",
  },
};

/**
 * Get plan details for a given plan type
 */
function getPlanDetails(planType) {
  return PLANS[planType] || PLANS.FREE;
}

/**
 * Upgrade or downgrade a user's plan
 */
async function changePlan(userId, newPlan) {
  if (!PLANS[newPlan]) {
    throw new Error(`Invalid plan: ${newPlan}`);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data:  { planType: newPlan },
    select: { id: true, email: true, planType: true, businessName: true },
  });

  return {
    user,
    plan: PLANS[newPlan],
  };
}

/**
 * Get current usage for a user today
 */
async function getTodayUsage(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.usageLog.count({
    where: {
      userId,
      createdAt: { gte: today },
    },
  });

  return count;
}

/**
 * Get full usage summary for a user
 */
async function getUsageSummary(userId, planType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [todayCount, monthCount, byEndpoint, dailyBreakdown] = await Promise.all([
    // Today's requests
    prisma.usageLog.count({
      where: { userId, createdAt: { gte: today } },
    }),

    // This month's requests
    prisma.usageLog.count({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
    }),

    // Breakdown by endpoint
    prisma.usageLog.groupBy({
      by: ["endpoint"],
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      _count: { endpoint: true },
      orderBy: { _count: { endpoint: "desc" } },
    }),

    // Daily breakdown for chart (last 7 days)
    prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM usage_logs
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  ]);

  const plan = PLANS[planType] || PLANS.FREE;

  return {
    today: {
      count:       todayCount,
      limit:       plan.dailyLimit,
      percentUsed: Math.round((todayCount / plan.dailyLimit) * 100),
      remaining:   Math.max(0, plan.dailyLimit - todayCount),
    },
    month: {
      count: monthCount,
    },
    byEndpoint: byEndpoint.map((e) => ({
      endpoint: e.endpoint,
      count:    e._count.endpoint,
    })),
    dailyBreakdown,
    plan: {
      type:       planType,
      name:       plan.name,
      dailyLimit: plan.dailyLimit,
      price:      plan.price,
    },
  };
}

/**
 * Get all plans info (for billing page)
 */
function getAllPlans() {
  return Object.entries(PLANS).map(([key, plan]) => ({
    id:          key,
    ...plan,
  }));
}

module.exports = {
  getPlanDetails,
  changePlan,
  getTodayUsage,
  getUsageSummary,
  getAllPlans,
};