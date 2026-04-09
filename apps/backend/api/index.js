const express = require("express");
const { v4: uuidv4 } = require("uuid");

const authRoutes         = require("../src/routes/auth.routes");
const geoRoutes          = require("../src/routes/geo.routes");
const searchRoutes       = require("../src/routes/search.routes");
const autocompleteRoutes = require("../src/routes/autocomplete.routes");
const userRoutes         = require("../src/routes/user.routes");
const adminRoutes        = require("../src/routes/admin.routes");
const billingRoutes      = require("../src/routes/billing.routes");
const usageTracker       = require("../src/middleware/usageTracker");

const app = express();

// CORS headers manually — works on all Vercel deployments
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://india-geo-saas-obt4.vercel.app/api/v1");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  res.locals.requestId = "req_" + uuidv4().replace(/-/g, "").substring(0, 12);
  res.locals.startTime = Date.now();
  next();
});

app.use(usageTracker);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth",         authRoutes);
app.use("/api/v1/admin",        adminRoutes);
app.use("/api/v1/user",         userRoutes);
app.use("/api/v1/billing",      billingRoutes);
app.use("/api/v1/geo",          geoRoutes);
app.use("/api/v1/search",       searchRoutes);
app.use("/api/v1/autocomplete", autocompleteRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found", code: "NOT_FOUND" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Server error", code: "INTERNAL_ERROR" });
});

module.exports = app;