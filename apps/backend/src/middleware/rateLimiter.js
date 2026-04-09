/**
 * rateLimiter.js
 * ──────────────
 * Checks how many requests a user has made today.
 * If they exceeded their plan limit → block with 429 error.
 *
 * Uses Redis to count requests per API key per day.
 * Key format:  ratelimit:userId:YYYY-MM-DD
 * Expires:     automatically at midnight (86400 seconds)
 */

const redis = require("../config/redis");
const { sendError } = require("../utils/response");

// Daily limits per plan
const PLAN_LIMITS = {
  FREE:      5_000,
  PREMIUM:   50_000,
  PRO:       300_000,
  UNLIMITED: Infinity,
};

const rateLimiter = async (req, res, next) => {
  try {
    // Only rate limit if we know who the user is (API key auth sets req.user)
    if (!req.user) return next();

    const plan  = req.user.planType || "FREE";
    const limit = PLAN_LIMITS[plan];

    // Unlimited plan — skip all checks
    if (limit === Infinity) return next();

    // Build today's key — resets every day automatically
    const today = new Date().toISOString().split("T")[0]; // "2026-04-06"
    const key   = `ratelimit:${req.user.id}:${today}`;

    // Increment counter in Redis
    // INCR returns the new value after incrementing
    const current = await redis.incr(key);

    // Set expiry on first request of the day (86400 = 24 hours)
    if (current === 1) {
      await redis.expire(key, 86400);
    }

    // Add rate limit info to response headers so client can see it
    res.setHeader("X-RateLimit-Limit",     limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - current));
    res.setHeader("X-RateLimit-Reset",     today + "T23:59:59Z");

    // Block if over limit
    if (current > limit) {
      return sendError(res, `Daily limit of ${limit.toLocaleString()} requests reached. Upgrade your plan for more.`, {
        statusCode: 429,
        code: "RATE_LIMITED",
      });
    }

    next();
  } catch (err) {
    // If Redis is down, don't block the request — just log and continue
    console.error("Rate limiter error:", err.message);
    next();
  }
};

module.exports = rateLimiter;