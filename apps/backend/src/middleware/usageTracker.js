/**
 * usageTracker.js
 * ───────────────
 * Saves a log of every API request to the database.
 * Runs AFTER the response is sent so it never slows down the API.
 *
 * Logs: who made the request, which endpoint, how fast, status code.
 */

const prisma = require("../config/database");

const usageTracker = (req, res, next) => {
  // Hook into the response — runs after res.json() is called
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Send response immediately first
    const result = originalJson(body);

    // Then log in background — setImmediate means "do this after current work"
    setImmediate(async () => {
      try {
        // Don't log health checks — they happen too often
        if (req.path === "/health") return;

        await prisma.usageLog.create({
          data: {
            userId:         req.user?.id   || null,
            apiKeyId:       req.apiKey?.id || null,
            endpoint:       req.path,
            method:         req.method,
            statusCode:     res.statusCode,
            responseTimeMs: Date.now() - (res.locals.startTime || Date.now()),
            ipAddress:      req.ip || null,
          },
        });
      } catch (err) {
        // Never crash the app because of a logging failure
        console.error("Usage tracker error:", err.message);
      }
    });

    return result;
  };

  next();
};

module.exports = usageTracker;