/**
 * src/index.js
 * ─────────────
 * This is the main entry point of the backend.
 * It sets up Express, connects all routes, and starts the server.
 *
 * HOW REQUESTS FLOW:
 *   Request → CORS check → JSON parser → Request timer →
 *   Route matched → Auth middleware → Rate limiter → Handler →
 *   Usage logger → Response
 */

require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { v4: uuidv4 } = require("uuid");

// ── Route imports ──────────────────────────────────────────────────
const authRoutes   = require("./routes/auth.routes");
const geoRoutes    = require("./routes/geo.routes");
const searchRoutes = require("./routes/search.routes");
const userRoutes   = require("./routes/user.routes");
const adminRoutes  = require("./routes/admin.routes");

const prisma = require("./config/database");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ──────────────────────────────────────────────

// CORS — only allow requests from your frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-API-Secret"],
  credentials: true,
}));

// Parse incoming JSON body
app.use(express.json());

// Add request ID and timer to every request
app.use((req, res, next) => {
  res.locals.requestId = "req_" + uuidv4().replace(/-/g, "").substring(0, 12);
  res.locals.startTime = Date.now();
  next();
});

// ── Security Headers ───────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ── Routes ─────────────────────────────────────────────────────────

// Health check — no auth needed (used by Vercel, monitoring tools)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + "s",
  });
});

// Mount all routes under /api/v1/
app.use("/api/v1/auth",   authRoutes);
app.use("/api/v1/geo",    geoRoutes);
app.use("/api/v1",        searchRoutes);  // /api/v1/search and /api/v1/autocomplete
app.use("/api/v1/user",   userRoutes);
app.use("/api/v1/admin",  adminRoutes);

// Usage logger — runs AFTER route handlers, logs every request to DB
// Using setImmediate so it doesn't slow down the response
app.use(async (req, res, next) => {
  const originalSend = res.json.bind(res);
  res.json = function (body) {
    setImmediate(async () => {
      try {
        if (req.path !== "/health") { // don't log health checks
          await prisma.usageLog.create({
            data: {
              userId:        req.user?.id    || null,
              apiKeyId:      req.apiKey?.id  || null,
              endpoint:      req.path,
              method:        req.method,
              statusCode:    res.statusCode,
              responseTimeMs: Date.now() - res.locals.startTime,
              ipAddress:     req.ip || req.connection.remoteAddress || null,
            },
          });
        }
      } catch (_) {
        // Never let logging failure crash the app
      }
    });
    return originalSend(body);
  };
  next();
});

// ── 404 Handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    code: "NOT_FOUND",
  });
});

// ── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "An unexpected error occurred.",
    code: "INTERNAL_ERROR",
  });
});

// ── Start Server ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n====================================");
  console.log(`  Backend running on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  API:    http://localhost:${PORT}/api/v1/`);
  console.log("====================================\n");
});

module.exports = app;